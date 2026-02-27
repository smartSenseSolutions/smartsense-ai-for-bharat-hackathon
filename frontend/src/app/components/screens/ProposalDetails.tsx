import { ArrowLeft, Users, MessageSquare, FileText, Phone, CheckCircle, Send, Languages, TrendingUp, Calendar, DollarSign, Clock, Mail, Sparkles, MapPin, Star, Award, Briefcase, Shield, X, IndianRupee, FileSpreadsheet, Download, Globe, ExternalLink, Search } from 'lucide-react';
import { useState, Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { QueriesPhaseGmail } from '@/app/components/screens/QueriesPhaseGmail';
import { QuotationsPhaseGmail } from '@/app/components/screens/QuotationsPhaseGmail';
import { ClosurePhase } from '@/app/components/screens/ClosurePhaseNew';


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

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

interface ProposalDetailsProps {
  proposal: any;
  onBack: () => void;
  onNavigate: (screen: any) => void;
  onStatusChange?: (newStatus: string) => void;
}

export function ProposalDetails({ proposal, onBack, onNavigate, onStatusChange }: ProposalDetailsProps) {
  const [currentPhase, setCurrentPhase] = useState<'invite' | 'queries' | 'quotations' | 'ai-recommendation' | 'negotiations' | 'closure'>('invite');

  // Track unread messages for Queries phase
  const [unreadQueriesCount, setUnreadQueriesCount] = useState(2);

  const phases = [
    { id: 'invite', label: 'Invite', icon: Users },
    { id: 'queries', label: 'Queries', icon: MessageSquare },
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

            return (
              <div key={phase.id} className="flex items-center">
                <button
                  onClick={() => setCurrentPhase(phase.id as any)}
                  className="flex flex-col items-center gap-1.5 relative"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-10 ${isActive
                    ? 'bg-[#3B82F6] text-white'
                    : isCompleted
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-white border border-gray-200 text-gray-400'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />

                    {/* Red notification badge for Queries phase with unread messages */}
                    {phase.id === 'queries' && unreadQueriesCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-[9px] font-semibold text-white">{unreadQueriesCount}</span>
                      </div>
                    )}
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
                  <div className={`w-16 h-px mx-2 transition-all self-start mt-4 ${index < activeIndex
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
          {currentPhase === 'invite' && <InvitePhase proposal={proposal} onStatusChange={onStatusChange} />}
          {currentPhase === 'queries' && <QueriesPhaseGmail proposal={proposal} />}
          {currentPhase === 'quotations' && <QuotationsPhaseGmail proposal={proposal} />}
          {currentPhase === 'ai-recommendation' && <AIRecommendationPhase proposal={proposal} />}
          {currentPhase === 'negotiations' && <NegotiationsPhase proposal={proposal} />}
          {currentPhase === 'closure' && <ClosurePhase proposal={proposal} />}
        </div>
      </div>
    </div>
  );
}

// Invite Phase Component
function InvitePhase({ proposal, onStatusChange }: { proposal: any, onStatusChange?: (status: string) => void }) {
  const [activeTab, setActiveTab] = useState<'search' | 'invited'>('search');
  const [vendors, setVendors] = useState([
    { id: '1', name: 'TechDistributor Inc.', email: 'contact@techdist.com', category: 'Medical Devices', status: 'invited', invitedAt: '21 Jan 2026' },
    { id: '2', name: 'Global Electronics Supply', email: 'info@globalsupply.com', category: 'Laboratory Equipment', status: 'invited', invitedAt: '21 Jan 2026' },
    { id: '3', name: 'Enterprise Solutions Co.', email: 'sales@enterprise.com', category: 'Pharmaceutical Supplies', status: 'invited', invitedAt: '21 Jan 2026' },
    { id: '4', name: 'MedSupply International', email: 'orders@medsupply.com', category: 'Diagnostic Tools', status: 'invited', invitedAt: '21 Jan 2026' },
    { id: '5', name: 'Healthcare Distributors', email: 'info@healthdist.com', category: 'Medical Consumables', status: 'invited', invitedAt: '21 Jan 2026' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [invitedVendors, setInvitedVendors] = useState<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedVendorForPanel, setSelectedVendorForPanel] = useState<any>(null);

  const [internalResults, setInternalResults] = useState<AIVendorResult[]>([]);
  const [externalResults, setExternalResults] = useState<AIVendorResult[]>([]);
  const [isInternalLoading, setIsInternalLoading] = useState(false);
  const [isExternalLoading, setIsExternalLoading] = useState(false);

  useEffect(() => {
    if (proposal && proposal.status === 'published' && proposal.title) {
       fireSearch(proposal.title);
    }
  }, [proposal]);

  const fireSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSubmittedQuery(trimmed);
    setSearchQuery(trimmed);
    setInternalResults([]);
    setExternalResults([]);
    setIsInternalLoading(true);
    setIsExternalLoading(true);

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
    category: r.products.length > 0 ? r.products[0] : 'General Supplies',
    location: r.location || 'Unknown',
    yearsOfExperience: r.estd ? new Date().getFullYear() - r.estd : 5,
    rating: (r.final_score * 5).toFixed(1),
    certificates: r.certificates,
    certificate_details: r.certificate_details,
    trustScore: Math.round(r.final_score * 100),
    contact_email: r.contact_email,
    mobile: r.mobile,
    website: r.website,
    aiTags: [r.source === 'internal' ? 'Verified Partner' : 'AI Discovered'],
    description: r.description
  });

  const handleCardClick = (vendor: AIVendorResult, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-area') || target.closest('a')) {
      return;
    }
    setSelectedVendorForPanel(toDetailVendor(vendor));
    setSidePanelOpen(true);
  };

  const handleSendInvites = () => {
    setInvitedVendors(prev => [...prev, ...selectedVendors]);
    toast.success('Invites sent to ' + selectedVendors.length + ' vendor(s)');
    if (proposal.status !== 'in-progress' && proposal.status !== 'completed') {
      onStatusChange?.('in-progress');
    }
    setSelectedVendors([]);
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
          Invited Vendors ({vendors.length + invitedVendors.length})
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
              <Button onClick={handleSendInvites} className="bg-[#3B82F6] hover:bg-[#2563EB] h-9 px-4 text-sm">
                <Send className="w-4 h-4 mr-2" />
                Send Invite{selectedVendors.length !== 1 ? 's' : ''}
              </Button>
            </div>
          )}

          <div className="overflow-y-auto hide-scrollbar pb-10" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {submittedQuery && (
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{submittedQuery}</h3>
                <p className="text-sm text-gray-600">{internalResults.length + externalResults.length} vendor{internalResults.length + externalResults.length !== 1 ? 's' : ''} found</p>
              </div>
            )}

            {isInternalLoading && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white border border-[#eeeff1] rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!isInternalLoading && internalResults.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-700">Verified Vendors</h3>
                  <span className="text-xs text-gray-400">({internalResults.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {internalResults.map(renderVendorCard)}
                </div>
              </div>
            )}

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
                      Gemini is researching the web...
                    </div>
                  )}
                </div>
                
                {isExternalLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-white border border-[#eeeff1] rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {externalResults.map(renderVendorCard)}
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
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Vendor Name</th>
                  <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-600 px-4 py-3">Invited At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><span className="text-sm font-medium text-gray-900">{vendor.name}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{vendor.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{vendor.category}</span></td>
                    <td className="px-4 py-3"><Badge className="bg-blue-50 text-[#3B82F6] border-0 text-xs px-2 py-0.5">Invited</Badge></td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{vendor.invitedAt}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sidePanelOpen && selectedVendorForPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setSidePanelOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-lg z-[70] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#eeeff1] px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">{selectedVendorForPanel.name}</h2>
                <button onClick={() => setSidePanelOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedVendorForPanel.aiTags && selectedVendorForPanel.aiTags.length > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-0">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    {selectedVendorForPanel.aiTags[0]}
                  </Badge>
                )}
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Overview</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2"><span className="text-xs text-gray-500 min-w-[100px]">Category</span><span className="text-xs text-gray-900">{selectedVendorForPanel.category}</span></div>
                  <div className="flex items-start gap-2"><span className="text-xs text-gray-500 min-w-[100px]">Location</span><span className="text-xs text-gray-900">{selectedVendorForPanel.location}</span></div>
                  <div className="flex items-start gap-2"><span className="text-xs text-gray-500 min-w-[100px]">Experience</span><span className="text-xs text-gray-900">{selectedVendorForPanel.yearsOfExperience} years in business</span></div>
                  <div className="flex items-start gap-2"><span className="text-xs text-gray-500 min-w-[100px]">Rating</span><span className="text-xs text-gray-900">{selectedVendorForPanel.rating} ⭐</span></div>
                </div>
              </div>

              {selectedVendorForPanel.certificates && selectedVendorForPanel.certificates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendorForPanel.certificates.map((cert: string, idx: number) => (
                      <Badge key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-0">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Products & Services</h3>
                <p className="text-xs text-gray-600 mb-3">{selectedVendorForPanel.description || 'Specialized in ' + selectedVendorForPanel.category.toLowerCase() + ' with a focus on quality and reliability.'}</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-900">High-quality medical-grade products</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-900">FDA approved and certified</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-900">Fast delivery across India</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-900">24/7 customer support</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-900">{selectedVendorForPanel.contact_email || `contact@${selectedVendorForPanel.name.toLowerCase().replace(/\s+/g, '')}.com`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-900">{selectedVendorForPanel.mobile || '+91 98765 43210'}</span>
                  </div>
                  {selectedVendorForPanel.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a href={selectedVendorForPanel.website.startsWith('http') ? selectedVendorForPanel.website : `https://${selectedVendorForPanel.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        {selectedVendorForPanel.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-900">{selectedVendorForPanel.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#eeeff1] px-6 py-4">
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
        </>
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
function AIRecommendationPhase({ proposal }: { proposal: any }) {
  const [hoveredVendor, setHoveredVendor] = useState<number | null>(null);
  const [emailPanelVendor, setEmailPanelVendor] = useState<any>(null);

  const vendors = [
    {
      id: 1,
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      priceScore: 95,
      deliveryScore: 85,
      qualityScore: 92,
      warrantyScore: 90,
      complianceScore: 88,
      overallScore: 95,
      isRecommended: true,
      recommendationReason: 'This vendor demonstrates exceptional performance across all key metrics with the highest price competitiveness (95/100) and outstanding quality standards (92/100). Their strong compliance certifications (88/100) and reliable delivery timeline (85/100) make them the most balanced and trustworthy choice for this procurement project.',
    },
    {
      id: 2,
      vendor: 'TechDistributor Inc.',
      email: 'contact@techdist.com',
      priceScore: 88,
      deliveryScore: 92,
      qualityScore: 85,
      warrantyScore: 90,
      complianceScore: 85,
      overallScore: 88,
      isRecommended: true,
      recommendationReason: 'Excellent delivery performance (92/100) combined with strong quality standards (85/100) and comprehensive warranty terms (90/100). This vendor offers reliable service with competitive pricing (88/100) making them a solid choice for time-sensitive projects.',
    },
    {
      id: 3,
      vendor: 'Enterprise Solutions Co.',
      email: 'sales@enterprise.com',
      priceScore: 75,
      deliveryScore: 95,
      qualityScore: 78,
      warrantyScore: 70,
      complianceScore: 65,
      overallScore: 75,
      isRecommended: false,
    },
    {
      id: 4,
      vendor: 'MedSupply International',
      email: 'orders@medsupply.com',
      priceScore: 82,
      deliveryScore: 78,
      qualityScore: 88,
      warrantyScore: 85,
      complianceScore: 90,
      overallScore: 84,
      isRecommended: false,
    },
    {
      id: 5,
      vendor: 'Healthcare Distributors',
      email: 'info@healthdist.com',
      priceScore: 78,
      deliveryScore: 88,
      qualityScore: 72,
      warrantyScore: 75,
      complianceScore: 68,
      overallScore: 76,
      isRecommended: false,
    },
    {
      id: 6,
      vendor: 'BioMedical Supplies Ltd.',
      email: 'procurement@biomedical.com',
      priceScore: 85,
      deliveryScore: 82,
      qualityScore: 86,
      warrantyScore: 88,
      complianceScore: 85,
      overallScore: 85,
      isRecommended: true,
      recommendationReason: 'Strong overall performance with excellent quality standards (86/100) and warranty coverage (88/100). Their compliance certifications (85/100) and balanced pricing (85/100) make them ideal for regulated healthcare procurement.',
    },
    {
      id: 7,
      vendor: 'Budget Medical Co.',
      email: 'sales@budgetmedical.com',
      priceScore: 92,
      deliveryScore: 45,
      qualityScore: 58,
      warrantyScore: 48,
      complianceScore: 52,
      overallScore: 59,
      isRecommended: false,
    },
  ];

  const handleSendEmail = (vendor: any) => {
    setEmailPanelVendor(vendor);
  };

  const bestVendor = vendors.find(v => v.isRecommended);

  const metrics = [
    { id: 'price', label: 'Price Competitiveness', field: 'priceScore' },
    { id: 'delivery', label: 'Delivery Timeline', field: 'deliveryScore' },
    { id: 'quality', label: 'Quality Standards', field: 'qualityScore' },
    { id: 'warranty', label: 'Warranty Terms', field: 'warrantyScore' },
    { id: 'compliance', label: 'Compliance & Certifications', field: 'complianceScore' },
    { id: 'overall', label: 'Overall AI Score', field: 'overallScore' },
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
          <p className="text-sm text-gray-500">AI-powered analysis across {vendors.length} vendor quotations</p>
        </div>
      </div>

      {/* AI Scoring Matrix Table (Transposed) */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-medium text-gray-600 px-4 py-3 w-64">Vendor</th>
              {metrics.map((metric) => (
                <th key={metric.id} className="text-center text-xs font-medium text-gray-600 px-4 py-3">
                  {metric.label}
                </th>
              ))}
              <th className="text-center text-xs font-medium text-gray-600 px-4 py-3 w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendors.flatMap((vendor) => [
              <tr
                key={vendor.id}
                className={`${vendor.isRecommended ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'} transition-colors`}
                onMouseEnter={() => vendor.isRecommended && setHoveredVendor(vendor.id)}
                onMouseLeave={() => setHoveredVendor(null)}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{vendor.vendor}</span>
                      {vendor.isRecommended && (
                        <Badge className="text-xs px-1.5 py-0 bg-green-600 text-white border-0">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{vendor.email}</span>
                  </div>
                </td>
                {metrics.map((metric) => {
                  const score = vendor[metric.field as keyof typeof vendor] as number;
                  return (
                    <td key={metric.id} className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleSendEmail(vendor)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>,
              ...(vendor.isRecommended && hoveredVendor === vendor.id ? [
                <tr key={`${vendor.id}-reason`}>
                  <td colSpan={metrics.length + 2} className="px-4 py-3 bg-white">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900 mb-1">AI Recommended</p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {vendor.recommendationReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ] : [])
            ])}
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
function NegotiationsPhase({ proposal }: { proposal: any }) {
  const [activeTab, setActiveTab] = useState<'voice' | 'email'>('voice');

  const voiceCalls = [
    {
      id: 1,
      vendor: 'Global Electronics Supply',
      callDate: '22 Jan 2026 10:00',
      duration: '35 min',
      participants: 3,
      keyPoints: ['7% discount negotiated', '50-day delivery confirmed', '3-year warranty included'],
      outcome: 'In Progress',
      status: 'active',
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Sarah, thank you for joining this negotiation call.' },
        { speaker: 'Sarah Chen', time: '00:15', text: 'Good morning, happy to discuss our proposal.' },
        { speaker: 'Ram Krish', time: '00:25', text: 'We appreciate your quote of $118,500. Can we discuss the delivery timeline?' },
        { speaker: 'Sarah Chen', time: '00:48', text: 'Certainly. Our standard delivery is 60 days, but we can expedite to 50 days for this order.' },
        { speaker: 'Sandeep Kumar', time: '01:15', text: 'That works for our timeline. What about the pricing? Is there any flexibility on the quoted amount?' },
        { speaker: 'Sarah Chen', time: '01:42', text: 'Given the volume you are ordering, we can offer a 7% discount, bringing the total to approximately $110,205.' },
        { speaker: 'AI Agent', time: '02:08', text: 'That is a competitive offer. Can you confirm the warranty terms included in this pricing?' },
        { speaker: 'Sarah Chen', time: '02:30', text: 'Yes, we include a comprehensive 3-year warranty covering all manufacturing defects and performance issues.' },
        { speaker: 'Ram Krish', time: '02:58', text: 'Excellent. What are the payment terms for this order?' },
        { speaker: 'Sarah Chen', time: '03:20', text: 'We typically work with 30% upfront, 40% on delivery, and 30% after installation and acceptance.' },
        { speaker: 'Sandeep Kumar', time: '03:48', text: 'That payment structure is acceptable. Can we discuss the technical specifications to ensure compatibility?' },
        { speaker: 'Sarah Chen', time: '04:15', text: 'Absolutely. All our products meet ISO 13485 certification and FDA approval standards.' },
        { speaker: 'AI Agent', time: '04:42', text: 'Perfect. What about support and maintenance after installation?' },
        { speaker: 'Sarah Chen', time: '05:05', text: 'We provide 24/7 technical support and quarterly maintenance visits as part of the warranty package.' },
        { speaker: 'Ram Krish', time: '05:35', text: 'That sounds comprehensive. Can we get this agreement documented by end of week?' },
        { speaker: 'Sarah Chen', time: '05:58', text: 'Yes, I will have our legal team prepare the contract and send it over by Friday.' },
        { speaker: 'Sandeep Kumar', time: '06:22', text: 'Great. One more thing - do you offer training for our staff on using these products?' },
        { speaker: 'Sarah Chen', time: '06:45', text: 'Yes, we include a 2-day on-site training session as part of the installation package.' },
        { speaker: 'AI Agent', time: '07:10', text: 'Excellent. I think we have covered all the key points. Ram, Sandeep, any other questions?' },
        { speaker: 'Ram Krish', time: '07:28', text: 'No, I think we are good. Thank you Sarah for the productive discussion.' },
        { speaker: 'Sandeep Kumar', time: '07:42', text: 'Agreed. Looking forward to receiving the contract.' },
        { speaker: 'Sarah Chen', time: '07:55', text: 'Thank you both. I will send the contract by Friday and follow up early next week.' },
        { speaker: 'AI Agent', time: '08:12', text: 'Thank you everyone. I will send a summary of this call to all participants.' },
      ],
    },
    {
      id: 2,
      vendor: 'TechDistributor Inc.',
      callDate: '22 Jan 2026 14:00',
      duration: '28 min',
      participants: 3,
      keyPoints: ['Price match offered', 'Exclusive partnership discussed', 'Follow-up scheduled'],
      outcome: 'Completed',
      status: 'completed',
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Mike, thank you for joining.' },
        { speaker: 'Mike Johnson', time: '00:12', text: 'Ready to discuss our proposal.' },
        { speaker: 'Ram Krish', time: '00:28', text: 'We appreciate your competitive pricing. Can we discuss the exclusive partnership terms?' },
        { speaker: 'Mike Johnson', time: '00:52', text: 'Absolutely. We are interested in a long-term partnership with preferred pricing.' },
        { speaker: 'Sandeep Kumar', time: '01:18', text: 'What kind of price match guarantee can you offer?' },
        { speaker: 'Mike Johnson', time: '01:45', text: 'We can match any competitor pricing within 24 hours if you provide documentation.' },
        { speaker: 'AI Agent', time: '02:10', text: 'That is a strong commitment. What about minimum order quantities?' },
        { speaker: 'Mike Johnson', time: '02:35', text: 'For exclusive partners, we can reduce MOQ by 30%.' },
        { speaker: 'Ram Krish', time: '03:02', text: 'Excellent. When can we schedule a follow-up to finalize the agreement?' },
        { speaker: 'Mike Johnson', time: '03:28', text: 'How about next Wednesday at 2 PM?' },
        { speaker: 'Sandeep Kumar', time: '03:48', text: 'That works for us. We will prepare the partnership framework.' },
        { speaker: 'AI Agent', time: '04:12', text: 'Perfect. I will send calendar invites to everyone.' },
      ],
    },
    {
      id: 3,
      vendor: 'MedSupply International',
      callDate: '21 Jan 2026 15:30',
      duration: '42 min',
      participants: 4,
      keyPoints: ['Bulk order pricing discussed', 'Monthly payment plan agreed', 'Extended warranty negotiated'],
      outcome: 'Completed',
      status: 'completed',
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon, thank you for joining this negotiation session.' },
        { speaker: 'David Martinez', time: '00:18', text: 'Thank you for having us. We are excited to discuss the proposal.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'We would like to explore bulk order pricing options.' },
        { speaker: 'David Martinez', time: '01:02', text: 'For bulk orders over 100,000 units, we can offer tiered discounts up to 15%.' },
        { speaker: 'Sandeep Kumar', time: '01:30', text: 'That is attractive. Can we structure this with monthly payment plans?' },
        { speaker: 'David Martinez', time: '01:58', text: 'Yes, we can arrange net-60 terms with monthly installments.' },
        { speaker: 'AI Agent', time: '02:25', text: 'What about the warranty coverage for bulk orders?' },
        { speaker: 'David Martinez', time: '02:50', text: 'We can extend the warranty to 5 years for commitments over 200,000 units annually.' },
        { speaker: 'Ram Krish', time: '03:18', text: 'That is very competitive. Can we get this in writing by tomorrow?' },
        { speaker: 'David Martinez', time: '03:42', text: 'Absolutely. I will have our team prepare the formal proposal.' },
        { speaker: 'Sandeep Kumar', time: '04:08', text: 'Great. We will review and respond within 48 hours.' },
        { speaker: 'AI Agent', time: '04:35', text: 'Thank you David. Looking forward to the proposal.' },
      ],
    },
    {
      id: 4,
      vendor: 'BioMedical Supplies Ltd.',
      callDate: '21 Jan 2026 11:00',
      duration: '31 min',
      participants: 2,
      keyPoints: ['Quality certification confirmed', 'Delivery schedule aligned', 'Support terms clarified'],
      outcome: 'In Progress',
      status: 'active',
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning, welcome to the negotiation call.' },
        { speaker: 'Emma Wilson', time: '00:12', text: 'Good morning, ready to finalize the terms.' },
        { speaker: 'Ram Krish', time: '00:28', text: 'Can we discuss the quality certification requirements?' },
        { speaker: 'Emma Wilson', time: '00:55', text: 'All our products have ISO 13485 and CE marking certifications.' },
        { speaker: 'Sandeep Kumar', time: '01:22', text: 'Perfect. What is your delivery schedule for certified products?' },
        { speaker: 'Emma Wilson', time: '01:48', text: 'We maintain stock of certified products with 3-week delivery guarantee.' },
        { speaker: 'AI Agent', time: '02:15', text: 'Excellent. Can you provide ongoing technical support?' },
        { speaker: 'Emma Wilson', time: '02:40', text: 'Yes, we offer 24/7 support with dedicated account manager.' },
        { speaker: 'Ram Krish', time: '03:08', text: 'That meets our requirements. Let us proceed with the contract.' },
        { speaker: 'Emma Wilson', time: '03:32', text: 'Wonderful. I will send the contract draft by end of day.' },
        { speaker: 'AI Agent', time: '03:55', text: 'Thank you Emma. We will review and get back to you.' },
      ],
    },
    {
      id: 5,
      vendor: 'Healthcare Distributors',
      callDate: '20 Jan 2026 16:00',
      duration: '25 min',
      participants: 3,
      keyPoints: ['Regional distribution discussed', 'Pricing structure finalized', 'Contract duration agreed'],
      outcome: 'Completed',
      status: 'completed',
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon everyone, thank you for joining.' },
        { speaker: 'Robert Chen', time: '00:10', text: 'Happy to be here. Let us discuss the distribution terms.' },
        { speaker: 'Ram Krish', time: '00:22', text: 'We need regional coverage across three states.' },
        { speaker: 'Robert Chen', time: '00:48', text: 'We have established distribution networks in all major cities across those regions.' },
        { speaker: 'Sandeep Kumar', time: '01:15', text: 'What is the pricing structure for regional distribution?' },
        { speaker: 'Robert Chen', time: '01:42', text: 'We offer flat-rate pricing with volume discounts. No additional logistics fees.' },
        { speaker: 'AI Agent', time: '02:08', text: 'How long is the typical contract duration?' },
        { speaker: 'Robert Chen', time: '02:32', text: 'Standard contracts are 2 years with option to renew annually thereafter.' },
        { speaker: 'Ram Krish', time: '02:58', text: 'That works well. Can we finalize this agreement this week?' },
        { speaker: 'Robert Chen', time: '03:22', text: 'Yes, I will prepare all documents and send them over by Thursday.' },
        { speaker: 'Sandeep Kumar', time: '03:45', text: 'Perfect. We are looking forward to this partnership.' },
        { speaker: 'AI Agent', time: '04:08', text: 'Thank you Robert. Talk to you soon.' },
      ],
    },
  ];

  const emailThreads = [
    {
      id: 1,
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      subject: 'Price Negotiation Discussion',
      lastMessage: '22 Jan 2026 16:30',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@globalsupply.com',
          timestamp: '22 Jan 2026 11:00',
          message: 'Thank you for your quotation of $118,500. We would like to discuss the possibility of a volume discount given our order size.',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@globalsupply.com',
          fromName: 'Global Electronics Supply',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 14:20',
          message: 'We appreciate your interest. We can offer a 5% discount bringing the total to $112,575 for orders above 50,000 units.',
          type: 'received',
        },
        {
          id: 3,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@globalsupply.com',
          timestamp: '22 Jan 2026 16:30',
          message: 'That sounds reasonable. Can we also discuss the delivery timeline? Our target is 45 days.',
          type: 'sent',
        },
      ],
    },
    {
      id: 2,
      vendor: 'TechDistributor Inc.',
      email: 'contact@techdist.com',
      subject: 'Contract Terms Review',
      lastMessage: '21 Jan 2026 09:45',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@techdist.com',
          timestamp: '21 Jan 2026 08:00',
          message: 'We have reviewed your proposal. Could you provide more details on the warranty terms?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 09:45',
          message: 'Certainly. We offer a comprehensive 3-year warranty with 24/7 support and free replacements for manufacturing defects.',
          type: 'received',
        },
      ],
    },
    {
      id: 3,
      vendor: 'MedSupply International',
      email: 'orders@medsupply.com',
      subject: 'Bulk Order Discount Request',
      lastMessage: '21 Jan 2026 15:20',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@medsupply.com',
          timestamp: '21 Jan 2026 10:30',
          message: 'We are interested in placing a bulk order of 75,000 units. Can you offer a tiered pricing structure?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'orders@medsupply.com',
          fromName: 'MedSupply International',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 13:15',
          message: 'Yes, we can offer 8% discount for 75,000+ units. This brings your total to ₹95,40,000 with free shipping across India.',
          type: 'received',
        },
        {
          id: 3,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@medsupply.com',
          timestamp: '21 Jan 2026 15:20',
          message: 'Great! Can we also negotiate the payment terms to Net 45 instead of Net 30?',
          type: 'sent',
        },
      ],
    },
    {
      id: 4,
      vendor: 'BioMed Supplies',
      email: 'contact@biomedsupplies.com',
      subject: 'Delivery Schedule Adjustment',
      lastMessage: '20 Jan 2026 17:00',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@biomedsupplies.com',
          timestamp: '20 Jan 2026 14:00',
          message: 'We need to adjust the delivery schedule to accommodate our warehouse renovation. Can we push it back by 2 weeks?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'contact@biomedsupplies.com',
          fromName: 'BioMed Supplies',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 17:00',
          message: 'We can accommodate the 2-week delay without any additional charges. Updated delivery date will be 15 Feb 2026.',
          type: 'received',
        },
      ],
    },
    {
      id: 5,
      vendor: 'HealthCare Innovations',
      email: 'sales@healthcareinnovations.com',
      subject: 'Quality Certification Discussion',
      lastMessage: '20 Jan 2026 12:30',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@healthcareinnovations.com',
          timestamp: '20 Jan 2026 09:00',
          message: 'Can you provide updated ISO 13485 and CE marking certificates for the current product batch?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@healthcareinnovations.com',
          fromName: 'HealthCare Innovations',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 12:30',
          message: 'Absolutely. I will send the updated certificates by end of day. All certifications are valid until Dec 2027.',
          type: 'received',
        },
      ],
    },
    {
      id: 6,
      vendor: 'Surgical Equipment Ltd',
      email: 'info@surgicalequip.com',
      subject: 'Exclusive Partnership Terms',
      lastMessage: '19 Jan 2026 16:45',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@surgicalequip.com',
          timestamp: '19 Jan 2026 11:00',
          message: 'We are considering an exclusive 2-year partnership. What additional benefits can you offer?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@surgicalequip.com',
          fromName: 'Surgical Equipment Ltd',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 14:20',
          message: 'For exclusive partnership, we offer 12% discount, priority shipping, dedicated account manager, and quarterly business reviews.',
          type: 'received',
        },
        {
          id: 3,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@surgicalequip.com',
          timestamp: '19 Jan 2026 16:45',
          message: 'Perfect. Let us proceed with drafting the exclusive partnership agreement.',
          type: 'sent',
        },
      ],
    },
    {
      id: 7,
      vendor: 'Medical Devices Corp',
      email: 'info@meddevicescorp.com',
      subject: 'Shipping Cost Negotiation',
      lastMessage: '19 Jan 2026 11:15',
      status: 'active',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@meddevicescorp.com',
          timestamp: '19 Jan 2026 08:30',
          message: 'The shipping costs seem high for Mumbai to Delhi route. Can we negotiate this down?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@meddevicescorp.com',
          fromName: 'Medical Devices Corp',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 11:15',
          message: 'We can reduce shipping by 25% if you consolidate orders to bi-weekly instead of weekly shipments.',
          type: 'received',
        },
      ],
    },
    {
      id: 8,
      vendor: 'PharmaSupply Global',
      email: 'orders@pharmasupplyglobal.com',
      subject: 'Extended Payment Terms',
      lastMessage: '18 Jan 2026 15:30',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@pharmasupplyglobal.com',
          timestamp: '18 Jan 2026 10:00',
          message: 'Given our long-standing relationship, can we extend payment terms to Net 60 days?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'orders@pharmasupplyglobal.com',
          fromName: 'PharmaSupply Global',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 15:30',
          message: 'We can approve Net 60 days with a 2% early payment discount if paid within 30 days.',
          type: 'received',
        },
      ],
    },
    {
      id: 9,
      vendor: 'Lab Equipment Solutions',
      email: 'support@labequipmentsolutions.com',
      subject: 'Warranty Extension Proposal',
      lastMessage: '18 Jan 2026 09:20',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'support@labequipmentsolutions.com',
          timestamp: '17 Jan 2026 16:00',
          message: 'Can we extend the standard 2-year warranty to 4 years for critical lab equipment?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'support@labequipmentsolutions.com',
          fromName: 'Lab Equipment Solutions',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 09:20',
          message: 'Extended 4-year warranty is available for an additional 6% of the total order value. This includes on-site support.',
          type: 'received',
        },
      ],
    },
    {
      id: 10,
      vendor: 'Diagnostic Supplies India',
      email: 'sales@diagnosticsupplies.in',
      subject: 'Volume Commitment Agreement',
      lastMessage: '17 Jan 2026 14:45',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@diagnosticsupplies.in',
          timestamp: '17 Jan 2026 11:00',
          message: 'We can commit to quarterly orders of minimum 50,000 units. What pricing can you offer?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@diagnosticsupplies.in',
          fromName: 'Diagnostic Supplies India',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 14:45',
          message: 'With quarterly commitment, we offer ₹145 per unit (15% off regular price) with guaranteed stock availability.',
          type: 'received',
        },
      ],
    },
    {
      id: 11,
      vendor: 'MediCare Distributors',
      email: 'contact@medicaredist.com',
      subject: 'Rush Order Premium Waiver',
      lastMessage: '17 Jan 2026 10:30',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@medicaredist.com',
          timestamp: '16 Jan 2026 15:00',
          message: 'We have an urgent requirement for 10,000 units within 7 days. Can you waive the rush order premium?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'contact@medicaredist.com',
          fromName: 'MediCare Distributors',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 10:30',
          message: 'We can waive 50% of the rush premium if you commit to regular monthly orders for the next 6 months.',
          type: 'received',
        },
      ],
    },
    {
      id: 12,
      vendor: 'Advanced Medical Systems',
      email: 'info@advancedmed.com',
      subject: 'Training & Installation Costs',
      lastMessage: '16 Jan 2026 17:15',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@advancedmed.com',
          timestamp: '16 Jan 2026 13:00',
          message: 'The training and installation costs are adding 18% to the total. Can these be included in the base price?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@advancedmed.com',
          fromName: 'Advanced Medical Systems',
          to: 'procurement@company.com',
          timestamp: '16 Jan 2026 17:15',
          message: 'We can include basic installation and 2-day training at no extra cost. Advanced training will be charged separately.',
          type: 'received',
        },
      ],
    },
  ];

  const [selectedVoiceCall, setSelectedVoiceCall] = useState(voiceCalls[0]);
  const [selectedEmailThread, setSelectedEmailThread] = useState<any>(null);
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Negotiations</h2>
          <p className="text-sm text-gray-500">AI-powered voice negotiations and email communications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('voice')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'voice'
            ? 'text-gray-900'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>Voice Calls</span>
          </div>
          {activeTab === 'voice' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'email'
            ? 'text-gray-900'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Email Threads</span>
          </div>
          {activeTab === 'email' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
          )}
        </button>
      </div>

      {/* Voice Calls Tab */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Calls List */}
          <div className="col-span-4 space-y-3">
            {voiceCalls.map((call) => (
              <button
                key={call.id}
                onClick={() => setSelectedVoiceCall(call)}
                className={`w-full text-left p-4 rounded-lg transition-all border ${selectedVoiceCall.id === call.id
                  ? 'bg-white border-[#3B82F6] shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">{call.vendor}</p>
                </div>
                <p className="text-xs text-gray-500 mb-2">{call.callDate}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs px-2 py-0.5 border-0 ${call.status === 'active'
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
                    }`}>
                    {call.outcome}
                  </Badge>
                  <span className="text-xs text-gray-500">{call.duration}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Call Details */}
          <div className="col-span-8 border border-gray-200 rounded-lg bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{selectedVoiceCall.vendor}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedVoiceCall.callDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedVoiceCall.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Ram Krish, AI Agent, Sandeep Kumar
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50">
                  Download
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Key Points */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Points</h4>
                <div className="space-y-2">
                  {selectedVoiceCall.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-gray-100 p-3 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Transcript</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {selectedVoiceCall.transcript.map((entry, idx) => (
                    <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900">{entry.speaker}</p>
                        <p className="text-xs text-gray-400">{entry.time}</p>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Threads Tab */}
      {activeTab === 'email' && (
        <>
          {/* Gmail-style Email List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {emailThreads.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {emailThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => {
                      setSelectedEmailThread(thread);
                      setEmailThreadOpen(true);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group text-left"
                  >
                    {/* Status Indicator */}
                    <div className="flex-shrink-0">
                      {thread.status === 'active' ? (
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2"></div>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {thread.vendor.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-sm ${thread.status === 'active' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {thread.vendor}
                        </span>
                        {thread.priority === 'high' && (
                          <Badge className="text-xs px-1.5 py-0 border-0 bg-red-50 text-red-700">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${thread.status === 'active' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {thread.subject}
                        </span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-500 truncate">
                          {thread.messages[thread.messages.length - 1].message.substring(0, 60)}...
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-xs text-gray-500">
                      {thread.lastMessage.split(' ').slice(0, 2).join(' ')}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">No email threads found</p>
              </div>
            )}
          </div>

          {/* Gmail-style Email Thread Side Panel */}
          {emailThreadOpen && selectedEmailThread && createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setEmailThreadOpen(false)}
              />

              {/* Side Panel */}
              <div className="absolute top-0 right-0 h-full w-[700px] bg-white shadow-lg flex flex-col" style={{ zIndex: 1 }}>
                {/* Header */}
                <div className="bg-white border-b border-[#eeeff1] px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{selectedEmailThread.subject}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedEmailThread.email}</p>
                  </div>
                  <button
                    onClick={() => setEmailThreadOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Email Thread Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {selectedEmailThread.messages.map((message: any, index: number) => (
                    <div key={message.id} className={`mb-6 ${index === selectedEmailThread.messages.length - 1 ? 'mb-0' : ''}`}>
                      {/* Message Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'sent' ? 'bg-[#3B82F6]' : 'bg-gray-300'
                          }`}>
                          <span className={`text-sm font-medium ${message.type === 'sent' ? 'text-white' : 'text-gray-700'}`}>
                            {message.fromName.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">{message.type === 'sent' ? 'Ram Krish' : message.fromName}</span>
                            <span className="text-xs text-gray-500">{message.timestamp}</span>
                          </div>
                          <p className="text-xs text-gray-500">to {message.to}</p>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="ml-13">
                        <div className="text-sm text-gray-900 leading-relaxed">
                          {message.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Section */}
                {selectedEmailThread.status === 'active' && (
                  <div className="border-t border-[#eeeff1] bg-white">
                    <div className="px-6 py-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-white">RK</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-2">Reply to {selectedEmailThread.vendor}</p>
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
                            onClick={() => setEmailThreadOpen(false)}
                            className="text-sm"
                          >
                            Close
                          </Button>
                          <Button
                            onClick={() => {
                              toast.success(`Reply sent to ${selectedEmailThread.vendor}`);
                              setEmailThreadOpen(false);
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
                )}
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

// Closure Phase Component is now imported from ClosurePhaseNew.tsx