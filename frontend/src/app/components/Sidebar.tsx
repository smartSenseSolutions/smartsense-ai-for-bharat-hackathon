import { LayoutDashboard, FileText, Globe, Package, Settings, LogOut, ChevronDown, ChevronRight, PanelLeftClose, User, HelpCircle, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { Screen } from '@/app/App';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

export function Sidebar({ currentScreen, onNavigate, collapsed, onToggleCollapse, userEmail, onLogout }: SidebarProps) {
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'RK';
  const displayEmail = userEmail ?? 'ramkrish@smartsense.com';
  const displayName = userEmail ? userEmail.split('@')[0] : 'Ram Krish';

  const menuItems = [
    { id: 'dashboard' as Screen, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'proposals-list' as Screen, label: 'Procurements', icon: FileText },
    { id: 'vendor-market' as Screen, label: 'Marketplace', icon: Globe },
    { id: 'vendor-onboarding' as Screen, label: 'Vendor Onboarding', icon: UserPlus },

    { id: 'orders-history' as Screen, label: 'Closures', icon: Package },
    { id: 'settings' as Screen, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed left-4 top-4 bottom-4 bg-white flex flex-col z-50 rounded-2xl shadow-sm transition-all duration-300 group ${collapsed ? 'w-[72px]' : 'w-64'
        }`}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center justify-center px-4 relative"
        onMouseEnter={() => collapsed && setShowExpandButton(true)}
        onMouseLeave={() => setShowExpandButton(false)}
      >
        {collapsed ? (
          <>
            <img src="/procure_ai_logo_transparent.png" alt="Procure AI Logo" className="w-9 h-9 object-contain flex-shrink-0" />
            {showExpandButton && (
              <button
                onClick={onToggleCollapse}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#3B82F6] rounded-md flex items-center justify-center hover:bg-[#2563EB] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <img src="/procure_ai_logo_transparent.png" alt="Procure AI Logo" className="w-9 h-9 object-contain flex-shrink-0" />
            <span className="text-lg font-semibold text-gray-900">Procure AI</span>
            <button
              onClick={onToggleCollapse}
              className="ml-auto w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <PanelLeftClose className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'proposals-list'
            ? (currentScreen === 'proposals-list' || currentScreen === 'proposal-details' || currentScreen === 'create-proposal' || currentScreen === 'project-name-entry' || currentScreen === 'ai-rfp-creator' || currentScreen === 'ai-rfp-creator-centered' || currentScreen === 'approval-pending')
            : currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                } ${isActive
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-gray-600 hover:bg-[#f5f5f5] hover:text-gray-900'
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`space-y-2 relative ${collapsed ? 'p-2' : 'p-3'}`}>
        {/* User Profile Card */}
        <button
          className={`w-full bg-gray-50 rounded-lg transition-all hover:bg-gray-100 ${collapsed ? 'p-2 flex justify-center' : 'p-3'
            }`}
          onClick={() => setShowLogoutPopup(!showLogoutPopup)}
        >
          {collapsed ? (
            <div className="w-9 h-9 bg-[#3B82F6] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#3B82F6] rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLogoutPopup ? 'rotate-180' : ''}`} />
            </div>
          )}
        </button>

        {/* User Profile Popup */}
        {showLogoutPopup && !collapsed && (
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-lg p-1.5 space-y-0.5 shadow-lg border border-gray-100">
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              onClick={() => {
                setShowLogoutPopup(false);
              }}
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span>Profile</span>
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              onClick={() => {
                setShowLogoutPopup(false);
                onNavigate('settings');
              }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>Settings</span>
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              onClick={() => {
                setShowLogoutPopup(false);
              }}
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>Help</span>
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              onClick={() => {
                setShowLogoutPopup(false);
                onLogout?.();
              }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
