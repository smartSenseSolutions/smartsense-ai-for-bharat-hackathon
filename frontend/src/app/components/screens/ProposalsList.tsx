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
  const [filter, setFilter] = useState<'all' | 'published' | 'in-progress' | 'draft' | 'completed'>('all');
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
      rfpData: project.rfpData,
      projectName: project.projectName,
    })),
  ].map(p => ({
    ...p,
    status: p.status === 'open' || p.status === 'pending' ? 'published' : p.status === 'closed' ? 'completed' : p.status
  }));

  // Filter proposals by status based on selected filter
  const proposals = allProposals.filter(proposal => {
    if (filter === 'all') return true;
    return proposal.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      published: 'bg-emerald-50 text-emerald-700',
      'in-progress': 'bg-blue-50 text-blue-700',
      completed: 'bg-slate-100 text-slate-700',
    };

    const labels = {
      draft: 'Draft',
      published: 'Published',
      'in-progress': 'In Progress',
      completed: 'Completed',
    };

    return (
      <Badge className={`text-xs px-3 py-1 ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'published':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'completed':
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
    <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
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
                {filter === 'all' ? 'All' : filter === 'published' ? 'Published' : filter === 'in-progress' ? 'In Progress' : filter === 'completed' ? 'Completed' : 'Draft'}
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
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${filter === 'all' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setFilter('published');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${filter === 'published' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                    }`}
                >
                  Published
                </button>
                <button
                  onClick={() => {
                    setFilter('in-progress');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${filter === 'in-progress' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                    }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => {
                    setFilter('draft');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${filter === 'draft' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                    }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => {
                    setFilter('completed');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-all ${filter === 'completed' ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                    }`}
                >
                  Completed
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
                      {(proposal.status === 'published' || proposal.status === 'in-progress') && (
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
                  {filter === 'completed' && 'closedDate' in proposal && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>Closed {formatDate((proposal as any).closedDate)}</span>
                    </>
                  )}
                  {filter === 'published' && 'vendorResponses' in proposal && proposal.vendorResponses > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 text-[#3B82F6] font-medium">
                        {proposal.vendorResponses} {proposal.vendorResponses === 1 ? 'response' : 'responses'}
                      </span>
                    </>
                  )}
                  {filter === 'completed' && 'selectedVendor' in proposal && (
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
                {filter === 'published'
                  ? 'Create your first project to get started with AI-powered RFP generation'
                  : filter === 'draft'
                    ? 'No draft projects yet. Start creating a new project to save as draft'
                    : 'No completed projects yet'
                }
              </p>
              {filter === 'published' && (
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