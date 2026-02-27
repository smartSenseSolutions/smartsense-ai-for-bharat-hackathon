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


def bulk_create_vendors(db: Session, csv_bytes: bytes) -> dict:
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
                certs = _split_field(certs_raw) if certs_raw else []

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

                # Index into vector db
                index_vendor_to_opensearch(vendor)

                # Parse document_links and create VendorDocument rows
                doc_links_raw = (row.get("document_links") or "").strip()
                if doc_links_raw:
                    doc_links = _split_field(doc_links_raw)
                    for link in doc_links:
                        doc = VendorDocument(
                            id=str(uuid.uuid4()),
                            vendor_id=vendor.id,
                            document_url=link,
                            processing_status="pending",
                        )
                        db.add(doc)
                        documents_queued += 1
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


def index_vendor_to_opensearch(vendor: Vendor):
    """Generate embedding and index vendor details into OpenSearch."""
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

        body = {
            "vendor_id": vendor.id,
            "embedding": embedding,
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


def list_vendors(db: Session, skip: int = 0, limit: int = 100) -> list[Vendor]:
    return db.query(Vendor).offset(skip).limit(limit).all()


def get_vendor(db: Session, vendor_id: str) -> Vendor | None:
    return db.query(Vendor).filter(Vendor.id == vendor_id).first()
