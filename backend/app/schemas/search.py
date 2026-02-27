from pydantic import BaseModel
from typing import List, Optional


class SearchRequest(BaseModel):
    query: str
    filters: Optional[dict] = None


class SearchResult(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    description: Optional[str] = None
    relevancy_score: float
    source: str  # "internal" vs "external"


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int


# ---------------------------------------------------------------------------
# Hybrid vendor search (keyword + vector)
# ---------------------------------------------------------------------------


class VendorSearchResult(BaseModel):
    """A single vendor result from the smart search (internal or external)."""

    vendor_id: str
    vendor_name: str
    source: str = "internal"  # "internal" (OpenSearch) | "external" (Exa)
    description: str = ""  # snippet for external results
    location: str = ""
    products: List[str] = []
    certificates: List[str] = []
    certificate_details: List[dict] = []
    website: str = ""
    contact_email: str = ""
    mobile: str = ""
    estd: Optional[int] = None
    # Scores are normalised to [0, 1]
    final_score: float
    keyword_score: float
    vector_score: float


class VendorSmartSearchRequest(BaseModel):
    query: str


class VendorSmartSearchResponse(BaseModel):
    results: List[VendorSearchResult]
    total: int
    internal_count: int
    external_count: int
    query: str
    top_n: int


class SearchHistoryResponse(BaseModel):
    query: str
    date: str
    internal_results: List[VendorSearchResult]
    external_results: List[VendorSearchResult]
