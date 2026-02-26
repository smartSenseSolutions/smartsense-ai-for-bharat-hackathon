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
