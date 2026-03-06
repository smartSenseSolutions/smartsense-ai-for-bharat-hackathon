import { ArrowLeft, Users, FileText, Phone, CheckCircle, Send, Languages, TrendingUp, Calendar, DollarSign, Clock, Mail, Sparkles, MapPin, Star, Award, Briefcase, Shield, X, IndianRupee, FileSpreadsheet, Download, Globe, ExternalLink, Search, RefreshCw, Loader2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useState, Fragment, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { QuotationsPhaseGmail } from '@/app/components/screens/QuotationsPhaseGmail';
import { ClosurePhase } from '@/app/components/screens/ClosurePhaseNew';
import { API_BASE } from '@/app/config';



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
  source: string;
  description: string;
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



interface ProposalDetailsProps {
  proposal: any;
  onBack: () => void;
  onNavigate: (screen: any) => void;
  onStatusChange?: (newStatus: string) => void;
}

export function ProposalDetails({ proposal, onBack, onNavigate, onStatusChange }: ProposalDetailsProps) {
  const proposalKey = proposal?.id || '';
  const [currentPhase, setCurrentPhase] = useState<'invite' | 'quotations' | 'ai-recommendation' | 'negotiations' | 'closure'>(() => {
    const stored = localStorage.getItem(`app_phase_${proposalKey}`);
    return (stored as any) || 'invite';
  });
  const [dealClosed, setDealClosed] = useState(false);
  const [closedDealData, setClosedDealData] = useState<any>(null);

  // Persist phase tab to localStorage
  useEffect(() => {
    if (proposalKey) {
      localStorage.setItem(`app_phase_${proposalKey}`, currentPhase);
    }
  }, [currentPhase, proposalKey]);

  // Fetch closed deal data if revisiting a completed proposal
  useEffect(() => {
    if (proposal?.status === 'completed' && currentPhase === 'closure' && !closedDealData) {
      const fetchDealData = async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const projectId = proposalKey.replace('RFP-', '');
          const res = await fetch(`${API_BASE}/api/quotes/deal-closure-extract`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              project_id: projectId,
              vendor_email: '',
              thread_id: '',
              vendor_name: '',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setClosedDealData(data);
            setDealClosed(true);
          }
        } catch (err) {
          console.error('Failed to fetch closed deal data', err);
        }
      };
      fetchDealData();
    }
  }, [proposal?.status, currentPhase, closedDealData, proposalKey]);

  // Lifted search state so it persists across phase tab switches
  const [internalResults, setInternalResults] = useState<AIVendorResult[]>([]);
  const [externalResults, setExternalResults] = useState<AIVendorResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleDealClosure = (vendor: any, extractedData: any) => {
    setClosedDealData(extractedData);
    setDealClosed(true);
    setCurrentPhase('closure');
    onStatusChange?.('completed');
  };

  const phases = [
    { id: 'invite', label: 'Invite', icon: Users },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'ai-recommendation', label: 'AI Recommendation', icon: Sparkles },
    { id: 'negotiations', label: 'Negotiations', icon: Phone },
    { id: 'closure', label: 'Closure', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Projects</span>
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{proposal?.title}</h1>
          <p className="text-sm text-gray-500">
            Created: {proposal?.createdDate ? new Date(proposal.createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center max-w-5xl mx-auto">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const isActive = phase.id === currentPhase;
            const activeIndex = phases.findIndex(p => p.id === currentPhase);
            const isCompleted = index < activeIndex;
            // When deal is closed, pre-closure phases are read-only (still navigable but locked)
            const isReadOnly = dealClosed && phase.id !== 'closure';

            return (
              <div key={phase.id} className="flex items-center">
                <button
                  onClick={() => setCurrentPhase(phase.id as any)}
                  className={`flex flex-col items-center gap-1.5 relative ${isReadOnly ? 'opacity-60' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-10 ${isActive
                    ? 'bg-[#3B82F6] text-white'
                    : isCompleted || (dealClosed && phase.id !== 'closure')
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-white border border-gray-200 text-gray-400'
                    }`}>
                    {dealClosed && phase.id !== 'closure' ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${isActive
                    ? 'text-gray-900 font-medium'
                    : isCompleted
                      ? 'text-gray-600'
                      : 'text-gray-400'
                    }`}>
                    {phase.label}
                  </span>
                </button>

                {/* Connecting Line */}
                {index < phases.length - 1 && (
                  <div className={`w-16 h-px mx-2 transition-all self-start mt-4 ${index < activeIndex || dealClosed
                    ? 'bg-[#3B82F6]'
                    : 'bg-gray-200'
                    }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(100vh-250px)] hide-scrollbar">
        <div className="bg-white rounded-xl p-5">
          {currentPhase === 'invite' && <InvitePhase proposal={proposal} onStatusChange={onStatusChange} readOnly={dealClosed}
            internalResults={internalResults} setInternalResults={setInternalResults}
            externalResults={externalResults} setExternalResults={setExternalResults}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            submittedQuery={submittedQuery} setSubmittedQuery={setSubmittedQuery}
            isInternalLoading={isInternalLoading} setIsInternalLoading={setIsInternalLoading}
            isExternalLoading={isExternalLoading} setIsExternalLoading={setIsExternalLoading}
            hasSearched={hasSearched} setHasSearched={setHasSearched}
          />}
          {currentPhase === 'quotations' && <QuotationsPhaseGmail proposal={proposal} readOnly={dealClosed} />}
          {currentPhase === 'ai-recommendation' && <AIRecommendationPhase proposal={proposal} onPhaseChange={setCurrentPhase} readOnly={dealClosed} />}
          {currentPhase === 'negotiations' && <NegotiationsPhase proposal={proposal} readOnly={dealClosed} onDealClosure={handleDealClosure} />}
          {currentPhase === 'closure' && <ClosurePhase proposal={proposal} dealData={closedDealData} />}
        </div>
      </div>
    </div>
  );
}

// Invite Phase Component
interface InvitedVendorRecord {
  id: string;
  vendor_id: string | null;
  vendor_name: string;
  contact_email: string | null;
  products: string | null;
  invited_at: string;
}

function InvitePhase({ proposal, onStatusChange, readOnly,
  internalResults, setInternalResults,
  externalResults, setExternalResults,
  searchQuery, setSearchQuery,
  submittedQuery, setSubmittedQuery,
  isInternalLoading, setIsInternalLoading,
  isExternalLoading, setIsExternalLoading,
  hasSearched, setHasSearched,
}: {
  proposal: any,
  onStatusChange?: (status: string) => void,
  readOnly?: boolean,
  internalResults: AIVendorResult[],
  setInternalResults: (v: AIVendorResult[]) => void,
  externalResults: AIVendorResult[],
  setExternalResults: (v: AIVendorResult[]) => void,
  searchQuery: string,
  setSearchQuery: (v: string) => void,
  submittedQuery: string,
  setSubmittedQuery: (v: string) => void,
  isInternalLoading: boolean,
  setIsInternalLoading: (v: boolean) => void,
  isExternalLoading: boolean,
  setIsExternalLoading: (v: boolean) => void,
  hasSearched: boolean,
  setHasSearched: (v: boolean) => void,
}) {
  const [activeTab, setActiveTab] = useState<'search' | 'invited'>('search');
  const [invitedVendorsList, setInvitedVendorsList] = useState<InvitedVendorRecord[]>([]);
  const [isLoadingInvited, setIsLoadingInvited] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedVendorForPanel, setSelectedVendorForPanel] = useState<any>(null);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Derive the set of invited vendor IDs for the side-panel "Invite sent" badge
  const invitedVendors = invitedVendorsList
    .map((v) => v.vendor_id)
    .filter(Boolean) as string[];

  const projectId = proposal?.id?.startsWith('RFP-')
    ? proposal.id.replace('RFP-', '')
    : proposal?.id;

  const fetchInvitedVendors = async () => {
    if (!projectId) return;
    setIsLoadingInvited(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/invited-vendors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setInvitedVendorsList(await res.json());
      }
    } catch {
      // silently ignore — table just stays empty
    } finally {
      setIsLoadingInvited(false);
    }
  };

  useEffect(() => {
    fetchInvitedVendors();
    // Only auto-search on the very first mount for this proposal
    if (!hasSearched && proposal && proposal.status === 'published') {
      if (proposal.rfpData) {
        fireRFPSearch(proposal.rfpData);
      } else if (proposal.title) {
        fireSearch(proposal.title);
      }
    }
  }, [proposal?.id]);

  const fireRFPSearch = async (rfpData: any) => {
    if (!rfpData) return;

    console.log('[RFP Search] rfpData being sent:', JSON.stringify(rfpData).slice(0, 500));

    setSubmittedQuery("Optimising search based on RFP...");
    setSearchQuery("");
    setInternalResults([]);
    setExternalResults([]);
    setIsInternalLoading(true);
    setIsExternalLoading(true);
    setHasSearched(true);

    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Step 1: extract intent (fast LLM call) to get the search query
    let extractedQuery = "RFP-driven search";
    try {
      const intentRes = await fetch(`${API_BASE}/api/search/vendors/smart/rfp/intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rfp_data: rfpData }),
      });
      if (intentRes.ok) {
        const intentData = await intentRes.json();
        extractedQuery = intentData.query || extractedQuery;
      }
    } catch (err) {
      console.error('RFP intent extraction failed:', err);
    }

    setSubmittedQuery(extractedQuery);
    setSearchQuery(extractedQuery);

    // Step 2: fire internal and external searches in parallel with the extracted query
    fetch(`${API_BASE}/api/search/vendors/smart/internal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: extractedQuery }),
    })
      .then(res => res.ok ? res.json() : { results: [] })
      .then(data => {
        setInternalResults(data.results ?? []);
        setIsInternalLoading(false);
      })
      .catch(err => {
        console.error('Internal search failed:', err);
        setIsInternalLoading(false);
      });

    fetch(`${API_BASE}/api/search/vendors/smart/external`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: extractedQuery }),
    })
      .then(res => res.ok ? res.json() : { results: [] })
      .then(data => {
        setExternalResults(data.results ?? []);
        setIsExternalLoading(false);
      })
      .catch(err => {
        console.error('External search failed:', err);
        setIsExternalLoading(false);
      });
  };

  const fireSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSubmittedQuery(trimmed);
    setSearchQuery(trimmed);
    setInternalResults([]);
    setExternalResults([]);
    setIsInternalLoading(true);
    setIsExternalLoading(true);
    setHasSearched(true);

    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // 1. Fetch fast internal results
    fetch(`${API_BASE}/api/search/vendors/smart/internal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: trimmed }),
    })
      .then(res => res.ok ? res.json() : { results: [] })
      .then(data => {
        setInternalResults(data.results ?? []);
        setIsInternalLoading(false);
      })
      .catch(err => {
        console.error('Internal search failed:', err);
        setIsInternalLoading(false);
      });

    // 2. Fetch slower external Gemini results
    fetch(`${API_BASE}/api/search/vendors/smart/external`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: trimmed }),
    })
      .then(res => res.ok ? res.json() : { results: [] })
      .then(data => {
        setExternalResults(data.results ?? []);
        setIsExternalLoading(false);
      })
      .catch(err => {
        console.error('External search failed:', err);
        setIsExternalLoading(false);
      });
  };

  const handleSearch = () => {
    if (searchQuery.trim().length > 0) {
      fireSearch(searchQuery);
    }
  };

  const handleVendorSelect = (vendorId: string) => {
    if (invitedVendors.includes(vendorId)) return;
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const toDetailVendor = (r: AIVendorResult) => ({
    id: r.vendor_id,
    name: r.vendor_name,
    country: r.location || '',
    products: r.products?.join(', ') ?? '',
    trustScore: Math.round(r.final_score * 100),
    certifications: r.certificates ?? [],
    certificate_details: r.certificate_details ?? [],
    website: r.website ?? '',
    contact_email: r.contact_email ?? '',
    mobile: r.mobile ?? '',
    estd: r.estd,
    source: r.source,
  });

  const handleCardClick = (vendor: AIVendorResult, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-area') || target.closest('a')) {
      return;
    }
    setSelectedVendorForPanel(toDetailVendor(vendor));
    setSidePanelOpen(true);
  };

  const handleSendInvites = async () => {
    if (selectedVendors.length === 0) return;
    setIsSendingInvites(true);

    // Build vendors list from search results
    const allResults = [...internalResults, ...externalResults];
    const vendorsToInvite = selectedVendors
      .map(id => allResults.find(r => r.vendor_id === id))
      .filter(Boolean)
      .map(r => ({
        id: r!.vendor_id,
        name: r!.vendor_name,
        contact_email: r!.contact_email || '',
        products: r!.products?.join(', ') ?? '',
      }));

    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/api/rfp/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          project_name: proposal.title || proposal.projectName || '',
          vendors: vendorsToInvite,
          rfp_data: proposal.rfpData || null,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Server error ${res.status}`);
      }

      const data = await res.json();
      const sentCount = data.results?.filter((r: any) => r.success).length ?? 0;
      const failedCount = (data.results?.length ?? 0) - sentCount;

      // Refresh the invited vendors list from the backend
      await fetchInvitedVendors();
      if (failedCount > 0) {
        toast.warning(`Sent ${sentCount} invite(s), ${failedCount} failed`);
      } else {
        toast.success(`Invites sent to ${sentCount} vendor(s)`);
      }

      if (proposal.status !== 'in-progress' && proposal.status !== 'completed') {
        onStatusChange?.('in-progress');
      }
      setSelectedVendors([]);
    } catch (err: any) {
      console.error('Send invites failed:', err);
      toast.error('Failed to send invites: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const renderVendorCard = (result: AIVendorResult) => {
    const isInvited = invitedVendors.includes(result.vendor_id);
    const isSelected = selectedVendors.includes(result.vendor_id);
    const productsStr = result.products.join(', ');
    const trustScore = Math.round(result.final_score * 100);

    return (
      <Card
        key={result.vendor_id}
        className={`bg-white transition-all cursor-pointer group border ${isInvited ? 'border-[#eeeff1] bg-white' : isSelected ? 'border-[#3B82F6] bg-blue-50' : 'border-[#eeeff1] hover:bg-gray-50'}`}
        onClick={(e) => handleCardClick(result, e)}
      >
        <CardContent className="p-4 relative">
          {isInvited ? (
            <div className="absolute top-3 right-3 z-10">
              <Badge className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border-0">
                Invite sent
              </Badge>
            </div>
          ) : (
            <div
              className={`checkbox-area absolute top-3 right-3 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleVendorSelect(result.vendor_id);
              }}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-[#3B82F6] border-[#3B82F6]' : 'bg-white border-gray-300'}`}>
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          )}

          <div className="pr-8">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {result.vendor_name}
                </h3>
              </div>
            </div>
            {result.source === 'internal' ? (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-bold text-green-600">{trustScore}%</span>
                </div>
                <Badge className="text-[10px] px-1.5 py-0.5 border-0 leading-none bg-green-100 text-green-700">
                  <Shield className="w-2.5 h-2.5 mr-0.5 inline" />
                  Verified
                </Badge>
              </div>
            ) : (
              <div className="mb-2">
                <Badge className="text-[10px] px-1.5 py-0.5 border-0 leading-none bg-blue-50 text-blue-600">
                  <Globe className="w-2.5 h-2.5 mr-0.5 inline" />
                  External
                </Badge>
              </div>
            )}

            <p className="text-xs text-gray-600 mb-2 line-clamp-1">{productsStr}</p>
            {result.description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                {result.description}
              </p>
            )}

            {result.certificates && result.certificates.length > 0 && result.source === 'internal' && (
              <div className="flex flex-wrap gap-1 mb-3">
                {result.certificates.map((cert, idx) => (
                  <Badge key={idx} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-0 leading-none font-medium">
                    {cert}
                  </Badge>
                ))}
              </div>
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
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Invite Vendors</h2>
        <p className="text-sm text-gray-500">Search and select vendors to invite for this RFP</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'search' ? 'text-[#3B82F6]' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Search Vendors
          {activeTab === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6]"></div>}
        </button>
        <button
          onClick={() => setActiveTab('invited')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'invited' ? 'text-[#3B82F6]' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Invited Vendors ({invitedVendorsList.length})
          {activeTab === 'invited' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6]"></div>}
        </button>
      </div>

      {activeTab === 'search' ? (
        <div>
          <div className="mb-5 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search vendors or products here..."
                className="w-full h-10 bg-white border border-[#eeeff1] text-sm pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} className="h-10 bg-[#3B82F6] hover:bg-[#2563EB]">Search</Button>
          </div>

          {selectedVendors.length > 0 && (
            <div className="mb-5 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-gray-900">
                {selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''} selected
              </span>
              <Button onClick={handleSendInvites} disabled={isSendingInvites} className="bg-[#3B82F6] hover:bg-[#2563EB] h-9 px-4 text-sm disabled:opacity-60">
                {isSendingInvites ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invite{selectedVendors.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="overflow-y-auto hide-scrollbar pb-10" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {submittedQuery && (
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{submittedQuery}</h3>
                <AnimatePresence mode="wait">
                  {isInternalLoading || isExternalLoading ? (
                    <motion.div
                      key="searching"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-2"
                    >
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <motion.div
                          animate={{
                            rotate: 360,
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{
                            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                          }}
                        >
                          <Sparkles className="w-4 h-4 text-blue-600" />
                        </motion.div>
                        <motion.div
                          className="absolute inset-0 bg-blue-400 rounded-full filter blur-md"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.1, 0.3, 0.1]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium text-blue-600">
                        {isInternalLoading ? 'Searching internal database...' : 'External search in progress...'}
                        {internalResults.length > 0 && <span className="text-gray-400 ml-2">({internalResults.length} internal results found)</span>}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="found"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-gray-600"
                    >
                      <span className="font-semibold text-gray-900">{internalResults.length + externalResults.length}</span> vendor{internalResults.length + externalResults.length !== 1 ? 's' : ''} found
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-700">Verified Vendors</h3>
                <span className="text-xs text-gray-400">({isInternalLoading ? 'Searching...' : internalResults.length})</span>
              </div>

              {isInternalLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <motion.div
                      key={`int-loading-${i}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="bg-white border border-[#eeeff1] rounded-xl p-4 relative overflow-hidden min-h-[140px] flex flex-col shadow-sm"
                    >
                      {/* Premium shimmer beam effect */}
                      <motion.div
                        className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg]"
                        animate={{ left: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                      />
                      {/* Gentle background pulse */}
                      <motion.div
                        className="absolute inset-0 bg-blue-50/20"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      />
                      <div className="relative z-0 flex items-start justify-between mb-4">
                        <div className="h-5 bg-gray-200/80 rounded flex-1 mr-8" />
                        <div className="h-5 bg-green-100/80 rounded-full w-20 flex-shrink-0" />
                      </div>
                      <div className="relative z-0 space-y-2.5 mb-5">
                        <div className="h-3 bg-gray-100 rounded w-full" />
                        <div className="h-3 bg-gray-100 rounded w-5/6" />
                      </div>
                      <div className="relative z-0 flex items-center gap-3 mt-auto">
                        <div className="h-4 bg-gray-200/60 rounded w-16" />
                        <div className="h-4 bg-gray-200/60 rounded w-12" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : internalResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {internalResults.map((result, idx) => (
                      <motion.div
                        key={result.vendor_id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                      >
                        {renderVendorCard(result)}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : !isExternalLoading && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
                  <p className="text-sm text-gray-500 font-medium">No verified vendors met the search criteria.</p>
                </div>
              )}
            </div>

            {(externalResults.length > 0 || isExternalLoading) && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-700">External Sources</h3>
                    <span className="text-xs text-gray-400">({isExternalLoading ? 'AI searching...' : externalResults.length})</span>
                  </div>
                  {isExternalLoading && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 text-blue-600 rounded-full text-xs font-medium border border-blue-100 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Procure AI is researching the web...
                    </div>
                  )}
                </div>

                {isExternalLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                      <motion.div
                        key={`ext-loading-${i}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className="bg-white border border-[#eeeff1] rounded-xl p-4 relative overflow-hidden min-h-[140px] flex flex-col shadow-sm"
                      >
                        {/* Premium shimmer beam effect */}
                        <motion.div
                          className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg]"
                          animate={{ left: ['-100%', '200%'] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: "linear", delay: 0.2 }}
                        />
                        {/* Gentle background pulse */}
                        <motion.div
                          className="absolute inset-0 bg-purple-50/10"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                        <div className="relative z-0 flex items-start justify-between mb-4">
                          <div className="h-5 bg-gray-200/80 rounded flex-1 mr-8" />
                          <div className="h-5 bg-blue-100/80 rounded-full w-20 flex-shrink-0" />
                        </div>
                        <div className="relative z-0 space-y-2.5 mb-5">
                          <div className="h-3 bg-gray-100 rounded w-full" />
                          <div className="h-3 bg-gray-100 rounded w-4/5" />
                        </div>
                        <div className="relative z-0 flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-3">
                            <div className="h-4 bg-gray-200/60 rounded w-16" />
                            <div className="h-4 bg-gray-200/60 rounded w-12" />
                          </div>
                          <div className="h-4 bg-blue-50/80 rounded-full w-14" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                      {externalResults.map((result, idx) => (
                        <motion.div
                          key={result.vendor_id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: idx * 0.05 }}
                        >
                          {renderVendorCard(result)}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {!isInternalLoading && !isExternalLoading && internalResults.length === 0 && externalResults.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No vendors found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto hide-scrollbar" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {isLoadingInvited ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Loading invited vendors…
            </div>
          ) : invitedVendorsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Users className="w-8 h-8 opacity-40" />
              <span className="text-sm">No vendors invited yet</span>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Vendor Name</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Products</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Invited At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitedVendorsList.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3"><span className="text-sm font-medium text-gray-900">{vendor.vendor_name}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{vendor.contact_email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-600">{vendor.products || '—'}</span></td>
                      <td className="px-4 py-3"><Badge className="bg-blue-50 text-[#3B82F6] border-0 text-xs px-2 py-0.5">Invited</Badge></td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {new Date(vendor.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {sidePanelOpen && selectedVendorForPanel && (
        <div
          className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-end"
          onClick={() => setSidePanelOpen(false)}
        >
          <div
            className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[#eeeff1] p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900">Vendor Details</h2>
              <button onClick={() => setSidePanelOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Name + badge + trust score */}
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedVendorForPanel.name}</h3>
                    {selectedVendorForPanel.source === 'internal' ? (
                      <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border-0">
                        <Shield className="w-3 h-3 mr-1 inline" />
                        Verified Partner
                      </Badge>
                    ) : (
                      <Badge className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-0">
                        <Sparkles className="w-3 h-3 mr-1 inline" />
                        AI Discovered
                      </Badge>
                    )}
                  </div>
                  {selectedVendorForPanel.country && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm">{selectedVendorForPanel.country}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{selectedVendorForPanel.trustScore}%</p>
                  <p className="text-xs text-gray-400">AI Match Score</p>
                </div>
              </div>

              {/* Key info grid */}
              <div className="grid grid-cols-2 gap-3">
                {selectedVendorForPanel.estd && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Established</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVendorForPanel.estd}</p>
                    <p className="text-xs text-gray-400">{new Date().getFullYear() - selectedVendorForPanel.estd} years in business</p>
                  </div>
                )}
                {selectedVendorForPanel.certifications?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Certifications</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVendorForPanel.certifications.length}</p>
                    <p className="text-xs text-gray-400">verified certificates</p>
                  </div>
                )}
                {selectedVendorForPanel.contact_email && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{selectedVendorForPanel.contact_email}</p>
                  </div>
                )}
                {selectedVendorForPanel.mobile && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedVendorForPanel.mobile}</p>
                  </div>
                )}
                {selectedVendorForPanel.website && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Website</p>
                    <a
                      href={selectedVendorForPanel.website.startsWith('http') ? selectedVendorForPanel.website : `https://${selectedVendorForPanel.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {selectedVendorForPanel.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Products & Services */}
              {selectedVendorForPanel.products && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Products &amp; Services</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedVendorForPanel.products}</p>
                </div>
              )}

              {/* Certification badges */}
              {selectedVendorForPanel.certifications?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendorForPanel.certifications.map((cert: string, i: number) => (
                      <Badge key={i} className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200">
                        <Award className="w-3 h-3 mr-1 inline" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificate documents */}
              {selectedVendorForPanel.certificate_details?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Certificate Documents</p>
                  <div className="space-y-3">
                    {selectedVendorForPanel.certificate_details.map((doc: CertificateDetail, i: number) => (
                      <div key={i} className="border border-[#eeeff1] rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {doc.document_name || doc.document_type || 'Certificate'}
                          </p>
                          {doc.document_type && (
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border-0">
                              {doc.document_type}
                            </Badge>
                          )}
                        </div>
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

            {/* Sticky bottom CTA */}
            <div className="sticky bottom-0 bg-white border-t border-[#eeeff1] px-5 py-4">
              {invitedVendors.includes(selectedVendorForPanel.id) ? (
                <Badge className="w-full justify-center text-center text-xs px-3 py-2 bg-green-50 text-green-700 border-0">
                  Invite sent
                </Badge>
              ) : (
                <Button
                  onClick={() => handleVendorSelect(selectedVendorForPanel.id)}
                  className={`w-full ${selectedVendors.includes(selectedVendorForPanel.id) ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'}`}
                >
                  {selectedVendors.includes(selectedVendorForPanel.id) ? 'Remove from Selection' : 'Add to Selection'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Queries Phase Component
function QueriesPhase({ proposal }: { proposal: any }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queries = [
    {
      id: 1,
      vendor: 'TechDistributor Inc.',
      email: 'contact@techdist.com',
      subject: 'Technical Specifications Query',
      timestamp: '21 Jan 2026 14:30',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 14:30',
          originalLanguage: 'French',
          originalMessage: 'Pouvons-nous avoir plus de détails sur les spécifications techniques?',
          translatedMessage: 'Can we have more details about the technical specifications?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@techdist.com',
          timestamp: '21 Jan 2026 16:15',
          originalLanguage: 'English',
          originalMessage: 'Thank you for your inquiry. The technical specifications include: Material composition (Nitrile latex-free), minimum thickness of 0.2mm, powder-free with textured fingertips, and must be FDA approved with ISO 13485 certification.',
          translatedMessage: 'Thank you for your inquiry. The technical specifications include: Material composition (Nitrile latex-free), minimum thickness of 0.2mm, powder-free with textured fingertips, and must be FDA approved with ISO 13485 certification.',
          type: 'sent',
        },
        {
          id: 3,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 09:20',
          originalLanguage: 'French',
          originalMessage: 'Merci pour ces informations. Avez-vous des exigences spécifiques concernant la résistance à la perforation?',
          translatedMessage: 'Thank you for this information. Do you have specific requirements regarding puncture resistance?',
          type: 'received',
        },
        {
          id: 4,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@techdist.com',
          timestamp: '22 Jan 2026 11:45',
          originalLanguage: 'English',
          originalMessage: 'Yes, the gloves must meet ASTM D6319 standards for puncture resistance. Additionally, they should have a minimum tensile strength of 14 MPa and elongation at break of 500%.',
          translatedMessage: 'Yes, the gloves must meet ASTM D6319 standards for puncture resistance. Additionally, they should have a minimum tensile strength of 14 MPa and elongation at break of 500%.',
          type: 'sent',
        },
        {
          id: 5,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 14:30',
          originalLanguage: 'French',
          originalMessage: 'Parfait. Nos gants répondent à toutes ces normes. Pouvez-vous confirmer les tailles requises et la répartition des quantités par taille?',
          translatedMessage: 'Perfect. Our gloves meet all these standards. Can you confirm the required sizes and quantity distribution per size?',
          type: 'received',
        },
      ],
    },
    {
      id: 2,
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      subject: 'Warranty Terms Clarification',
      timestamp: '21 Jan 2026 11:15',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'info@globalsupply.com',
          fromName: 'Global Electronics Supply',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 11:15',
          originalLanguage: 'Chinese',
          originalMessage: '保修条款是什么？',
          translatedMessage: 'What are the warranty terms?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@globalsupply.com',
          timestamp: '21 Jan 2026 15:30',
          originalLanguage: 'English',
          originalMessage: 'We offer a comprehensive 3-year warranty covering manufacturing defects and performance issues.',
          translatedMessage: 'We offer a comprehensive 3-year warranty covering manufacturing defects and performance issues.',
          type: 'sent',
        },
      ],
    },
    {
      id: 3,
      vendor: 'Enterprise Solutions Co.',
      email: 'sales@enterprise.com',
      subject: 'Payment Schedule Information',
      timestamp: '20 Jan 2026 16:45',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'sales@enterprise.com',
          fromName: 'Enterprise Solutions Co.',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 16:45',
          originalLanguage: 'English',
          originalMessage: 'What is the payment schedule?',
          translatedMessage: 'What is the payment schedule?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@enterprise.com',
          timestamp: '21 Jan 2026 09:20',
          originalLanguage: 'English',
          originalMessage: 'Payment will be made in 3 installments: 30% upfront, 40% upon delivery, and 30% after installation.',
          translatedMessage: 'Payment will be made in 3 installments: 30% upfront, 40% upon delivery, and 30% after installation.',
          type: 'sent',
        },
        {
          id: 3,
          from: 'sales@enterprise.com',
          fromName: 'Enterprise Solutions Co.',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 14:10',
          originalLanguage: 'English',
          originalMessage: 'Thank you for the clarification. This payment schedule works for us.',
          translatedMessage: 'Thank you for the clarification. This payment schedule works for us.',
          type: 'received',
        },
      ],
    },
    {
      id: 4,
      vendor: 'MedSupply International',
      email: 'orders@medsupply.com',
      subject: 'Delivery Timeframe Question',
      timestamp: '20 Jan 2026 09:20',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'orders@medsupply.com',
          fromName: 'MedSupply International',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 09:20',
          originalLanguage: 'Spanish',
          originalMessage: '¿Cuál es el plazo de entrega?',
          translatedMessage: 'What is the delivery timeframe?',
          type: 'received',
        },
      ],
    },
    {
      id: 5,
      vendor: 'BioMed Supplies',
      email: 'contact@biomedsupplies.com',
      subject: 'Product Certification Inquiry',
      timestamp: '19 Jan 2026 15:30',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'contact@biomedsupplies.com',
          fromName: 'BioMed Supplies',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 15:30',
          originalLanguage: 'English',
          originalMessage: 'Do you require CE marking and ISO 13485 certification for all products?',
          translatedMessage: 'Do you require CE marking and ISO 13485 certification for all products?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@biomedsupplies.com',
          timestamp: '20 Jan 2026 08:15',
          originalLanguage: 'English',
          originalMessage: 'Yes, CE marking and ISO 13485 certification are mandatory requirements for all medical-grade products.',
          translatedMessage: 'Yes, CE marking and ISO 13485 certification are mandatory requirements for all medical-grade products.',
          type: 'sent',
        },
      ],
    },
    {
      id: 6,
      vendor: 'HealthCare Innovations',
      email: 'sales@healthcareinnovations.com',
      subject: 'Bulk Pricing Request',
      timestamp: '19 Jan 2026 10:45',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'sales@healthcareinnovations.com',
          fromName: 'HealthCare Innovations',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 10:45',
          originalLanguage: 'German',
          originalMessage: 'Können Sie uns einen Mengenrabatt für Bestellungen über 100.000 Einheiten anbieten?',
          translatedMessage: 'Can you offer us a volume discount for orders over 100,000 units?',
          type: 'received',
        },
      ],
    },
    {
      id: 7,
      vendor: 'Medical Devices Corp',
      email: 'info@meddevicescorp.com',
      subject: 'Shipping Logistics Question',
      timestamp: '18 Jan 2026 14:20',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'info@meddevicescorp.com',
          fromName: 'Medical Devices Corp',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 14:20',
          originalLanguage: 'Italian',
          originalMessage: 'Quali sono le opzioni di spedizione disponibili per ordini urgenti?',
          translatedMessage: 'What shipping options are available for urgent orders?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@meddevicescorp.com',
          timestamp: '19 Jan 2026 09:00',
          originalLanguage: 'English',
          originalMessage: 'We offer express shipping with 3-5 day delivery and standard shipping with 10-14 day delivery.',
          translatedMessage: 'We offer express shipping with 3-5 day delivery and standard shipping with 10-14 day delivery.',
          type: 'sent',
        },
      ],
    },
    {
      id: 8,
      vendor: 'Lab Equipment Solutions',
      email: 'support@labequipmentsolutions.com',
      subject: 'Customization Options',
      timestamp: '18 Jan 2026 11:00',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'support@labequipmentsolutions.com',
          fromName: 'Lab Equipment Solutions',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 11:00',
          originalLanguage: 'English',
          originalMessage: 'Are custom sizes or packaging configurations available for this product line?',
          translatedMessage: 'Are custom sizes or packaging configurations available for this product line?',
          type: 'received',
        },
      ],
    },
    {
      id: 9,
      vendor: 'PharmaSupply Global',
      email: 'orders@pharmasupplyglobal.com',
      subject: 'Storage Requirements Query',
      timestamp: '17 Jan 2026 16:30',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'orders@pharmasupplyglobal.com',
          fromName: 'PharmaSupply Global',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 16:30',
          originalLanguage: 'Japanese',
          originalMessage: '製品の保管要件は何ですか？',
          translatedMessage: 'What are the storage requirements for the products?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@pharmasupplyglobal.com',
          timestamp: '18 Jan 2026 10:15',
          originalLanguage: 'English',
          originalMessage: 'Products should be stored in a cool, dry place at temperatures between 15-25°C with humidity below 60%.',
          translatedMessage: 'Products should be stored in a cool, dry place at temperatures between 15-25°C with humidity below 60%.',
          type: 'sent',
        },
      ],
    },
    {
      id: 10,
      vendor: 'Clinical Supplies Ltd',
      email: 'procurement@clinicalsupplies.com',
      subject: 'Minimum Order Quantity',
      timestamp: '17 Jan 2026 09:15',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'procurement@clinicalsupplies.com',
          fromName: 'Clinical Supplies Ltd',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 09:15',
          originalLanguage: 'Portuguese',
          originalMessage: 'Qual é a quantidade mínima de pedido para este produto?',
          translatedMessage: 'What is the minimum order quantity for this product?',
          type: 'received',
        },
      ],
    },
  ];

  const filteredQueries = queries.filter((query) => {
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;

    // Apply search filter
    const matchesSearch = searchQuery === '' ||
      query.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const [selectedQuery, setSelectedQuery] = useState(filteredQueries.length > 0 ? filteredQueries[0] : null);

  // Update selected query when filter changes
  const handleFilterChange = (filter: 'all' | 'pending' | 'responded') => {
    setStatusFilter(filter);
    const newFilteredQueries = queries.filter((query) => {
      const matchesStatus = filter === 'all' || query.status === filter;
      const matchesSearch = searchQuery === '' ||
        query.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
    if (newFilteredQueries.length > 0) {
      setSelectedQuery(newFilteredQueries[0]);
    } else {
      setSelectedQuery(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Vendor Queries</h2>
          <p className="text-sm text-gray-500">Manage vendor questions with AI-powered translation</p>
        </div>
      </div>

      {/* Search Bar with Dropdown Filter */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <Input
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 bg-white border-gray-200 text-sm"
          />
        </div>
        <div className="col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value as 'all' | 'pending' | 'responded')}
            className="h-9 px-3 text-sm border-0 rounded-lg bg-[#F3F4F6] text-gray-700 focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-[right_0.75rem_center] bg-no-repeat"
          >
            <option value="all">All ({queries.length})</option>
            <option value="pending">Pending ({queries.filter(q => q.status === 'pending').length})</option>
            <option value="responded">Responded ({queries.filter(q => q.status === 'responded').length})</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 items-start" style={{ height: 'calc(100vh - 340px)' }}>
        {/* Queries List - Left Side */}
        <div className="w-1/3 border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-y-auto hide-scrollbar" style={{ maxHeight: '100%' }}>
          {filteredQueries.length > 0 ? (
            filteredQueries.map((query) => (
              <button
                key={query.id}
                onClick={() => setSelectedQuery(query)}
                className={`w-full text-left p-4 transition-colors relative ${selectedQuery?.id === query.id
                  ? 'bg-blue-50 border-l-2 border-[#3B82F6]'
                  : 'hover:bg-gray-50'
                  }`}
              >
                {query.status === 'pending' && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
                <p className="text-sm font-semibold text-gray-900 mb-2">{query.vendor}</p>
                <p className="text-xs text-gray-700 truncate mb-3 leading-relaxed">{query.subject}</p>
                <p className="text-xs text-gray-400">{query.timestamp}</p>
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-gray-500">No queries found</p>
            </div>
          )}
        </div>

        {/* Email Thread - Right Side */}
        <div className="flex-1 border border-gray-200 rounded-lg flex flex-col" style={{ height: '100%' }}>
          {selectedQuery ? (
            <>
              {/* Email Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="mb-2">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Re: {selectedQuery.subject}</h3>
                  <p className="text-xs text-gray-500">To: {selectedQuery.email}</p>
                </div>
              </div>

              {/* Email Thread Messages */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto hide-scrollbar">
                {selectedQuery.thread.map((message) => (
                  <div key={message.id} className={`${message.type === 'sent' ? 'ml-8' : 'mr-8'}`}>
                    {/* Message Header */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'sent' ? 'bg-[#3B82F6]' : 'bg-gray-400'
                        }`}>
                        <span className="text-white text-xs font-semibold">
                          {message.fromName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900">{message.fromName}</p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">{message.timestamp}</p>
                        </div>
                        <p className="text-xs text-gray-500">To: {message.to}</p>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className={`ml-11 ${message.type === 'sent' ? 'bg-blue-50' : 'bg-gray-50'} rounded-lg p-3`}>
                      {message.originalLanguage !== 'English' && message.type === 'received' ? (
                        <>
                          {/* Original Message */}
                          <div className="mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Languages className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-500">Original ({message.originalLanguage})</span>
                            </div>
                            <p className="text-sm text-gray-900">{message.originalMessage}</p>
                          </div>
                          {/* Translation */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Languages className="w-3.5 h-3.5 text-[#3B82F6]" />
                              <span className="text-xs font-medium text-[#3B82F6]">AI Translation</span>
                            </div>
                            <p className="text-sm text-gray-900">{message.translatedMessage}</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-900">{message.originalMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Section */}
              {selectedQuery.status === 'pending' && (
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                  <div className="relative">
                    <Input placeholder="Type your response..." className="w-full h-12 bg-white border-gray-200 text-sm pr-12" />
                    <Button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3B82F6] hover:bg-[#2563EB] h-8 w-8 p-0 flex items-center justify-center rounded-lg">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-500">Select a query to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Quotations Phase Component
function QuotationsPhase({ proposal }: { proposal: any }) {
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);
  const [selectedEmailVendor, setSelectedEmailVendor] = useState<any>(null);

  const quotations = [
    {
      id: 1,
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      price: 118500,
      deliveryDays: 50,
      warranty: '3 years',
      submittedAt: '21 Jan 2026',
    },
    {
      id: 2,
      vendor: 'TechDistributor Inc.',
      email: 'contact@techdist.com',
      price: 125000,
      deliveryDays: 45,
      warranty: '3 years',
      submittedAt: '21 Jan 2026',
    },
    {
      id: 3,
      vendor: 'Enterprise Solutions Co.',
      email: 'sales@enterprise.com',
      price: 132000,
      deliveryDays: 40,
      warranty: '2 years',
      submittedAt: '20 Jan 2026',
    },
    {
      id: 4,
      vendor: 'MedSupply International',
      email: 'orders@medsupply.com',
      price: 115000,
      deliveryDays: 55,
      warranty: '3 years',
      submittedAt: '21 Jan 2026',
    },
    {
      id: 5,
      vendor: 'Healthcare Distributors',
      email: 'info@healthdist.com',
      price: 128500,
      deliveryDays: 42,
      warranty: '2 years',
      submittedAt: '20 Jan 2026',
    },
    {
      id: 6,
      vendor: 'BioMedical Supplies Ltd.',
      email: 'procurement@biomedical.com',
      price: 122000,
      deliveryDays: 48,
      warranty: '3 years',
      submittedAt: '21 Jan 2026',
    },
    {
      id: 7,
      vendor: 'Prime Medical Equipment',
      email: 'sales@primemedical.com',
      price: 119500,
      deliveryDays: 52,
      warranty: '2 years',
      submittedAt: '20 Jan 2026',
    },
  ];

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quotations Received</h2>
            <p className="text-sm text-gray-500">Quotations have been received from {quotations.length} vendors</p>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Vendor</th>
                <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Price</th>
                <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Delivery</th>
                <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Warranty</th>
                <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Submitted</th>
                <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotations.map((quote) => (
                <tr key={quote.id} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{quote.vendor}</p>
                      <p className="text-xs text-gray-500">{quote.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">${quote.price.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{quote.deliveryDays} days</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{quote.warranty}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{quote.submittedAt}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-gray-200"
                        onClick={() => {
                          setSelectedEmailVendor(quote);
                          setEmailThreadOpen(true);
                        }}
                      >
                        View Email
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Thread Side Panel */}
      {emailThreadOpen && selectedEmailVendor && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEmailThreadOpen(false)}
          />

          {/* Side Panel */}
          <div className="absolute top-0 right-0 h-full w-[600px] bg-white shadow-lg flex flex-col" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="bg-white border-b border-[#eeeff1] px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Email</h2>
                  <p className="text-sm text-gray-500">{selectedEmailVendor.vendor}</p>
                </div>
                <button
                  onClick={() => setEmailThreadOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Email Thread Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {/* Email 1 - RFP Invitation */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                    You
                  </div>
                  <div className="flex-1">
                    <div className="bg-[#f8fafc] rounded-lg p-4">
                      <div className="mb-1">
                        <span className="text-sm font-semibold text-gray-900">Request for Quotation - {proposal.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">20 Jan 2026 10:30</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Dear {selectedEmailVendor.vendor},<br /><br />
                        We are requesting quotations for {proposal.title}. Please review the attached specifications and provide your best quote including pricing, delivery timeline, and warranty terms.<br /><br />
                        Looking forward to your response.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email 2 - Clarification Request */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {selectedEmailVendor.vendor.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-[#eeeff1] rounded-lg p-4">
                      <div className="mb-1">
                        <span className="text-sm font-semibold text-gray-900">RE: Request for Quotation</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">20 Jan 2026 14:15</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Thank you for your inquiry. We would like to clarify a few technical specifications before submitting our quotation. Could you please confirm the required certification standards and the expected delivery location?
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email 3 - Response with Details */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                    You
                  </div>
                  <div className="flex-1">
                    <div className="bg-[#f8fafc] rounded-lg p-4">
                      <div className="mb-1">
                        <span className="text-sm font-semibold text-gray-900">RE: Request for Quotation</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">20 Jan 2026 16:45</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Thank you for your response. The required certifications are ISO 13485 and CE. Delivery location will be Mumbai, Maharashtra. Please let us know if you need any additional information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email 4 - Quotation Submitted */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {selectedEmailVendor.vendor.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-[#eeeff1] rounded-lg p-4">
                      <div className="mb-1">
                        <span className="text-sm font-semibold text-gray-900">Quotation Submitted</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{selectedEmailVendor.submittedAt} 11:20</p>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        Please find our quotation for {proposal.title}:
                      </p>
                      <div className="bg-[#f8fafc] rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-semibold text-gray-900">${selectedEmailVendor.price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span className="text-gray-900">{selectedEmailVendor.deliveryDays} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Warranty:</span>
                          <span className="text-gray-900">{selectedEmailVendor.warranty}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mt-3">
                        All products are certified and ready for immediate dispatch. We look forward to working with you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reply Section */}
            <div className="border-t border-[#eeeff1] px-6 py-4 bg-white">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your reply..."
                  className="flex-1 text-sm"
                />
                <Button className="bg-[#3B82F6] text-white hover:bg-[#2563EB]">
                  <Send className="w-4 h-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// AI Recommendation Phase Component
function AIRecommendationPhase({ proposal, onPhaseChange, readOnly }: { proposal: any, onPhaseChange?: (phase: any) => void, readOnly?: boolean }) {
  const [hoveredVendor, setHoveredVendor] = useState<string | null>(null);
  const [emailPanelVendor, setEmailPanelVendor] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isMovingToNegotiations, setIsMovingToNegotiations] = useState(false);

  const projectId = proposal?.id?.startsWith('RFP-')
    ? proposal.id.replace('RFP-', '')
    : proposal?.id;

  const fetchRecommendations = async (refresh = false) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = new URL(`${API_BASE}/api/quotes/by-project/${projectId}/recommendations`);
      if (refresh) {
        url.searchParams.append('refresh', 'true');
      }

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        if (refresh) {
          toast.success("AI recommendations refreshed");
        }
      } else {
        toast.error("Failed to fetch AI recommendations");
      }
    } catch (error) {
      console.error("Error fetching logic:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [projectId]);

  const handleSendEmail = (vendor: any) => {
    setEmailPanelVendor(vendor);
  };

  const handleToggleSelectAll = () => {
    if (selectedEmails.size === recommendations.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(recommendations.map(r => r.vendor_email)));
    }
  };

  const handleToggleSelectVendor = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    setSelectedEmails(next);
  };

  const handleMoveToNegotiations = async () => {
    if (selectedEmails.size === 0) return;
    setIsMovingToNegotiations(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/quotes/bulk-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          vendor_emails: Array.from(selectedEmails),
          status: 'negotiating'
        }),
      });

      if (res.ok) {
        toast.success(`Moved ${selectedEmails.size} vendors to negotiations`);
        if (onPhaseChange) {
          onPhaseChange('negotiations');
        }
      } else {
        toast.error("Failed to move vendors to negotiations");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsMovingToNegotiations(false);
    }
  };

  const metrics = [
    { id: 'price', label: 'Price Competitiveness', field: 'price_score' },
    { id: 'delivery', label: 'Delivery Timeline', field: 'delivery_score' },
    { id: 'quality', label: 'Quality Standards', field: 'quality_score' },
    { id: 'warranty', label: 'Warranty Terms', field: 'warranty_score' },
    { id: 'compliance', label: 'Compliance & Certifications', field: 'compliance_score' },
    { id: 'overall', label: 'Overall AI Score', field: 'overall_score' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Recommendation</h2>
          <p className="text-sm text-gray-500">AI-powered analysis using Amazon Nova models</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEmails.size > 0 && (
            <Button
              onClick={handleMoveToNegotiations}
              disabled={isMovingToNegotiations}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              size="sm"
            >
              {isMovingToNegotiations ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              Move to Negotiations ({selectedEmails.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRecommendations(true)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* AI Scoring Matrix Table (Transposed) */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={recommendations.length > 0 && selectedEmails.size === recommendations.length}
                  onChange={handleToggleSelectAll}
                />
              </th>
              <th className="text-left text-xs font-medium text-gray-600 px-4 py-3 w-64">Vendor</th>
              {metrics.map((metric) => (
                <th key={metric.id} className="text-center text-xs font-medium text-gray-600 px-4 py-3">
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={metrics.length + 2} className="px-4 py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                    AI is reviewing the quotations and negotiating requirements...
                  </div>
                </td>
              </tr>
            ) : recommendations.length === 0 ? (
              <tr>
                <td colSpan={metrics.length + 2} className="px-4 py-12 text-center text-sm text-gray-500">
                  No recommendations generated yet.
                </td>
              </tr>
            ) : recommendations.flatMap((vendor, idx) => {
              const uniqueId = vendor.vendor_name + idx;
              return [
                <tr
                  key={uniqueId}
                  className={`${vendor.is_recommended ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'} transition-colors`}
                  onMouseEnter={() => vendor.is_recommended && setHoveredVendor(uniqueId)}
                  onMouseLeave={() => setHoveredVendor(null)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedEmails.has(vendor.vendor_email)}
                      onChange={() => handleToggleSelectVendor(vendor.vendor_email)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{vendor.vendor_name}</span>
                        {vendor.is_recommended && (
                          <Badge className="text-xs px-1.5 py-0 bg-green-600 text-white border-0">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{vendor.vendor_email}</span>
                    </div>
                  </td>
                  {metrics.map((metric, mIdx) => {
                    const score = vendor[metric.field as keyof typeof vendor] as number || 0;
                    const citation = vendor.citations?.[metric.field] || vendor.citation;
                    const isLast = mIdx === metrics.length - 1;
                    return (
                      <td key={metric.id} className="px-4 py-3 text-center relative group">
                        <span className={`text-sm font-medium ${getScoreColor(score)} cursor-help border-b border-dashed border-gray-300`}>
                          {score}
                        </span>
                        {/* Tooltip for metrics */}
                        {citation && (
                          <div className={`absolute z-50 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none text-left anim-fade-in
                            ${isLast ? 'right-full mr-3 top-1/2 -translate-y-1/2' : 'bottom-full mb-2 left-1/2 -translate-x-1/2'}`}>
                            <p className="font-semibold mb-1 text-gray-200">AI Citation ({metric.label})</p>
                            <p className="text-gray-300 italic whitespace-pre-wrap break-words">"{citation}"</p>
                            {/* Little triangle arrow at bottom */}
                            <div className={`absolute border-4 border-transparent
                              ${isLast
                                ? 'left-full top-1/2 -translate-y-1/2 border-l-gray-900'
                                : 'top-full left-1/2 -translate-x-1/2 border-t-gray-900'}`}></div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>,
                ...(vendor.is_recommended && hoveredVendor === uniqueId ? [
                  <tr key={`${uniqueId}-reason`}>
                    <td colSpan={metrics.length + 2} className="px-4 py-3 bg-white">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900 mb-1">AI Recommended</p>
                            <p className="text-xs text-gray-600 leading-relaxed mb-2">
                              {vendor.recommendation_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ] : [])
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Email Side Panel */}
      {emailPanelVendor && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setEmailPanelVendor(null)}
          />
          <div className="absolute right-0 top-0 h-full w-[480px] bg-white shadow-2xl flex flex-col" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#eeeff1] bg-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Email Thread - {emailPanelVendor.vendor}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{emailPanelVendor.email}</p>
              </div>
              <button
                onClick={() => setEmailPanelVendor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Thread View */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Initial RFP Email */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">RK</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">Ram Krish</span>
                      <span className="text-xs text-gray-500">20 Jan 2026 10:30</span>
                    </div>
                    <p className="text-xs text-gray-500">to {emailPanelVendor.email}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <p className="text-sm text-gray-900 leading-relaxed mb-3">
                    <strong>Request for Quotation - {proposal.title}</strong>
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Dear {emailPanelVendor.vendor},<br /><br />
                    We are requesting quotations for {proposal.title}. Please review the attached specifications and provide your best quote including pricing, delivery timeline, and warranty terms.<br /><br />
                    Looking forward to your response.
                  </p>
                </div>
              </div>

              {/* Query from Vendor */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">
                      {emailPanelVendor.vendor.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{emailPanelVendor.vendor}</span>
                      <span className="text-xs text-gray-500">20 Jan 2026 14:15</span>
                    </div>
                    <p className="text-xs text-gray-500">to procurement@procureai.com</p>
                  </div>
                </div>
                <div className="ml-13">
                  <p className="text-sm text-gray-900 leading-relaxed mb-2">
                    <strong>Re: Request for Quotation - {proposal.title}</strong>
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Thank you for your inquiry. Could you please clarify the required certifications and confirm the delivery location? This will help us provide the most accurate quotation.
                  </p>
                </div>
              </div>

              {/* Response to Query */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">RK</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">Ram Krish</span>
                      <span className="text-xs text-gray-500">20 Jan 2026 15:45</span>
                    </div>
                    <p className="text-xs text-gray-500">to {emailPanelVendor.email}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    We require ISO 13485 and CE marking certifications. Delivery location is Mumbai. Please proceed with your quotation.
                  </p>
                </div>
              </div>

              {/* Quotation Response */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">
                      {emailPanelVendor.vendor.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{emailPanelVendor.vendor}</span>
                      <span className="text-xs text-gray-500">21 Jan 2026 11:20</span>
                    </div>
                    <p className="text-xs text-gray-500">to procurement@procureai.com</p>
                  </div>
                </div>
                <div className="ml-13 space-y-3">
                  <p className="text-sm text-gray-900 leading-relaxed mb-3">
                    <strong>Quotation Submitted - {proposal.title}</strong>
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Thank you for the clarification. Please find our detailed quotation below:
                  </p>

                  {/* Quotation Details */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Price:</span>
                      <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {emailPanelVendor.id === 1 ? '118,500' : emailPanelVendor.id === 2 ? '125,000' : '122,000'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Delivery:</span>
                      <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {emailPanelVendor.id === 1 ? '50' : emailPanelVendor.id === 2 ? '45' : '48'} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Warranty:</span>
                      <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        3 years
                      </span>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">Attachments:</p>
                    <button
                      onClick={() => toast.success('Downloading Quotation_2026.pdf...')}
                      className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Quotation_2026.pdf
                        </p>
                        <p className="text-xs text-gray-500">245 KB</p>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                    <button
                      onClick={() => toast.success('Downloading Product_Specifications.xlsx...')}
                      className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Product_Specifications.xlsx
                        </p>
                        <p className="text-xs text-gray-500">89 KB</p>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                    <button
                      onClick={() => toast.success('Downloading Compliance_Certificate.pdf...')}
                      className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Compliance_Certificate.pdf
                        </p>
                        <p className="text-xs text-gray-500">156 KB</p>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed">
                    All products come with ISO 13485 and CE marking certifications as requested. We look forward to working with you.
                  </p>
                </div>
              </div>
            </div>

            {/* Reply Section */}
            <div className="border-t border-[#eeeff1] bg-white">
              <div className="px-6 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">RK</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2">Reply to {emailPanelVendor.vendor}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <textarea
                    placeholder="Type your reply..."
                    className="w-full min-h-[120px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Button
                      variant="outline"
                      onClick={() => setEmailPanelVendor(null)}
                      className="text-sm"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        toast.success(`Reply sent to ${emailPanelVendor.vendor}`);
                        setEmailPanelVendor(null);
                      }}
                      className="bg-[#3B82F6] text-white hover:bg-[#2563EB] text-sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Negotiations Phase Component
function NegotiationsPhase({ proposal, readOnly, onDealClosure }: {
  proposal: any;
  readOnly?: boolean;
  onDealClosure?: (vendor: any, extractedData: any) => void;
}): any {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const [negotiationTab, setNegotiationTab] = useState<'email' | 'voice'>('email');
  const [dealClosureOpen, setDealClosureOpen] = useState(false);
  const [closureVendor, setClosureVendor] = useState<any>(null);
  const [isExtractingDeal, setIsExtractingDeal] = useState(false);

  const projectId = proposal?.id?.startsWith('RFP-')
    ? proposal.id.replace('RFP-', '')
    : proposal?.id;

  const fetchNegotiations = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/quotes/by-project/${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const negotiatingQuotes = data.filter((q: any) => q.status === 'negotiating');
        setQuotes(negotiatingQuotes);
        if (negotiatingQuotes.length > 0 && !selectedQuote) {
          handleSelectQuote(negotiatingQuotes[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNegotiations(); }, [projectId]);

  useEffect(() => {
    if (threadMessages.length > 0 && threadEndRef.current) {
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    }
  }, [threadMessages]);

  const fetchInsights = async (quote: any) => {
    if (!quote.thread_id) { setInsights(null); return; }
    setIsInsightsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        thread_id: quote.thread_id,
        vendor_name: quote.vendor_name || '',
        vendor_email: quote.sender_email || '',
        project_id: projectId || '',
      });
      const res = await fetch(`${API_BASE}/api/quotes/negotiation-insights?${params}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setInsights(await res.json());
    } catch (err) {
      console.error('Insights error:', err);
    } finally {
      setIsInsightsLoading(false);
    }
  };

  const handleSelectQuote = async (quote: any) => {
    setSelectedQuote(quote);
    setThreadMessages([]);
    setReplyText('');
    setInsights(null);

    if (!quote.thread_id) return;

    setIsThreadLoading(true);
    const token = localStorage.getItem('auth_token');
    try {
      const threadParams = new URLSearchParams({
        project_id: projectId || '',
        vendor_email: quote.sender_email || '',
      });
      const res = await fetch(`${API_BASE}/api/email/threads/${quote.thread_id}?${threadParams}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Thread fetch error:', err);
    } finally {
      setIsThreadLoading(false);
    }
    fetchInsights(quote);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedQuote?.thread_id) return;

    // Extract subject from latest vendor message for proper Gmail threading
    const lastVendorMsg = [...threadMessages].find((msg: any) => {
      const fromAddr = (msg.from ?? [])[0] ?? {};
      return fromAddr.email === selectedQuote.sender_email;
    });
    const targetMsg = lastVendorMsg || threadMessages[0];
    const subject = targetMsg?.subject || selectedQuote.email_subject || 'Re: Negotiation';

    setIsSending(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/api/email/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          thread_id: selectedQuote.thread_id,
          project_id: projectId,
          subject,
          to_email: selectedQuote.sender_email,
          to_name: selectedQuote.vendor_name || '',
          body: replyText,
        }),
      });

      if (res.ok) {
        toast.success(`Reply sent to ${selectedQuote.vendor_name}`);
        setReplyText('');
        handleSelectQuote(selectedQuote);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to send reply');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadAttachment = async (att: any, messageId: string) => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(
        `${API_BASE}/api/email/attachments/${att.id}?message_id=${messageId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to download ${att.filename}`);
    }
  };

  const sentimentConfig: Record<string, { color: string; bg: string; label: string }> = {
    cooperative: { color: 'text-green-700', bg: 'bg-green-50 ring-green-200', label: '😊 Cooperative' },
    neutral: { color: 'text-gray-700', bg: 'bg-gray-50 ring-gray-200', label: '😐 Neutral' },
    resistant: { color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200', label: '😤 Resistant' },
    aggressive: { color: 'text-red-700', bg: 'bg-red-50 ring-red-200', label: '🔥 Aggressive' },
  };

  const handleConfirmDealClosure = async () => {
    if (!closureVendor) return;
    setIsExtractingDeal(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/quotes/deal-closure-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          vendor_email: closureVendor.sender_email,
          thread_id: closureVendor.thread_id || '',
          vendor_name: closureVendor.vendor_name || '',
        }),
      });
      const data = res.ok ? await res.json() : {};

      // Mark the quote as accepted in the backend
      await fetch(`${API_BASE}/api/quotes/bulk-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          vendor_emails: [closureVendor.sender_email],
          status: 'accepted',
        }),
      });

      toast.success(`Deal closed with ${closureVendor.vendor_name || closureVendor.sender_email}`);
      setDealClosureOpen(false);
      onDealClosure?.(closureVendor, data);
    } catch {
      toast.error('Failed to extract deal data. Please try again.');
    } finally {
      setIsExtractingDeal(false);
    }
  };

  if (isLoading && quotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-500">Loading negotiations...</span>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Mail className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No vendors in the negotiation phase yet.</p>
        <p className="text-gray-400 text-xs mt-1">Move vendors from the AI Recommendation stage to start negotiating.</p>
      </div>
    );
  }

  return (
    <>
      {/* Sub-tabs + Deal Closure button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setNegotiationTab('email')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${negotiationTab === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Email Negotiations
          </button>
          <button
            onClick={() => setNegotiationTab('voice')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${negotiationTab === 'voice' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            AI Voice Negotiations
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded uppercase tracking-wider">
              Coming Soon
            </span>
          </button>
        </div>
        {readOnly ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Deal Closed</span>
          </div>
        ) : (
          <Button
            onClick={() => { setClosureVendor(selectedQuote || (quotes.length === 1 ? quotes[0] : null)); setDealClosureOpen(true); }}
            className="bg-green-600 text-white hover:bg-green-700 h-9 px-4 text-sm flex items-center gap-2 shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            Deal Closure
          </Button>
        )}
      </div>

      {negotiationTab === 'voice' ? (
        <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-blue-500" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">AI Voice Negotiations</h3>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full uppercase tracking-wider">Coming Soon</span>
          </div>
          <p className="text-sm text-gray-500 max-w-sm text-center leading-relaxed">
            Automated AI-powered voice calls to negotiate with vendors on your behalf — pricing, timelines, and terms, all handled by AI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5 h-[calc(100vh-330px)]">
          {/* Left Pane: Vendor List */}
          <div className="col-span-3 border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Negotiations</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{quotes.length} active</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {quotes.map((q: any) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuote(q)}
                  className={`w-full text-left px-4 py-3 transition-all ${selectedQuote?.id === q.id ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${selectedQuote?.id === q.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {(q.vendor_name || 'V').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{q.vendor_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{q.email_subject || q.sender_email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Pane */}
          <div className="col-span-9 border border-gray-200 rounded-xl bg-white flex flex-col overflow-hidden">
            {selectedQuote ? (
              <>
                {/* Compact Header */}
                <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-900">{selectedQuote.vendor_name}</h3>
                    <span className="text-[10px] text-gray-400">{selectedQuote.sender_email}</span>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">
                    Negotiating
                  </Badge>
                </div>

                {/* Collapsible AI Insights */}
                <div className="border-b border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => setInsightsOpen(!insightsOpen)}
                    className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.15em]">AI Negotiation Insights</span>
                      {isInsightsLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                    </div>
                    {insightsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {insightsOpen && (
                    <div className="px-5 pb-4">
                      {insights ? (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Price */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-100/60 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <IndianRupee className="w-3 h-3 text-green-600" />
                              <span className="text-[9px] font-bold text-green-800 uppercase tracking-wider">Price</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900">{insights.price}</p>
                          </div>
                          {/* Delivery */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/60 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span className="text-[9px] font-bold text-blue-800 uppercase tracking-wider">Delivery</span>
                            </div>
                            <p className="text-sm font-bold text-gray-900">{insights.delivery_timeline}</p>
                          </div>
                          {/* Sentiment */}
                          <div className={`rounded-lg p-3 ring-1 ${sentimentConfig[insights.sentiment]?.bg || sentimentConfig.neutral.bg}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <TrendingUp className="w-3 h-3 text-gray-600" />
                              <span className="text-[9px] font-bold text-gray-800 uppercase tracking-wider">Vendor Sentiment</span>
                            </div>
                            <p className={`text-sm font-bold ${sentimentConfig[insights.sentiment]?.color || 'text-gray-900'}`}>
                              {sentimentConfig[insights.sentiment]?.label || insights.sentiment}
                            </p>
                          </div>
                          {/* Latest Change */}
                          <div className="bg-gradient-to-br from-amber-50 to-yellow-50/50 border border-amber-100/60 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MessageSquare className="w-3 h-3 text-amber-600" />
                              <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider">Latest Update</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{insights.latest_change}</p>
                          </div>
                          {/* Key Terms */}
                          {insights.key_terms?.length > 0 && (
                            <div className="col-span-2 bg-gray-50/80 border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Shield className="w-3 h-3 text-gray-600" />
                                <span className="text-[9px] font-bold text-gray-800 uppercase tracking-wider">Key Terms</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {insights.key_terms.map((term: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-medium text-gray-700">
                                    {term}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Summary */}
                          <div className="col-span-2 bg-blue-50/50 border border-blue-100/50 rounded-lg p-3">
                            <p className="text-xs text-gray-700 leading-relaxed italic">&ldquo;{insights.summary}&rdquo;</p>
                          </div>
                        </div>
                      ) : isInsightsLoading ? (
                        <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Analyzing negotiation thread...</span>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-400">Select a vendor with an active thread to see AI insights.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Thread Area — Scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-5 bg-gray-50/20">
                  {isThreadLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                      <span className="text-xs">Loading conversation...</span>
                    </div>
                  ) : threadMessages.length > 0 ? (
                    <div className="space-y-5 max-w-3xl mx-auto">
                      {[...threadMessages].reverse().map((msg: any, idx: number) => {
                        const fromAddr = (msg.from ?? [])[0] ?? {};
                        const isVendor = fromAddr.email === selectedQuote.sender_email;
                        const initials = (fromAddr.name || fromAddr.email || '??').substring(0, 2).toUpperCase();
                        const dateStr = new Date(msg.date * 1000).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });

                        return (
                          <div key={msg.id} className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold shadow-sm ${isVendor ? 'bg-white border border-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}>
                              {initials}
                            </div>
                            <div className={`flex-1 min-w-0 border rounded-xl p-4 shadow-sm ${isVendor ? 'bg-white border-gray-100' : 'bg-blue-50/40 border-blue-100'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900">{fromAddr.name || fromAddr.email}</span>
                                  {isVendor && <span className="text-[9px] text-gray-400 font-bold uppercase px-1 py-0.5 bg-gray-50 rounded">Vendor</span>}
                                </div>
                                <span className="text-[10px] text-gray-400">{dateStr}</span>
                              </div>
                              {msg.subject && (
                                <h4 className="text-xs font-semibold text-gray-800 mb-2">{msg.subject}</h4>
                              )}
                              <div
                                className="text-sm text-gray-700 leading-relaxed email-body-content overflow-auto max-h-[300px]"
                                dangerouslySetInnerHTML={{ __html: msg.body || '<em>No content</em>' }}
                              />
                              {/* Attachments with download */}
                              {msg.attachments?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                                  {msg.attachments.map((att: any) => (
                                    <button
                                      key={att.id}
                                      onClick={() => handleDownloadAttachment(att, msg.id)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group/att text-left"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-gray-400 group-hover/att:text-blue-500 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-gray-700 truncate">{att.filename}</p>
                                        {att.size && <p className="text-[9px] text-gray-400">{att.size > 1024 * 1024 ? `${(att.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(att.size / 1024)} KB`}</p>}
                                      </div>
                                      <Download className="w-3 h-3 text-gray-300 opacity-0 group-hover/att:opacity-100 transition-opacity" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={threadEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center opacity-50">
                      <Mail className="w-8 h-8 text-gray-300 mb-3" />
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">No messages yet</h4>
                      <p className="text-xs text-gray-500 max-w-[200px]">Send a negotiation message to start the thread.</p>
                    </div>
                  )}
                </div>

                {/* Reply Area — Fixed Bottom */}
                {
                  readOnly ? (
                    <div className="px-5 py-4 border-t border-gray-200 bg-gray-50/50 flex-shrink-0">
                      <div className="flex items-center justify-center gap-2 py-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">This negotiation is closed. No further replies can be sent.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-4 border-t border-gray-200 bg-white flex-shrink-0">
                      <div className="max-w-3xl mx-auto">
                        <textarea
                          placeholder={`Reply to ${selectedQuote.vendor_name}…`}
                          value={replyText}
                          onChange={(e: any) => setReplyText(e.target.value)}
                          disabled={isSending || !selectedQuote.thread_id}
                          className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none placeholder:text-gray-400 disabled:bg-gray-50"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[9px] text-gray-400 italic">Insights update automatically after each reply.</p>
                          <Button
                            onClick={handleSendReply}
                            disabled={isSending || !replyText.trim() || !selectedQuote.thread_id}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-5 h-9 text-xs shadow-sm"
                          >
                            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                            {isSending ? 'Sending…' : 'Send'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30">
                <Users className="w-10 h-10 text-gray-200 mb-3" />
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select a Vendor</h4>
                <p className="text-xs text-gray-500 max-w-[220px] text-center">Choose a vendor from the list to view negotiation details and communicate.</p>
              </div>
            )
            }
          </div >
        </div >
      )}

      {/* Deal Closure Modal */}
      {
        dealClosureOpen && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => !isExtractingDeal && setDealClosureOpen(false)} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ zIndex: 1 }}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Finalise Deal Closure</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Select the vendor you want to award this contract to</p>
                  </div>
                </div>
                {!isExtractingDeal && (
                  <button onClick={() => setDealClosureOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Vendor List */}
              <div className="px-6 py-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
                {quotes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No vendors in negotiation phase.</p>
                ) : (
                  quotes.map((q: any) => (
                    <button
                      key={q.id}
                      onClick={() => setClosureVendor(q)}
                      disabled={isExtractingDeal}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${closureVendor?.id === q.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${closureVendor?.id === q.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {(q.vendor_name || 'V').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{q.vendor_name}</p>
                        <p className="text-xs text-gray-400">{q.sender_email}</p>
                      </div>
                      {q.price != null && (
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-0.5">
                          {(q.negotiated_price || q.price).toLocaleString('en-IN', {
                            style: 'currency',
                            currency: q.currency || 'INR',
                            maximumFractionDigits: 0
                          })}
                        </span>
                      )}
                      {closureVendor?.id === q.id && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              {/* Info note */}
              <div className="mx-6 mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-bold">Note:</span> AI will extract final deal terms from all negotiation emails using Nova. All other tabs will become read-only after closure.
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDealClosureOpen(false)}
                  disabled={isExtractingDeal}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDealClosure}
                  disabled={!closureVendor || isExtractingDeal}
                  className="bg-green-600 text-white hover:bg-green-700 text-sm flex items-center gap-2 min-w-[160px]"
                >
                  {isExtractingDeal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting deal terms…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Deal Closure
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}

// Closure Phase Component is now imported from ClosurePhaseNew.tsx