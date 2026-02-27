import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Login } from '@/app/components/screens/Login';
import { Bell, Globe, X, FileText, MessageSquare, TrendingUp, AlertCircle, CheckCircle, Clock, Users, Package } from 'lucide-react';
import { Sidebar } from '@/app/components/Sidebar';
import { Dashboard } from '@/app/components/screens/Dashboard';
import { VendorMarket } from '@/app/components/screens/VendorMarket';
import { RFPManager } from '@/app/components/screens/RFPManager';
import { ProposalsList } from '@/app/components/screens/ProposalsList';
import { ProposalDetails } from '@/app/components/screens/ProposalDetails';
import { CommunicationHub } from '@/app/components/screens/CommunicationHub';
import { QuoteIntelligence } from '@/app/components/screens/QuoteIntelligence';
import { NegotiationHub } from '@/app/components/screens/NegotiationHub';
import { OrdersHistory } from '@/app/components/screens/OrdersHistory';
import { ProjectNameEntry } from '@/app/components/screens/ProjectNameEntry';
import { AIRFPCreator } from '@/app/components/screens/AIRFPCreator';
import { AIRFPCreatorCentered } from '@/app/components/screens/AIRFPCreatorCentered';
import { ApprovalPending } from '@/app/components/screens/ApprovalPending';
import { VendorOnboarding } from '@/app/components/screens/VendorOnboarding';

export type Screen = 'dashboard' | 'vendor-market' | 'vendor-onboarding' | 'proposals-list' | 'proposal-details' | 'create-proposal' | 'project-name-entry' | 'ai-rfp-creator' | 'ai-rfp-creator-centered' | 'approval-pending' | 'communication-hub' | 'quote-intelligence' | 'negotiation-hub' | 'orders-history' | 'settings' | 'quotations' | 'negotiations';

export interface Project {
  id: string;
  projectName: string;
  status: 'draft' | 'published' | 'in-progress' | 'completed';
  rfpData: any;
  createdAt: Date;
}

