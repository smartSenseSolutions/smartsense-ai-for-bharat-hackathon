"""
Document processing service.

Handles downloading vendor documents from S3 URLs, extracting text and
generating structured summaries via Amazon Nova Lite (Bedrock Converse API),
generating embeddings via Amazon Titan Embeddings v2, and indexing into
OpenSearch for vector search.
"""

import json
import re
import traceback

import boto3
import httpx
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.domain import Vendor, VendorDocument

# ---------------------------------------------------------------------------
# AWS clients
# ---------------------------------------------------------------------------


def _get_bedrock_client():
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _get_opensearch_client() -> OpenSearch:
    """Return an OpenSearch client authenticated via AWS SigV4."""
    if not settings.OPENSEARCH_URL:
        raise ValueError("OPENSEARCH_URL is not configured")

    credentials = boto3.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    ).get_credentials()

    awsauth = AWS4Auth(
        settings.AWS_ACCESS_KEY_ID,
        settings.AWS_SECRET_ACCESS_KEY,
        settings.AWS_REGION,
        "aoss",  # OpenSearch Serverless service name
        session_token=credentials.token if credentials.token else None,
    )

    # Strip protocol for the host parameter
    host = (
        settings.OPENSEARCH_URL.replace("https://", "")
        .replace("http://", "")
        .rstrip("/")
    )

    return OpenSearch(
        hosts=[{"host": host, "port": 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=30,
    )


# ---------------------------------------------------------------------------
# OpenSearch index management
# ---------------------------------------------------------------------------

INDEX_NAME = settings.OPENSEARCH_INDEX


def ensure_opensearch_index():
    """Create the vendor-documents index with kNN mapping if it doesn't exist."""
    try:
        client = _get_opensearch_client()

        # For OpenSearch Serverless, index creation works differently
        # Check if index exists first
        if not client.indices.exists(index=INDEX_NAME):
            mapping = {
                "settings": {
                    "index": {
                        "knn": True,
                    }
                },
                "mappings": {
                    "properties": {
                        "vendor_id": {"type": "keyword"},
                        "vendor_name": {"type": "text"},
                        "document_id": {"type": "keyword"},
                        "document_name": {"type": "text"},
                        "document_type": {"type": "keyword"},
                        "document_summary": {"type": "text"},
                        "issued_to": {"type": "text"},
                        "issuing_authority": {"type": "text"},
                        "issue_date": {"type": "keyword"},
                        "expiry_date": {"type": "keyword"},
                        "document_url": {"type": "keyword"},
                        "embedding": {
                            "type": "knn_vector",
                            "dimension": 1024,
                            "method": {
                                "name": "hnsw",
                                "space_type": "cosinesimil",
                                "engine": "nmslib",
                            },
                        },
                    }
                },
            }
            client.indices.create(index=INDEX_NAME, body=mapping)
            print(f"✓ Created OpenSearch index: {INDEX_NAME}")
        else:
            print(f"✓ OpenSearch index already exists: {INDEX_NAME}")
    except Exception as e:
        print(f"⚠ Could not ensure OpenSearch index: {e}")


# ---------------------------------------------------------------------------
# Document download
# ---------------------------------------------------------------------------


async def download_document(url: str) -> bytes:
    """Download document bytes from an S3/HTTP URL."""
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def _guess_media_type(url: str) -> str:
    """Guess MIME type from URL extension."""
    url_lower = url.lower().split("?")[0]  # strip query params
    if url_lower.endswith(".pdf"):
        return "application/pdf"
    elif url_lower.endswith(".png"):
        return "image/png"
    elif url_lower.endswith(".jpg") or url_lower.endswith(".jpeg"):
        return "image/jpeg"
    elif url_lower.endswith(".webp"):
        return "image/webp"
    elif url_lower.endswith(".gif"):
        return "image/gif"
    # Default to PDF for S3 documents
    return "application/pdf"


def _guess_filename(url: str) -> str:
    """Extract a filename from URL."""
    path = url.split("?")[0].split("/")[-1]
    return path if path else "document"


# ---------------------------------------------------------------------------
# Nova Lite — extract & summarize in one pass
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = """You are an AI document analyst specializing in vendor compliance and certification documents.

Analyze the attached document and extract the following information. Return ONLY a valid JSON object with these fields:

{
  "document_name": "The official name/title of the document",
  "issued_to": "The entity/person/company the document is issued to",
  "issuing_authority": "The organization/body that issued the document",
  "issue_date": "The date of issue in YYYY-MM-DD format, or null if not found",
  "expiry_date": "The expiry/validity date in YYYY-MM-DD format, or null if not applicable or not found",
  "document_summary": "A concise 2-3 sentence summary of what this document certifies or authorizes",
  "document_type": "<one of the allowed types>"
}

The document_type MUST be exactly one of:
- Business Registration Certificate
- Trade License
- VAT / GST Certificate
- ISO Certificates
- Industry Licenses
- CE / FDA Approvals
- SOC 2
- PCI DSS
- GDPR Compliance Declaration
- Others

If you cannot determine a field, set it to null. Do NOT output anything outside the JSON object."""


async def extract_and_summarize(doc_bytes: bytes, filename: str) -> dict:
    """
    Use Amazon Nova Lite via Bedrock Converse API to extract text and
    generate a structured summary from a document/image in one pass.
    """
    bedrock = _get_bedrock_client()
    media_type = _guess_media_type(filename)

    # Build the content block with the document
    if media_type == "application/pdf":
        content_block = {
            "document": {
                "format": "pdf",
                "name": filename.replace(".", "_"),
                "source": {"bytes": doc_bytes},
            }
        }
    else:
        # Image types
        fmt = media_type.split("/")[-1]
        content_block = {
            "image": {
                "format": fmt,
                "source": {"bytes": doc_bytes},
            }
        }

    messages = [
        {
            "role": "user",
            "content": [
                content_block,
                {"text": _EXTRACTION_PROMPT},
            ],
        }
    ]

    response = bedrock.converse(
        modelId=settings.BEDROCK_NOVA_MODEL_ID,
        messages=messages,
        inferenceConfig={"maxTokens": 1024, "temperature": 0.1},
    )

    raw_text = response["output"]["message"]["content"][0]["text"].strip()

    # Strip markdown fences if present
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    return json.loads(raw_text)


# ---------------------------------------------------------------------------
# Titan Embeddings v2
# ---------------------------------------------------------------------------


def generate_embedding(text: str) -> list[float]:
    """Generate a 1024-dim embedding vector using Amazon Titan Embeddings v2."""
    bedrock = _get_bedrock_client()

    body = json.dumps(
        {
            "inputText": text[:8000],  # Titan v2 max input
            "dimensions": 1024,
        }
    )

    response = bedrock.invoke_model(
        modelId=settings.BEDROCK_EMBEDDING_MODEL_ID,
        body=body,
        contentType="application/json",
        accept="application/json",
    )

    result = json.loads(response["body"].read())
    return result["embedding"]


# ---------------------------------------------------------------------------
# OpenSearch indexing
# ---------------------------------------------------------------------------


def index_to_opensearch(doc_id: str, embedding: list[float], metadata: dict):
    """Index a document summary + vector into OpenSearch."""
    client = _get_opensearch_client()

    body = {
        "document_id": doc_id,
        "embedding": embedding,
        **metadata,
    }

    client.index(index=INDEX_NAME, id=doc_id, body=body)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


async def process_vendor_document(doc_id: str, db: Session) -> bool:
    """
    Full pipeline for a single document:
    download → extract+summarize (Nova) → embed (Titan) → save to DB → index to OpenSearch.
    Returns True on success.
    """
    doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
    if not doc:
        return False

    try:
        # 1. Download the document
        doc_bytes = await download_document(doc.document_url)
        filename = _guess_filename(doc.document_url)

        # 2. Extract + summarize via Nova Lite
        summary = await extract_and_summarize(doc_bytes, filename)

        # 3. Update DB record
        doc.document_name = summary.get("document_name")
        doc.issued_to = summary.get("issued_to")
        doc.issuing_authority = summary.get("issuing_authority")
        doc.issue_date = summary.get("issue_date")
        doc.expiry_date = summary.get("expiry_date")
        doc.document_summary = summary.get("document_summary")
        doc.document_type = summary.get("document_type", "Others")
        doc.processing_status = "completed"
        doc.error_message = None
        db.flush()

        # 4. Generate embedding from the summary text
        embed_text = (
            f"Document: {doc.document_name or ''}\n"
            f"Type: {doc.document_type or ''}\n"
            f"Issued to: {doc.issued_to or ''}\n"
            f"Authority: {doc.issuing_authority or ''}\n"
            f"Summary: {doc.document_summary or ''}"
        )
        embedding = generate_embedding(embed_text)

        # 5. Index to OpenSearch
        vendor = db.query(Vendor).filter(Vendor.id == doc.vendor_id).first()
        metadata = {
            "vendor_id": doc.vendor_id,
            "vendor_name": vendor.name if vendor else "",
            "document_name": doc.document_name or "",
            "document_type": doc.document_type or "",
            "document_summary": doc.document_summary or "",
            "issued_to": doc.issued_to or "",
            "issuing_authority": doc.issuing_authority or "",
            "issue_date": doc.issue_date or "",
            "expiry_date": doc.expiry_date or "",
            "document_url": doc.document_url,
        }
        index_to_opensearch(doc.id, embedding, metadata)

        db.commit()
        print(f"  ✓ Processed document {doc_id}: {doc.document_name}")
        return True

    except Exception as e:
        doc.processing_status = "failed"
        doc.error_message = f"{type(e).__name__}: {str(e)}"
        db.commit()
        print(f"  ✗ Failed to process document {doc_id}: {e}")
        traceback.print_exc()
        return False


async def process_pending_documents(db: Session) -> dict:
    """Process all documents in 'pending' status."""
    pending = (
        db.query(VendorDocument)
        .filter(VendorDocument.processing_status == "pending")
        .all()
    )

    total = len(pending)
    succeeded = 0
    failed = 0

    print(f"Processing {total} pending document(s)...")

    for doc in pending:
        ok = await process_vendor_document(doc.id, db)
        if ok:
            succeeded += 1
        else:
            failed += 1

    return {"total": total, "succeeded": succeeded, "failed": failed}


# ---------------------------------------------------------------------------
# Vector search
# ---------------------------------------------------------------------------


async def search_documents(query: str, db: Session, limit: int = 10) -> list[dict]:
    """Embed the query and perform kNN search on OpenSearch."""
    # Generate query embedding
    query_embedding = generate_embedding(query)

    client = _get_opensearch_client()

    search_body = {
        "size": limit,
        "query": {
            "knn": {
                "embedding": {
                    "vector": query_embedding,
                    "k": limit,
                }
            }
        },
        "_source": {"excludes": ["embedding"]},
    }

    response = client.search(index=INDEX_NAME, body=search_body)

    results = []
    for hit in response["hits"]["hits"]:
        source = hit["_source"]
        doc_id = source.get("document_id", hit["_id"])

        # Fetch full document from DB
        doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
        if doc:
            results.append(
                {
                    "document": doc,
                    "score": hit["_score"],
                    "vendor_name": source.get("vendor_name", ""),
                }
            )

    return results
