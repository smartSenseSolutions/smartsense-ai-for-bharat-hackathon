import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Login } from '@/app/components/screens/Login';
import { Bell, Globe, FileText, MessageSquare, TrendingUp, AlertCircle, CheckCircle, Clock, Users, Package } from 'lucide-react';
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
  rfpExpiry?: string;
  createdAt: Date;
}

interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  company_logo_url?: string;
  is_superuser: boolean;
  is_active: boolean;
  password_last_changed_at?: string;
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
  const [selectedProposal, setSelectedProposal] = useState<any>(() => {
    const stored = localStorage.getItem('app_selectedProposal');
    return stored ? JSON.parse(stored) : null;
  });
  const [currentProjectName, setCurrentProjectName] = useState<string>(() => {
    return localStorage.getItem('app_currentProjectName') || '';
  });
  const [currentRFPData, setCurrentRFPData] = useState<any>(() => {
    const stored = localStorage.getItem('app_currentRFPData');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    localStorage.setItem('app_currentScreen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('app_currentProjectName', currentProjectName);
  }, [currentProjectName]);

  useEffect(() => {
    if (selectedProposal) {
      localStorage.setItem('app_selectedProposal', JSON.stringify(selectedProposal));
    } else {
      localStorage.removeItem('app_selectedProposal');
    }
  }, [selectedProposal]);

  useEffect(() => {
    if (currentRFPData) {
      localStorage.setItem('app_currentRFPData', JSON.stringify(currentRFPData));
    } else {
      localStorage.removeItem('app_currentRFPData');
    }
  }, [currentRFPData]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Settings state
  const [settingsFullName, setSettingsFullName] = useState(authUser?.full_name || '');
  const [settingsEmail, setSettingsEmail] = useState(authUser?.email || '');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    // Refresh user profile from server to get latest full_name and password_last_changed_at
    if (!authToken) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const fresh = await res.json();
          const newUser = { ...authUser, ...fresh };
          setAuthUser(newUser);
          localStorage.setItem('auth_user', JSON.stringify(newUser));
        }
      } catch {
        // ignore — fallback to stored user
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    setSettingsFullName(authUser?.full_name || '');
    setSettingsEmail(authUser?.email || '');
  }, [authUser]);

  const handleSaveProfile = async () => {
    if (!authToken) return;
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ full_name: settingsFullName }),
      });
      if (res.ok) {
        const updated = await res.json();
        const newUser = { ...authUser, ...updated };
        setAuthUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      }
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!authToken || !newPassword || newPassword !== confirmPassword) return;
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        const updated = await res.json();
        const newUser = { ...authUser, ...updated };
        setAuthUser(newUser);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Failed to change password', err);
    } finally {
      setPasswordSaving(false);
    }
  };

  const getPasswordLastChangedText = () => {
    if (!authUser?.password_last_changed_at) return 'Never changed';
    const changed = new Date(authUser.password_last_changed_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Changed today';
    if (diffDays === 1) return 'Changed yesterday';
    return `Last changed ${diffDays} days ago`;
  };

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
            rfpExpiry: p.rfp_expiry || null,
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


  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            userName={authUser?.full_name}
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
                if (data.isNew) {
                  setSelectedProposal(null);
                  setCurrentRFPData(null);
                }
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
                    company_logo_url: authUser?.company_logo_url ?? null,
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
                          value={settingsFullName}
                          onChange={(e) => setSettingsFullName(e.target.value)}
                          className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={settingsEmail}
                          readOnly
                          className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white border border-[#eeeff1] rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Change Password</p>
                        <p className="text-xs text-gray-500 mt-0.5">{getPasswordLastChangedText()}</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="text-xs px-3 py-1 text-[#3B82F6] bg-blue-50 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={settingsSaving}
                    className="px-6 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {settingsSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                {/* Change Password Modal */}
                {showPasswordModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full h-10 px-3 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                          />
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleChangePassword}
                          disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
                          className="px-4 py-2 text-sm text-white bg-[#3B82F6] rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {passwordSaving ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
          fullName={authUser?.full_name}
          onLogout={handleLogout}
        />





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