interface AuthUser {
  id: string;
  email: string;
  is_superuser: boolean;
  is_active: boolean;
}

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogin = (token: string, user: AuthUser) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setAuthToken(token);
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthToken(null);
    setAuthUser(null);
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return (localStorage.getItem('app_currentScreen') as Screen) || 'dashboard';
  });
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [currentRFP, setCurrentRFP] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>(() => {
    return localStorage.getItem('app_currentProjectName') || '';
  });
  const [currentRFPData, setCurrentRFPData] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('app_currentScreen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('app_currentProjectName', currentProjectName);
  }, [currentProjectName]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/api/projects`);
        if (response.ok) {
          const data = await response.json();
          const mappedProjects = data.map((p: any) => ({
            id: p.id,
            projectName: p.project_name,
            status: p.status ? p.status.toLowerCase() : 'draft',
            rfpData: p.rfp_data,
            createdAt: new Date(p.created_at)
          }));
          setProjects(mappedProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, []);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('English');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setCurrentScreen}
            onSearchClick={() => setCurrentScreen('vendor-market')}
          />
        );
      case 'vendor-market':
        return (
          <VendorMarket
            onNavigate={setCurrentScreen}
            onVendorSelect={(vendor) => {
              setSelectedVendor(vendor);
            }}
            onCreateRFP={(vendor) => {
              setSelectedVendor(vendor);
              setCurrentScreen('create-proposal');
            }}
          />
        );
      case 'proposals-list':
        return (
          <ProposalsList
            projects={projects}
            onNavigate={(data) => {
              if (typeof data === 'string') {
                setCurrentScreen(data);
              } else {
                // Handle object with screen and projectName
                setCurrentProjectName(data.projectName || '');
                setCurrentScreen(data.screen);
                // Auto-collapse sidebar when entering AI creator
                if (data.screen === 'ai-rfp-creator-centered') {
                  setSidebarCollapsed(true);
                }
              }
            }}
            onCreateNew={() => {
              setSelectedProposal(null);
              setCurrentProjectName('');
              setCurrentRFPData(null);
              setCurrentScreen('project-name-entry');
            }}
            onViewDetails={(proposal) => {
              setSelectedProposal(proposal);
              if (proposal.status === 'draft') {
                setCurrentProjectName(proposal.projectName);
                setCurrentRFPData(proposal.rfpData);
                setCurrentScreen('ai-rfp-creator-centered');
              } else {
                setCurrentScreen('proposal-details');
              }
            }}
          />
        );
      case 'proposal-details':
        return (
          <ProposalDetails
            proposal={selectedProposal}
            onBack={() => setCurrentScreen('proposals-list')}
            onNavigate={setCurrentScreen}
            onStatusChange={async (status) => {
              if (selectedProposal && selectedProposal.id.startsWith('RFP-')) {
                const projectId = selectedProposal.id.replace('RFP-', '');
                try {
                  const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                  });
                  if (response.ok) {
                    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: status as any } : p));
                  }
                } catch (error) {
                  console.error('Error updating project status:', error);
                }
              }
              setSelectedProposal({ ...selectedProposal, status });
            }}
          />
        );
      case 'create-proposal':
        return (
          <RFPManager
            onNavigate={setCurrentScreen}
            selectedVendor={selectedVendor}
            onRFPSent={(rfp) => {
              setCurrentRFP(rfp);
              setTimeout(() => {
                setCurrentScreen('proposals-list');
              }, 1000);
            }}
          />
        );
      case 'project-name-entry':
        return (
          <ProjectNameEntry
            onBack={() => setCurrentScreen('proposals-list')}
            onNext={(projectName) => {
              setCurrentProjectName(projectName);
              setCurrentScreen('ai-rfp-creator');
            }}
          />
        );
      case 'ai-rfp-creator':
        return (
          <AIRFPCreator
            projectName={currentProjectName}
            onBack={() => setCurrentScreen('project-name-entry')}
            onSendForApproval={(rfpData) => {
              setCurrentRFPData(rfpData);
              setCurrentScreen('approval-pending');
            }}
          />
        );
      case 'ai-rfp-creator-centered':
        return (
          <AIRFPCreatorCentered
            projectName={currentProjectName}
            initialRfpData={currentRFPData}
            onBack={() => {
              setCurrentScreen('proposals-list');
              setSidebarCollapsed(false);
            }}
            onSendForApproval={async (rfpData) => {
              const existingProject = selectedProposal?.status === 'draft'
                ? projects.find(p => p.id === selectedProposal.id.replace('RFP-', ''))
                : null;

              let finalProjectId: string | null = null;

              try {
                if (existingProject) {
                  const response = await fetch(`${API_URL}/api/projects/${existingProject.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      project_name: rfpData.projectName || currentProjectName,
                      status: 'published',
                      rfp_data: rfpData
                    })
                  });
                  if (response.ok) {
                    finalProjectId = existingProject.id;
                    setProjects(prev => prev.map(p => p.id === existingProject.id ? { ...p, status: 'published', rfpData, projectName: rfpData.projectName || currentProjectName } : p));
                  }
                } else {
                  const response = await fetch(`${API_URL}/api/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      project_name: rfpData.projectName || currentProjectName,
                      status: 'published',
                      rfp_data: rfpData
                    })
                  });
                  if (response.ok) {
                    const newProj = await response.json();
                    finalProjectId = newProj.id;
                    const newProject: Project = {
                      id: newProj.id,
                      projectName: newProj.project_name,
                      status: 'published',
                      rfpData: newProj.rfp_data,
                      createdAt: new Date(newProj.created_at),
                    };
                    setProjects(prev => [newProject, ...prev]);
                  }
                }
              } catch (error) {
                console.error("Error publishing RFP:", error);
              }

              // Upload PDF to S3 (fire-and-forget; errors are non-blocking)
              if (finalProjectId) {
                fetch(`${API_URL}/api/rfp/publish`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    project_id: finalProjectId,
                    project_name: rfpData.projectName || currentProjectName,
                    rfp_data: rfpData,
                  }),
                }).then(async (res) => {
                  if (!res.ok) {
                    const body = await res.text().catch(() => '');
                    console.error(`RFP PDF upload failed [${res.status}]:`, body);
                  } else {
                    const data = await res.json();
                    console.log("RFP PDF uploaded:", data.s3_url);
                  }
                }).catch(err => console.error("RFP PDF upload network error:", err));
              }

              setSelectedProposal(null);
              setCurrentScreen('proposals-list');
              setSidebarCollapsed(false);
            }}
            onSaveAsDraft={async (rfpData) => {
              const existingProject = selectedProposal?.status === 'draft'
                ? projects.find(p => p.id === selectedProposal.id.replace('RFP-', ''))
                : null;

              try {
                if (existingProject) {
                  const response = await fetch(`${API_URL}/api/projects/${existingProject.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      project_name: rfpData.projectName || currentProjectName,
                      status: 'draft',
                      rfp_data: rfpData
                    })
                  });
                  if (response.ok) {
                    setProjects(prev => prev.map(p => p.id === existingProject.id ? { ...p, rfpData, projectName: rfpData.projectName || currentProjectName } : p));
                  }
                } else {
                  const response = await fetch(`${API_URL}/api/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      project_name: rfpData.projectName || currentProjectName,
                      status: 'draft',
                      rfp_data: rfpData
                    })
                  });
                  if (response.ok) {
                    const newProj = await response.json();
                    const newProject: Project = {
                      id: newProj.id,
                      projectName: newProj.project_name,
                      status: 'draft',
                      rfpData: newProj.rfp_data,
                      createdAt: new Date(newProj.created_at),
                    };
                    setProjects(prev => [newProject, ...prev]);
                  }
                }
              } catch (error) {
                console.error("Error saving draft:", error);
              }

              setSelectedProposal(null);
              setCurrentScreen('proposals-list');
              setSidebarCollapsed(false);
            }}
          />
        );
      case 'approval-pending':
        return (
          <ApprovalPending
            projectName={currentProjectName}
            onBackToProjects={() => setCurrentScreen('proposals-list')}
          />
        );
      case 'communication-hub':
        return <CommunicationHub onNavigate={setCurrentScreen} />;
      case 'quotations':
        return <QuoteIntelligence onNavigate={setCurrentScreen} onVendorSelect={(quote) => {
          setSelectedQuote(quote);
          setCurrentScreen('negotiation-hub');
        }} />;
      case 'negotiations':
        return <NegotiationHub onNavigate={setCurrentScreen} selectedQuote={selectedQuote} />;
      case 'quote-intelligence':
        return (
          <QuoteIntelligence
            onNavigate={setCurrentScreen}
            onVendorSelect={(quote) => {
              setSelectedQuote(quote);
              setCurrentScreen('negotiation-hub');
            }}
          />
        );
      case 'negotiation-hub':
        return (
          <NegotiationHub
            onNavigate={setCurrentScreen}
            selectedQuote={selectedQuote}
          />
        );
      case 'orders-history':
        return <OrdersHistory onNavigate={setCurrentScreen} />;
      case 'vendor-onboarding':
        return <VendorOnboarding onNavigate={setCurrentScreen} />;
      case 'settings':
        return (
          <div className="min-h-screen">
            <div className="bg-white border-b border-[#eeeff1]">
              <div className="px-8 py-6">
                <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your account and application preferences</p>
              </div>
            </div>

            <div className="px-8 py-6 overflow-y-auto h-[calc(100vh-73px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              <div className="max-w-4xl space-y-6 pb-6">
                {/* Profile Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          defaultValue="Ram Krish"
                          className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          defaultValue="rajesh.kumar@procureai.com"
                          className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                        <input
                          type="text"
                          defaultValue="Procurement Manager"
                          className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <input
                          type="text"
                          defaultValue="Supply Chain"
                          className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                      <input
                        type="text"
                        defaultValue="smartSense Solutions Private Limited"
                        className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                        <select className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent">
                          <option>Healthcare & Life Sciences</option>
                          <option>Pharmaceuticals</option>
                          <option>Medical Devices</option>
                          <option>Biotechnology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization Size</label>
                        <select className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent">
                          <option>1-50 employees</option>
                          <option>51-200 employees</option>
                          <option>201-1000 employees</option>
                          <option>1000+ employees</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regional & Language Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Regional & Language Settings</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Language</label>
                        <select className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent">
                          <option>English</option>
                          <option>हिंदी (Hindi)</option>
                          <option>தமிழ் (Tamil)</option>
                          <option>తెలుగు (Telugu)</option>
                          <option>বাংলা (Bengali)</option>
                          <option>मराठी (Marathi)</option>
                          <option>ગુજરાતી (Gujarati)</option>
                          <option>ಕನ್ನಡ (Kannada)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                        <select className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent">
                          <option>₹ Indian Rupee (INR)</option>
                          <option>$ US Dollar (USD)</option>
                          <option>€ Euro (EUR)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                        <select className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent">
                          <option>23 Jan 2026</option>
                          <option>01/23/2026</option>
                          <option>2026-01-23</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                        <select className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent">
                          <option>IST (UTC +5:30)</option>
                          <option>UTC</option>
                          <option>EST (UTC -5:00)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-[#eeeff1]">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                        <p className="text-xs text-gray-500 mt-0.5">Receive updates via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3B82F6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#eeeff1]">
                      <div>
                        <p className="text-sm font-medium text-gray-900">RFP Status Updates</p>
                        <p className="text-xs text-gray-500 mt-0.5">Notifications when RFP status changes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3B82F6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[#eeeff1]">
                      <div>
                        <p className="text-sm font-medium text-gray-900">New Vendor Quotes</p>
                        <p className="text-xs text-gray-500 mt-0.5">Alerts when vendors submit quotes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3B82F6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">AI Recommendations</p>
                        <p className="text-xs text-gray-500 mt-0.5">Notifications for AI-generated insights</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3B82F6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Integration Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-[#eeeff1] rounded-lg flex items-center justify-center">
                          <Globe className="w-5 h-5 text-[#3B82F6]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email Integration</p>
                          <p className="text-xs text-gray-500">Connected to rajesh.kumar@procureai.com</p>
                        </div>
                      </div>
                      <span className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                        Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-[#eeeff1] rounded-lg flex items-center justify-center">
                          <Bell className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Slack Notifications</p>
                          <p className="text-xs text-gray-500">Not connected</p>
                        </div>
                      </div>
                      <button className="text-xs px-3 py-1 text-[#3B82F6] bg-blue-50 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-[#eeeff1]">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500 mt-0.5">Add an extra layer of security</p>
                      </div>
                      <button className="text-xs px-3 py-1 text-[#3B82F6] bg-blue-50 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                        Enable
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Change Password</p>
                        <p className="text-xs text-gray-500 mt-0.5">Last changed 45 days ago</p>
                      </div>
                      <button className="text-xs px-3 py-1 text-[#3B82F6] bg-blue-50 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                        Update
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button className="px-6 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard onNavigate={setCurrentScreen} onSearchClick={() => setCurrentScreen('vendor-market')} />;
    }
  };

  if (!authToken) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen bg-white">
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          collapsed={currentScreen === 'ai-rfp-creator-centered' ? true : sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userEmail={authUser?.email}
          onLogout={handleLogout}
        />

        {/* Top Header Bar */}
        {currentScreen !== 'ai-rfp-creator' && currentScreen !== 'ai-rfp-creator-centered' && (
          <div
            className={`fixed top-4 right-4 flex items-center gap-3 z-40 transition-all duration-300`}
          >
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLanguageMenu(!showLanguageMenu);
                  setShowNotifications(false);
                }}
                className="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <Globe className="w-5 h-5 text-gray-600" />
              </button>

              {showLanguageMenu && (
                <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1.5 z-50">
                  {['English', 'हिंदी', 'தமிழ்', 'తెలుగు', 'বাংলা', 'मराठी', 'ગુજરાતી', 'ಕನ್ನಡ'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setCurrentLanguage(lang);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${currentLanguage === lang ? 'bg-blue-50 text-[#3B82F6] font-medium' : 'text-gray-700'
                        }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowLanguageMenu(false);
                }}
                className="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        )}

        {/* Notification Side Panel */}
        {showNotifications && (
          <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-end">
            <div className="w-full max-w-lg h-full bg-white shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-[#eeeff1] p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Stay updated on all platform activities</p>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <div className="divide-y divide-[#eeeff1]">
                  {/* Today */}
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-gray-400 mb-3">TODAY</p>

                    {/* Quotation Received */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-[#3B82F6]">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-[#3B82F6] rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">New Quotation Received</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">2h ago</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">MedTech Surgical Supplies submitted quotation for Surgical Equipment RFP • ₹12,45,000</p>
                        </div>
                      </div>
                    </div>

                    {/* Negotiation Update */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-purple-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">Negotiation Price Improved</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">3h ago</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">HealthCare Logistics UK reduced price by 8% to ₹8,95,000 for Laboratory Equipment</p>
                        </div>
                      </div>
                    </div>

                    {/* RFP Approval Required */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-amber-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">RFP Approval Required</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">5h ago</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Medical Diagnostic Equipment RFP needs your approval before distribution</p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Message */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-gray-400">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">New Message from Vendor</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">7h ago</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Pacific Medical Supplies: "We can expedite delivery to 15 days if needed"</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-green-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">AI Recommendation Available</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">9h ago</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Best vendor match identified for Pharmaceutical Storage RFP based on 12 criteria</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yesterday */}
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-gray-400 mb-3">YESTERDAY</p>

                    {/* Order Confirmed */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-green-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Order Confirmed</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">23 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Purchase order #PO-2026-0847 confirmed with Swiss MedTech Solutions • ₹24,50,000</p>
                        </div>
                      </div>
                    </div>

                    {/* RFP Distributed */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-[#3B82F6]">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">RFP Distributed Successfully</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">23 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Laboratory Reagents RFP sent to 8 verified vendors in India</p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Response */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-purple-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Vendor Inquiry Response</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">23 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">BioLab Solutions Inc answered 3 technical questions about reagent specifications</p>
                        </div>
                      </div>
                    </div>

                    {/* Quote Deadline Reminder */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-amber-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Quote Deadline Approaching</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">23 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Cleanroom Equipment RFP closes in 2 days • 5 quotes received, 3 pending</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Earlier */}
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium text-gray-400 mb-3">EARLIER</p>

                    {/* New Vendor Connected */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-green-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">New Vendor Connection</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">22 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">AsiaHealth Medical Devices accepted your connection request</p>
                        </div>
                      </div>
                    </div>

                    {/* Quote Comparison Ready */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-[#3B82F6]">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">AI Quote Comparison Complete</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">22 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Analyzed 6 quotations for Medical Imaging Equipment • Best value: ₹18,75,000</p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Scheduled */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-green-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Delivery Scheduled</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">21 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Surgical Instruments order #PO-2026-0832 scheduled for 5 Feb 2026</p>
                        </div>
                      </div>
                    </div>

                    {/* RFP Created */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-purple-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">RFP Created Successfully</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">21 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Biotechnology Reagents RFP generated by AI and saved as draft</p>
                        </div>
                      </div>
                    </div>

                    {/* Negotiation Started */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-amber-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Negotiation Initiated</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">20 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Price negotiation started with Nordic Pharma Equipment for Processing Equipment</p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Certification Verified */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-green-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Vendor Certification Verified</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">20 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Clinical Diagnostics Corp's ISO 13485 certification verified by AI</p>
                        </div>
                      </div>
                    </div>

                    {/* Multiple Quotes Received */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-[#3B82F6]">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Multiple Quotes Received</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">19 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">4 new quotations received for Sterilization Equipment RFP • Range: ₹6.5L - ₹9.2L</p>
                        </div>
                      </div>
                    </div>

                    {/* Contract Signed */}
                    <div className="py-3 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors border-l-2 border-transparent hover:border-green-500">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-gray-900">Contract Digitally Signed</p>
                            <span className="text-xs text-gray-400 flex-shrink-0">18 Jan</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Purchase agreement with Japan Medical Innovation finalized • ₹32,80,000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-[#eeeff1] p-4">
                <button className="w-full h-10 text-sm font-medium text-[#3B82F6] hover:bg-blue-50 rounded-lg transition-colors">
                  Mark all as read
                </button>
              </div>
            </div>
          </div>
        )}

        <main
          className={`flex-1 h-screen overflow-hidden transition-all duration-300 ${currentScreen === 'ai-rfp-creator'
            ? ''
            : currentScreen === 'ai-rfp-creator-centered'
              ? 'ml-[88px]'
              : sidebarCollapsed
                ? 'ml-[88px] p-4'
                : 'ml-72 p-4'
            }`}
        >
          <div className={`h-full ${currentScreen === 'ai-rfp-creator' || currentScreen === 'ai-rfp-creator-centered' ? '' : 'max-w-[980px] mx-auto'
            }`}>
            {renderScreen()}
          </div>
        </main>
      </div>
    </>
  );
}