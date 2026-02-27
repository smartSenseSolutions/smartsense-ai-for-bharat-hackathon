import boto3
import csv
import io
import uuid
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.domain import Vendor, VendorDocument
from app.services.rfp import get_bedrock_client
import json


def get_textract_client():
    return boto3.client(
        service_name="textract",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


async def verify_vendor_certification(document_bytes: bytes, cert_type: str) -> dict:
    """
    Use AWS Textract combined with Bedrock to verify if a certification is valid and unexpired.
    """
    try:
        textract = get_textract_client()
        response = textract.detect_document_text(Document={"Bytes": document_bytes})

        extracted_text = " ".join(
            [item["Text"] for item in response["Blocks"] if item["BlockType"] == "LINE"]
        )

        # Pass the extracted text to Bedrock for semantic validation
        bedrock = get_bedrock_client()
        prompt = f"""
        Analyze the following extracted text from a vendor certification document.
        Target Certification Type expected: {cert_type}

        Extracted Text:
        {extracted_text}

        Is this document a valid {cert_type} certification? Does it appear to be expired?
        Return strictly a JSON object: {{"is_valid": true/false, "expiration_date": "YYYY-MM-DD or null", "reason": "short explanation"}}
        """

        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "messages": [{"role": "user", "content": prompt}],
            }
        )

        br_response = bedrock.invoke_model(
            modelId=settings.BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        content = (
            json.loads(br_response.get("body").read())
            .get("content", [])[0]
            .get("text", "{}")
        )
        return json.loads(content)

    except Exception as e:
        print(f"Error verifying cert: {e}")
        return {
            "is_valid": False,
            "expiration_date": None,
            "reason": "Error processing document.",
        }


# ---------------------------------------------------------------------------
# CSV bulk upload helpers
# ---------------------------------------------------------------------------

CSV_HEADERS = [
    "vendor_name",
    "location",
    "estd",
    "mobile",
    "email",
    "certificates",
    "products",
    "website",
    "document_links",
]


def get_csv_template() -> str:
    """Return a CSV template string with headers and one example row."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_HEADERS)
    writer.writerow(
        [
            "Acme Supplies Pvt Ltd",
            "Mumbai, Maharashtra",
            "2005",
            "+919876543210",
            "procurement@acme.com",
            "ISO 9001;BIS;FSSAI",  # semicolon-separated
            "Steel Rods;Bolts;Nuts",  # semicolon-separated
            "https://www.acme.com",
            "https://s3.amazonaws.com/bucket/iso9001.pdf;https://s3.amazonaws.com/bucket/fssai.pdf",  # semicolon-separated S3 URLs
        ]
    )
    return output.getvalue()


def _split_field(value: str) -> list[str]:
    """Split a semicolon-separated field; strip whitespace; drop empties."""
    return [item.strip() for item in value.split(";") if item.strip()]


async def bulk_create_vendors(db: Session, csv_bytes: bytes) -> dict:
    """
    Parse CSV bytes and upsert Vendor rows (matched by vendor_name).

    CSV columns (in any order, matched by header name):
        vendor_name, location, estd, mobile, email,
        certificates, products, website, document_links

    Multi-value fields (certificates, products, document_links) use
    semicolons as separator.
    Returns a summary dict: {total, created, updated, failed, documents_queued, errors}.
    """
    text = csv_bytes.decode("utf-8-sig")  # strip BOM if present
    reader = csv.DictReader(io.StringIO(text))

    rows = list(reader)
    created = 0
    updated = 0
    failed = 0
    documents_queued = 0
    errors: list[dict] = []

    for i, row in enumerate(rows, start=1):
        try:
            with db.begin_nested():
                name = (row.get("vendor_name") or "").strip()
                if not name:
                    raise ValueError("vendor_name is required")

                estd_raw = (row.get("estd") or "").strip()
                estd = int(estd_raw) if estd_raw else None

                certs_raw = (row.get("certificates") or "").strip()
                certs_list = _split_field(certs_raw) if certs_raw else []

                certs = []
                doc_links = []

                for c in certs_list:
                    if c.startswith("http://") or c.startswith("https://"):
                        doc_links.append(c)
                    else:
                        certs.append(c)

                products_raw = (row.get("products") or "").strip()
                products = _split_field(products_raw) if products_raw else []

                fields = dict(
                    name=name,
                    location=(row.get("location") or "").strip() or None,
                    estd=estd,
                    mobile=(row.get("mobile") or "").strip() or None,
                    contact_email=(row.get("email") or "").strip() or None,
                    certificates=certs or None,
                    products=products or None,
                    website=(row.get("website") or "").strip() or None,
                )

                existing = db.query(Vendor).filter(Vendor.name == name).first()
                if existing:
                    for key, value in fields.items():
                        setattr(existing, key, value)
                    db.flush()
                    vendor = existing
                    # Remove old documents so they are replaced by the new ones below
                    db.query(VendorDocument).filter(
                        VendorDocument.vendor_id == vendor.id
                    ).delete()
                    updated += 1
                else:
                    vendor = Vendor(id=str(uuid.uuid4()), **fields)
                    db.add(vendor)
                    db.flush()
                    created += 1

                certificate_details = []

                # Process document links
                if doc_links:
                    from app.services.documents import (
                        download_document,
                        _guess_filename,
                        extract_and_summarize,
                    )

                    for link in doc_links:
                        doc = VendorDocument(
                            id=str(uuid.uuid4()),
                            vendor_id=vendor.id,
                            document_url=link,
                            processing_status="completed",
                        )
                        db.add(doc)
                        documents_queued += 1

                        try:
                            print(f"DEBUG: Processing document link: {link}")
                            doc_bytes = await download_document(link)
                            print(
                                f"DEBUG: Downloaded {len(doc_bytes)} bytes from {link}"
                            )

                            filename = _guess_filename(link)
                            print(f"DEBUG: Guessed filename: {filename}")

                            summary = await extract_and_summarize(doc_bytes, filename)
                            print(
                                f"DEBUG: Extracted summary: {json.dumps(summary, indent=2)}"
                            )

                            summary["document_url"] = link
                            certificate_details.append(summary)

                            doc.document_name = summary.get("document_name")
                            doc.issued_to = summary.get("issued_to")
                            doc.issuing_authority = summary.get("issuing_authority")
                            doc.issue_date = summary.get("issue_date")
                            doc.expiry_date = summary.get("expiry_date")
                            doc.document_summary = summary.get("document_summary")
                            doc.document_type = summary.get("document_type", "Others")
                        except Exception as e:
                            import traceback

                            print(f"Failed to process {link}: {e}")
                            traceback.print_exc()
                            doc.processing_status = "failed"
                            doc.error_message = str(e)

                print(
                    f"DEBUG: Appended {len(certificate_details)} certificates to details for vendor '{vendor.name}'."
                )
                # Index into vector db
                index_vendor_to_opensearch(vendor, certificate_details)
        except Exception as exc:
            failed += 1
            errors.append({"row": i, "error": str(exc)})

    db.commit()
    return {
        "total": len(rows),
        "created": created,
        "updated": updated,
        "failed": failed,
        "documents_queued": documents_queued,
        "errors": errors,
    }


def index_vendor_to_opensearch(vendor: Vendor, certificate_details: list[dict] = None):
    """Generate embedding and index vendor details into OpenSearch."""
    if certificate_details is None:
        certificate_details = []
    try:
        from app.services.documents import (
            generate_embedding,
            _get_opensearch_client,
            VENDOR_INDEX_NAME,
        )

        client = _get_opensearch_client()

        products_str = ", ".join(vendor.products) if vendor.products else ""
        certs_str = ", ".join(vendor.certificates) if vendor.certificates else ""

        embed_text = (
            f"Vendor: {vendor.name}\n"
            f"Location: {vendor.location or ''}\n"
            f"Established: {vendor.estd or ''}\n"
            f"Products: {products_str}\n"
            f"Certificates: {certs_str}\n"
            f"Website: {vendor.website or ''}\n"
        )

        if certificate_details:
            embed_text += "Certificate Details:\n"
            for cert in certificate_details:
                embed_text += f"- {cert.get('document_type', 'Document')}: {cert.get('document_summary', '')}\n"

        embedding = generate_embedding(embed_text)

        metadata = {
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "location": vendor.location or "",
            "estd": vendor.estd,
            "mobile": vendor.mobile or "",
            "contact_email": vendor.contact_email or "",
            "website": vendor.website or "",
            "products": vendor.products or [],
            "certificates": vendor.certificates or [],
        }

        # Sanitize date fields in certificate_details: empty strings must
        # be null so OpenSearch doesn't try to parse them as dates.
        sanitized_certs = []
        for cert in certificate_details:
            c = dict(cert)
            for date_field in ("issue_date", "expiry_date"):
                if c.get(date_field) == "":
                    c[date_field] = None
            sanitized_certs.append(c)

        body = {
            "vendor_id": vendor.id,
            "embedding": embedding,
            "certificate_details": sanitized_certs,
            **metadata,
        }

        client.index(index=VENDOR_INDEX_NAME, id=vendor.id, body=body)
        print(f"✓ Indexed vendor {vendor.name} to OpenSearch")
    except Exception as e:
        print(f"⚠ Could not index vendor {vendor.name} to OpenSearch: {e}")


def create_vendor(db: Session, data: dict) -> Vendor:
    name = data.get("name", "")
    existing = db.query(Vendor).filter(Vendor.name == name).first()
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        index_vendor_to_opensearch(existing)
        return existing

    vendor = Vendor(id=str(uuid.uuid4()), **data)
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    index_vendor_to_opensearch(vendor)
    return vendor


def reindex_all_vendors(db: Session) -> dict:
    """
    Rebuild the vendors OpenSearch index from scratch and re-index every
    vendor currently stored in the database.

    Steps:
    1. Drop + recreate the index with correct knn_vector mapping.
    2. For each vendor, rebuild the embed text (including certificate details
       from their associated VendorDocument rows) and push to OpenSearch.

    Returns a summary dict: {index_rebuilt, total, succeeded, failed}.
    """
    from app.services.documents import rebuild_vendor_index

    # Step 1: rebuild index
    rebuild_vendor_index()

    # Step 2: re-index vendors
    vendors = db.query(Vendor).all()
    succeeded = 0
    failed = 0

    for vendor in vendors:
        try:
            # Gather certificate details from processed documents
            docs = (
                db.query(VendorDocument)
                .filter(
                    VendorDocument.vendor_id == vendor.id,
                    VendorDocument.processing_status == "completed",
                )
                .all()
            )
            certificate_details = [
                {
                    "document_type": d.document_type or "",
                    "document_summary": d.document_summary or "",
                    "issuing_authority": d.issuing_authority or "",
                    "issued_to": d.issued_to or "",
                    # Use None (→ null) for dates so empty strings don't
                    # trigger OpenSearch date-parsing errors.
                    "issue_date": d.issue_date or None,
                    "expiry_date": d.expiry_date or None,
                    "document_url": d.document_url or "",
                }
                for d in docs
            ]
            index_vendor_to_opensearch(vendor, certificate_details)
            succeeded += 1
        except Exception as e:
            print(f"⚠ Failed to re-index vendor {vendor.name}: {e}")
            failed += 1

    return {
        "index_rebuilt": True,
        "total": len(vendors),
        "succeeded": succeeded,
        "failed": failed,
    }


def list_vendors(db: Session, skip: int = 0, limit: int = 100) -> list[Vendor]:
    return db.query(Vendor).offset(skip).limit(limit).all()


def get_vendor(db: Session, vendor_id: str) -> Vendor | None:
    return db.query(Vendor).filter(Vendor.id == vendor_id).first()
