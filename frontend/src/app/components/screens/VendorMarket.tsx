import { useState, useEffect } from 'react';
import { Search, Shield, MapPin, Award, Star, X, ExternalLink, TrendingUp, Tag, Clock, Sparkles, Mail, Phone, CalendarDays, Globe } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { Screen } from '@/app/App';

interface CertificateDetail {
  document_type: string;
  document_name: string;
  document_summary: string;
  issuing_authority: string;
  issued_to: string;
  issue_date: string | null;
  expiry_date: string | null;
  document_url: string;
}

interface AIVendorResult {
  vendor_id: string;
  vendor_name: string;
  source: string;        // "internal" | "external"
  description: string;   // snippet for external results
  location: string;
  products: string[];
  certificates: string[];
  certificate_details: CertificateDetail[];
  website: string;
  contact_email: string;
  mobile: string;
  estd: number | null;
  final_score: number;
  keyword_score: number;
  vector_score: number;
}

interface VendorMarketProps {
  onNavigate: (screen: Screen) => void;
  onVendorSelect: (vendor: any) => void;
  onCreateRFP: (vendor: any) => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

export function VendorMarket({ onNavigate, onVendorSelect, onCreateRFP }: VendorMarketProps) {
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  interface SearchHistoryItem {
    query: string;
    date: string;
    internal_results: AIVendorResult[];
    external_results: AIVendorResult[];
  }

  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [internalResults, setInternalResults] = useState<AIVendorResult[]>([]);
  const [externalResults, setExternalResults] = useState<AIVendorResult[]>([]);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedVendor(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Fetch history on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/search/history`)
      .then(res => res.json())
      .then(data => setSearchHistory(data))
      .catch(err => console.error('[VendorMarket] Failed to load history:', err));
  }, []);

  const hasSearched = submittedQuery.length > 0;

  const fireSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSubmittedQuery(trimmed);
    setInternalResults([]);
    setExternalResults([]);
    setIsInternalLoading(true);
    setIsExternalLoading(true);

    // Check if we already have this exact query in DB history
    const cachedItem = searchHistory.find(item => item.query.toLowerCase() === trimmed.toLowerCase());

    if (cachedItem) {
      setInternalResults(cachedItem.internal_results || []);
      setExternalResults(cachedItem.external_results || []);
      setIsInternalLoading(false);
      setIsExternalLoading(false);
      return;
    }

    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // 1. Fetch fast internal results
    const internalReq = fetch(`${API_BASE}/api/search/vendors/smart/internal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: trimmed }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const results = data.results ?? [];
        setInternalResults(results);
        setIsInternalLoading(false);
        return results;
      })
      .catch(err => {
        console.error('[VendorMarket] Internal search failed:', err);
        setIsInternalLoading(false);
        return [];
      });

    // 2. Fetch slower external Gemini results
    const externalReq = fetch(`${API_BASE}/api/search/vendors/smart/external`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: trimmed }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const results = data.results ?? [];
        setExternalResults(results);
        setIsExternalLoading(false);
        return results;
      })
      .catch(err => {
        console.error('[VendorMarket] External search failed:', err);
        setIsExternalLoading(false);
        return [];
      });

    // 3. When both finish, save to DB
    Promise.all([internalReq, externalReq]).then(([internalData, externalData]) => {
      const payload = {
        query: trimmed,
        date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        internal_results: internalData,
        external_results: externalData
      };

      fetch(`${API_BASE}/api/search/history`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).catch(err => console.error('[VendorMarket] Failed to save search history:', err));

      // Update local UI history block instantly
      setSearchHistory(prev => [payload, ...prev]);
    });
  };

  const handleSearch = () => fireSearch(searchQuery);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Map an AIVendorResult to the shape expected by the detail panel
  const toDetailVendor = (r: AIVendorResult) => ({
    id: r.vendor_id,
    name: r.vendor_name,
    country: r.location,
    products: r.products.join(', '),
    trustScore: Math.round(r.final_score * 100),
    certifications: r.certificates,
    certificate_details: r.certificate_details,
    website: r.website,
    contact_email: r.contact_email,
    mobile: r.mobile,
    estd: r.estd,
  });

  return (
    <div className="min-h-screen">
      {/* ── Landing search ─────────────────────────────────────────────── */}
      {!hasSearched && (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="w-full max-w-6xl px-8">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4 text-center">Global Vendor Marketplace</h1>
            <p className="text-base text-gray-600 mb-10 text-center">Discover and connect with verified vendors worldwide</p>

            <div className="relative mb-6">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by vendor name, product category, or certification..."
                className="w-full pl-14 pr-6 h-20 text-base bg-white rounded-2xl border-2 border-[#eeeff1] transition-all outline-none placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            {/* Popular categories */}
            <div className="mt-6">
              <div className="flex flex-wrap justify-center gap-2.5">
                {['Surgical Equipment', 'Laboratory Supplies', 'Medical Devices', 'Pharmaceutical Equipment', 'Diagnostic Tools'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSearchQuery(cat);
                      fireSearch(cat);
                    }}
                    className="px-5 py-2.5 text-sm font-medium bg-white border border-[#eeeff1] rounded-full hover:border-[#3B82F6] hover:bg-blue-50 hover:text-[#3B82F6] transition-all"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8">
              <div className="text-center py-6 px-4 rounded-xl border border-[#eeeff1] bg-white">
                <p className="text-3xl font-bold text-gray-900 mb-2">15K+</p>
                <p className="text-sm text-gray-600 font-medium">Verified Vendors</p>
              </div>
              <div className="text-center py-6 px-4 rounded-xl border border-[#eeeff1] bg-white">
                <p className="text-3xl font-bold text-gray-900 mb-2">50L+</p>
                <p className="text-sm text-gray-600 font-medium">Product Categories</p>
              </div>
              <div className="text-center py-6 px-4 rounded-xl border border-[#eeeff1] bg-white">
                <p className="text-3xl font-bold text-gray-900 mb-2">98%</p>
                <p className="text-sm text-gray-600 font-medium">Avg Trust Score</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results view ───────────────────────────────────────────────── */}
      {hasSearched && (
        <div className="px-8 py-6 relative">
          {/* History button */}
          <div className="absolute top-6 right-8 z-40">
            <Button
              variant="outline"
              className="h-11 px-4 rounded-full hover:bg-gray-100 flex items-center gap-2 border-[#eeeff1]"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">History</span>
            </Button>
          </div>

          {/* Compact search bar */}
          <div className={`transition-all duration-300 ${isSearchFocused ? 'flex-1 max-w-3xl' : 'max-w-xl'}`}>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all ${isSearchFocused ? 'w-5 h-5' : 'w-4 h-4 left-3'}`} />
              <input
                type="text"
                placeholder="Search for vendors or products"
                className={`w-full pr-4 bg-white rounded-3xl border border-[#eeeff1] transition-all outline-none ${isSearchFocused ? 'pl-12 h-14 text-base' : 'pl-10 h-11 text-sm'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          {/* Title + count */}
          <div className="max-w-[1400px] mx-auto mt-8 mb-1">
            <h2 className="text-xl font-semibold text-gray-900">{submittedQuery}</h2>
          </div>
          <div className="max-w-[1400px] mx-auto mb-6">
            {isInternalLoading && isExternalLoading ? (
              <p className="text-sm text-gray-400">Searching…</p>
            ) : (
              <p className="text-sm text-gray-600">
                {internalResults.length + externalResults.length} vendor{internalResults.length + externalResults.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Results grid */}
          <div className="max-w-[1400px] mx-auto max-h-[calc(100vh-300px)] overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Loading skeletons */}
            {isInternalLoading && (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white border border-[#eeeff1] rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!isInternalLoading && (internalResults.length > 0 || externalResults.length > 0 || isExternalLoading) && (() => {
              const internal = internalResults;
              const external = externalResults;
              return (
                <div className="space-y-8">
                  {/* ── Internal (verified) results ── */}
                  {internal.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Verified Vendors</h3>
                        <span className="text-xs text-gray-400">({internal.length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {internal.map((result) => {
                          const trustScore = Math.round(result.final_score * 100);
                          const productsStr = result.products.join(', ');
                          const detail = toDetailVendor(result);
                          return (
                            <Card
                              key={result.vendor_id}
                              className="bg-white hover:bg-gray-50 transition-all cursor-pointer group border border-[#eeeff1]"
                              onClick={() => {
                                setSelectedVendor(detail);
                                onVendorSelect(detail);
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                      {result.vendor_name}
                                    </h3>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                      <span className="text-sm font-bold text-green-600">{trustScore}%</span>
                                    </div>
                                    <Badge className="text-[10px] px-1.5 py-0.5 border-0 leading-none bg-green-100 text-green-700">
                                      <Shield className="w-2.5 h-2.5 mr-0.5 inline" />
                                      Verified
                                    </Badge>
                                  </div>
                                </div>

                                <p className="text-xs text-gray-600 mb-2 line-clamp-1">{productsStr}</p>

                                {result.certificates.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {result.certificates.map((cert, idx) => (
                                      <Badge key={idx} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-0 leading-none font-medium">
                                        {cert}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {result.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-600">{result.location}</span>
                                    </div>
                                  )}
                                  {result.certificates.length > 0 && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <div className="flex items-center gap-1">
                                        <Award className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-600">{result.certificates.length} certs</span>
                                      </div>
                                    </>
                                  )}
                                  {result.estd && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="text-xs text-gray-600">
                                        {new Date().getFullYear() - result.estd}y
                                      </span>
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── External (Exa) results ── */}
                  {(external.length > 0 || isExternalLoading) && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <h3 className="text-sm font-semibold text-gray-700">External Sources</h3>
                          <span className="text-xs text-gray-400">({isExternalLoading ? 'AI searching...' : external.length})</span>
                        </div>
                        {isExternalLoading && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 text-blue-600 rounded-full text-xs font-medium border border-blue-100 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5" />
                            Gemini is researching the web...
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {isExternalLoading ? (
                          [1, 2].map(i => (
                            <div key={`ext-loading-${i}`} className="bg-white border border-[#eeeff1] rounded-xl p-4 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                              <div className="flex items-start justify-between mb-3">
                                <div className="h-5 bg-gray-100 rounded-md w-1/2 animate-pulse" />
                                <div className="h-4 bg-gray-50 rounded-full w-14 animate-pulse" />
                              </div>
                              <div className="space-y-2 mb-4">
                                <div className="h-3 bg-gray-100 rounded w-full animate-pulse" />
                                <div className="h-3 bg-gray-100 rounded w-[85%] animate-pulse" />
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
                                <div className="h-3 bg-blue-50/50 rounded w-20 animate-pulse" />
                              </div>
                            </div>
                          ))
                        ) : external.map((result) => {
                          const productsStr = result.products.join(', ');
                          const detail = toDetailVendor(result);
                          return (
                            <Card
                              key={result.vendor_id}
                              className="bg-white hover:bg-gray-50 transition-all cursor-pointer group border border-[#eeeff1]"
                              onClick={() => {
                                setSelectedVendor(detail);
                                onVendorSelect(detail);
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                      {result.vendor_name}
                                    </h3>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                                    <Badge className="text-[10px] px-1.5 py-0.5 border-0 leading-none bg-blue-50 text-blue-600">
                                      <Globe className="w-2.5 h-2.5 mr-0.5 inline" />
                                      External
                                    </Badge>
                                  </div>
                                </div>

                                {productsStr && (
                                  <p className="text-xs text-gray-600 mb-2 line-clamp-1">{productsStr}</p>
                                )}

                                {result.description && (
                                  <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                                    {result.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {result.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{result.location}</span>
                                      </div>
                                    )}
                                    {result.estd && (
                                      <>
                                        {result.location && <span className="text-gray-300">•</span>}
                                        <span className="text-xs text-gray-600">
                                          {new Date().getFullYear() - result.estd}y
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {result.website && (
                                    <a
                                      href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Visit site
                                    </a>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Empty state */}
            {!isInternalLoading && !isExternalLoading && internalResults.length === 0 && externalResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="w-10 h-10 text-gray-300 mb-4" />
                <p className="text-base font-medium text-gray-500">No vendors found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term or category</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vendor detail panel ────────────────────────────────────────── */}
      {selectedVendor && (
        <div
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-end"
          onClick={() => setSelectedVendor(null)}
        >
          <div
            className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#eeeff1] p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900">Vendor Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-5">

              {/* ── Name + verified badge ── */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedVendor.name}</h3>
                    <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border-0 flex-shrink-0">
                      <Shield className="w-3 h-3 mr-1 inline" />
                      Verified
                    </Badge>
                  </div>
                  {selectedVendor.country && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm">{selectedVendor.country}</span>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-green-600">{selectedVendor.trustScore}%</p>
                  <p className="text-xs text-gray-400">AI Match Score</p>
                </div>
              </div>

              {/* ── Key info grid ── */}
              <div className="grid grid-cols-2 gap-3">
                {selectedVendor.estd && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Established</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVendor.estd}</p>
                    <p className="text-xs text-gray-400">{new Date().getFullYear() - selectedVendor.estd} years in business</p>
                  </div>
                )}
                {selectedVendor.certifications?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Certifications</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVendor.certifications.length}</p>
                    <p className="text-xs text-gray-400">verified certificates</p>
                  </div>
                )}
                {selectedVendor.contact_email && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{selectedVendor.contact_email}</p>
                  </div>
                )}
                {selectedVendor.mobile && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVendor.mobile}</p>
                  </div>
                )}
                {selectedVendor.website && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Website</p>
                    <a
                      href={selectedVendor.website.startsWith('http') ? selectedVendor.website : `https://${selectedVendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {selectedVendor.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* ── Products ── */}
              {selectedVendor.products && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Products &amp; Services</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedVendor.products}</p>
                </div>
              )}

              {/* ── Certificate name tags ── */}
              {selectedVendor.certifications?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.certifications.map((cert: string, i: number) => (
                      <Badge key={i} className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200">
                        <Award className="w-3 h-3 mr-1 inline" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Certificate documents (AI-extracted details) ── */}
              {selectedVendor.certificate_details?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Certificate Documents</p>
                  <div className="space-y-3">
                    {selectedVendor.certificate_details.map((doc: CertificateDetail, i: number) => (
                      <div key={i} className="border border-[#eeeff1] rounded-xl p-4 space-y-2">
                        {/* Doc name + type badge */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {doc.document_name || doc.document_type || 'Certificate'}
                          </p>
                          {doc.document_type && (
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border-0 flex-shrink-0">
                              {doc.document_type}
                            </Badge>
                          )}
                        </div>

                        {/* Meta grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                          {doc.issuing_authority && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Issued by</p>
                              <p className="text-xs font-medium text-gray-700">{doc.issuing_authority}</p>
                            </div>
                          )}
                          {doc.issued_to && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Issued to</p>
                              <p className="text-xs font-medium text-gray-700">{doc.issued_to}</p>
                            </div>
                          )}
                          {doc.issue_date && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Issue date</p>
                              <p className="text-xs font-medium text-gray-700">{doc.issue_date}</p>
                            </div>
                          )}
                          {doc.expiry_date && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Expiry date</p>
                              <p className="text-xs font-medium text-gray-700">{doc.expiry_date}</p>
                            </div>
                          )}
                        </div>

                        {/* Document link */}
                        {doc.document_url && (
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View document
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      )}

      {/* ── Search history panel ───────────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#eeeff1] p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900">Search History</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              {searchHistory.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-4">{searchHistory.length} search{searchHistory.length !== 1 ? 'es' : ''}</p>
                  {searchHistory.slice().reverse().map((historyItem, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
                      onClick={() => {
                        setSearchQuery(historyItem.query);
                        setShowHistory(false);
                        fireSearch(historyItem.query);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Search className="w-4 h-4 text-gray-400 group-hover:text-[#3B82F6]" />
                        <span className="text-sm font-medium text-gray-900 group-hover:text-[#3B82F6]">{historyItem.query}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-7">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{historyItem.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No search history yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your searches will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
