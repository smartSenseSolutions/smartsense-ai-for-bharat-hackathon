import { useState } from 'react';
import { Plus, FileText, Clock, CheckCircle2, XCircle, ArrowRight, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { ProjectNameModal } from '@/app/components/ProjectNameModal';
import { Project } from '@/app/App';

interface ProposalsListProps {
  projects?: Project[];
  onNavigate: (screen: any) => void;
  onCreateNew: () => void;
  onViewDetails: (proposal: any) => void;
}

export function ProposalsList({ projects = [], onNavigate, onCreateNew, onViewDetails }: ProposalsListProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'pending' | 'draft' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const allProposals = [
    // Real projects from App state
    ...projects.map(project => ({
      id: `RFP-${project.id}`,
      title: project.projectName,
      product: project.rfpData?.productName || 'No product specified',
      quantity: project.rfpData?.quantity || 'N/A',
      status: project.status,
      createdDate: project.createdAt.toISOString().split('T')[0],
      vendorResponses: 0,
      unreadMessages: 0,
    })),
    // Mixed Status Proposals
    {
      id: 'RFP-2026-001',
      title: 'Medical Grade N95 Respirators',
      product: '3M N95 Respirators Model 1860',
      quantity: '50,000 units',
      status: 'open',
      createdDate: '2026-01-20',
      vendorResponses: 5,
      unreadMessages: 3,
      priority: 'high',
    },
    {
      id: 'RFP-2026-002',
      title: 'Laboratory Centrifuge Equipment',
      product: 'Eppendorf 5810R Refrigerated Centrifuge',
      quantity: '12 units',
      status: 'pending',
      createdDate: '2026-01-18',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-003',
      title: 'Surgical Gloves - Nitrile',
      product: 'Sterile Nitrile Surgical Gloves Size 7.5',
      quantity: '100,000 pairs',
      status: 'open',
      createdDate: '2026-01-17',
      vendorResponses: 8,
      unreadMessages: 5,
    },
    {
      id: 'RFP-2026-004',
      title: 'PCR Testing Kits',
      product: 'RT-PCR COVID-19 Diagnostic Kits',
      quantity: '25,000 tests',
      status: 'draft',
      createdDate: '2026-01-16',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-005',
      title: 'Ultrasound Imaging System',
      product: 'GE Voluson E10 Ultrasound System',
      quantity: '3 units',
      status: 'open',
      createdDate: '2026-01-15',
      vendorResponses: 3,
      unreadMessages: 2,
      priority: 'high',
    },
    {
      id: 'RFP-2026-006',
      title: 'Hospital Patient Monitors',
      product: 'Philips IntelliVue MX450 Monitors',
      quantity: '25 units',
      status: 'closed',
      createdDate: '2026-01-14',
      closedDate: '2026-01-21',
      vendorResponses: 7,
      selectedVendor: 'Philips Healthcare',
    },
    {
      id: 'RFP-2026-007',
      title: 'Pharmaceutical Grade Vaccines',
      product: 'Influenza Vaccine (Quadrivalent)',
      quantity: '15,000 doses',
      status: 'open',
      createdDate: '2026-01-13',
      vendorResponses: 4,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-008',
      title: 'Disposable Syringes & Needles',
      product: 'BD Safety-Lok Syringes 1ml',
      quantity: '200,000 units',
      status: 'pending',
      createdDate: '2026-01-12',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    
    // In Progress Proposals
    {
      id: 'RFP-2026-013',
      title: 'Digital X-Ray System',
      product: 'Fujifilm FDR D-EVO II Digital Radiography',
      quantity: '4 units',
      status: 'in-progress',
      createdDate: '2026-01-22',
      vendorResponses: 3,
      unreadMessages: 1,
    },
    {
      id: 'RFP-2026-014',
      title: 'Cardiac Monitors',
      product: 'GE CARESCAPE B650 Patient Monitors',
      quantity: '18 units',
      status: 'in-progress',
      createdDate: '2026-01-21',
      vendorResponses: 2,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-015',
      title: 'Anesthesia Workstations',
      product: 'Dräger Fabius GS Premium Anesthesia',
      quantity: '6 units',
      status: 'in-progress',
      createdDate: '2026-01-19',
      vendorResponses: 4,
      unreadMessages: 2,
    },
    {
      id: 'RFP-2026-016',
      title: 'Laboratory Incubators',
      product: 'Thermo Scientific Forma Series II CO2 Incubators',
      quantity: '10 units',
      status: 'in-progress',
      createdDate: '2026-01-17',
      vendorResponses: 1,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-017',
      title: 'Surgical Lighting Systems',
      product: 'Stryker LED Surgical Lights',
      quantity: '8 units',
      status: 'in-progress',
      createdDate: '2026-01-15',
      vendorResponses: 5,
      unreadMessages: 3,
    },
    
    // Closed Proposals
    {
      id: 'RFP-2025-098',
      title: 'MRI Scanner Upgrade',
      product: 'Siemens MAGNETOM Vida 3T MRI',
      quantity: '2 units',
      status: 'closed',
      createdDate: '2025-12-10',
      closedDate: '2026-01-05',
      vendorResponses: 5,
      selectedVendor: 'Siemens Healthineers',
    },
    {
      id: 'RFP-2025-097',
      title: 'Blood Collection Tubes',
      product: 'BD Vacutainer Blood Collection Tubes',
      quantity: '500,000 tubes',
      status: 'open',
      createdDate: '2025-12-08',
      vendorResponses: 6,
      unreadMessages: 2,
    },
    {
      id: 'RFP-2025-096',
      title: 'Ventilator Systems',
      product: 'Medtronic PB980 Ventilators',
      quantity: '20 units',
      status: 'closed',
      createdDate: '2025-11-25',
      closedDate: '2025-12-28',
      vendorResponses: 4,
      selectedVendor: 'Medtronic Inc.',
    },
    {
      id: 'RFP-2025-095',
      title: 'Laboratory Reagents',
      product: 'Chemistry Reagent Test Kits',
      quantity: '10,000 kits',
      status: 'draft',
      createdDate: '2025-11-20',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2025-094',
      title: 'Defibrillators - AED',
      product: 'Philips HeartStart AED',
      quantity: '40 units',
      status: 'closed',
      createdDate: '2025-11-15',
      closedDate: '2025-12-10',
      vendorResponses: 5,
      selectedVendor: 'Philips Healthcare',
    },
    {
      id: 'RFP-2025-093',
      title: 'Surgical Instruments Set',
      product: 'Laparoscopic Surgery Instrument Set',
      quantity: '15 sets',
      status: 'open',
      createdDate: '2025-11-10',
      vendorResponses: 4,
      unreadMessages: 1,
    },
    
    // Draft Proposals
    {
      id: 'RFP-2026-009',
      title: 'CT Scanner Replacement',
      product: 'GE Revolution CT Scanner',
      quantity: '1 unit',
      status: 'draft',
      createdDate: '2026-01-21',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-010',
      title: 'Infusion Pumps',
      product: 'Baxter Sigma Spectrum Infusion Pumps',
      quantity: '50 units',
      status: 'pending',
      createdDate: '2026-01-20',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-011',
      title: 'Dialysis Machines',
      product: 'Fresenius 5008S Dialysis System',
      quantity: '8 units',
      status: 'draft',
      createdDate: '2026-01-19',
      vendorResponses: 0,
      unreadMessages: 0,
    },
    {
      id: 'RFP-2026-012',
      title: 'Oxygen Concentrators',
      product: 'Philips EverFlo Oxygen Concentrators',
      quantity: '30 units',
      status: 'open',
      createdDate: '2026-01-18',
      vendorResponses: 2,
      unreadMessages: 0,
    },
  ];

  // Filter proposals by status based on selected filter
  const proposals = allProposals.filter(proposal => {
    if (filter === 'all') return true;
    return proposal.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      open: 'bg-emerald-50 text-emerald-700',
      'in-progress': 'bg-blue-50 text-blue-700',
      pending: 'bg-amber-50 text-amber-700',
      closed: 'bg-slate-100 text-slate-700',
    };

    const labels = {
      draft: 'Draft',
      open: 'Approved',
      'in-progress': 'In Progress',
      pending: 'Pending',
      closed: 'Closed',
    };

    return (
      <Badge className={`text-xs px-3 py-1 ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'open':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case 'closed':
        return <CheckCircle2 className="w-5 h-5 text-slate-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  // Format date as "22 Jan 2026"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Filter proposals by search query
  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          proposal.product.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen">
      <ProjectNameModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={(projectName) => {
          setShowModal(false);
          onNavigate({ screen: 'ai-rfp-creator-centered', projectName } as any);
        }}
      />
      
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Projects</h1>
            <p className="text-sm text-gray-500">Manage and track your RFP projects</p>
          </div>
          <Button 
            className="bg-[#3B82F6] hover:bg-[#2563EB] h-10 font-medium text-sm"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              className="pl-10 h-10 border border-[#eeeff1] bg-white text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 h-10 bg-white border border-[#eeeff1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all w-48"
            >
              <span>
                {filter === 'all' ? 'All' : filter === 'open' ? 'Approved' : filter === 'in-progress' ? 'In Progress' : filter === 'pending' ? 'Pending' : filter === 'closed' ? 'Closed' : 'Draft'}
              </span>
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
            
            {showFilterDropdown && (
              <div className="absolute top-12 left-0 bg-white border border-[#eeeff1] rounded-lg py-1 w-48 z-10 shadow-sm">
                <button
                  onClick={() => {
                    setFilter('all');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${
                    filter === 'all' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setFilter('open');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${
                    filter === 'open' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => {
                    setFilter('in-progress');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${
                    filter === 'in-progress' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => {
                    setFilter('pending');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${
                    filter === 'pending' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => {
                    setFilter('draft');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${
                    filter === 'draft' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => {
                    setFilter('closed');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${
                    filter === 'closed' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                  }`}
                >
                  Closed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          {filteredProposals.map((proposal) => (
            <div
              key={proposal.id}
              className="relative bg-white border border-[#eeeff1] rounded-xl hover:border-gray-200 transition-all group"
              onMouseEnter={() => setHoveredCardId(proposal.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              {/* Card Content */}
              <button
                onClick={() => onViewDetails(proposal)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-base font-medium text-gray-900 group-hover:text-[#3B82F6] transition-colors truncate mb-2">
                      {proposal.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {proposal.product}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-gray-500">
                        {proposal.quantity}
                      </p>
                      
                      {/* Additional Tags for Approved and In Progress */}
                      {(proposal.status === 'open' || proposal.status === 'in-progress') && (
                        <>
                          {/* Messages Tag */}
                          {proposal.unreadMessages > 0 && (
                            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {proposal.unreadMessages} {proposal.unreadMessages === 1 ? 'Message' : 'Messages'}
                            </span>
                          )}
                          
                          {/* High Priority Tag */}
                          {'priority' in proposal && proposal.priority === 'high' && (
                            <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                              High Priority
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(proposal.status)}
                  </div>
                </div>
                
                <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
                  <span>{formatDate(proposal.createdDate)}</span>
                  {filter === 'closed' && 'closedDate' in proposal && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>Closed {formatDate(proposal.closedDate)}</span>
                    </>
                  )}
                  {filter === 'open' && proposal.vendorResponses > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 text-[#3B82F6] font-medium">
                        {proposal.vendorResponses} {proposal.vendorResponses === 1 ? 'response' : 'responses'}
                      </span>
                    </>
                  )}
                  {filter === 'closed' && 'selectedVendor' in proposal && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-900 font-medium">{proposal.selectedVendor}</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          ))}

          {filteredProposals.length === 0 && (
            <div className="col-span-2 bg-white border border-gray-100 rounded-xl p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                {filter === 'open' 
                  ? 'Create your first project to get started with AI-powered RFP generation'
                  : filter === 'draft'
                    ? 'No draft projects yet. Start creating a new project to save as draft'
                    : 'No closed projects yet'
                }
              </p>
              {filter === 'open' && (
                <Button 
                  className="bg-[#3B82F6] hover:bg-[#2563EB] h-11 font-medium"
                  onClick={onCreateNew}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}