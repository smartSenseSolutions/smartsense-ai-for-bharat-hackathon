import { Search, FileText, ClipboardCheck, DollarSign, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import type { Screen } from '@/app/App';
import { useState } from 'react';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onSearchClick: () => void;
}

export function Dashboard({ onNavigate, onSearchClick }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const metrics = [
    { label: 'Active RFPs', value: '5', subtext: 'Ongoing', icon: FileText, color: 'text-blue-600 bg-blue-50', trend: '+2', trendUp: true },
    { label: 'Pending Reviews', value: '3', subtext: 'Quotes Waiting', icon: ClipboardCheck, color: 'text-purple-600 bg-purple-50', trend: '+1', trendUp: true },
    { label: 'Total Savings', value: '$12k', subtext: 'This Month', icon: DollarSign, color: 'text-gray-600 bg-gray-50', trend: '+15%', trendUp: true },
    { label: 'Active Vendors', value: '28', subtext: 'Verified', icon: TrendingUp, color: 'text-blue-600 bg-blue-50', trend: '+4', trendUp: true },
  ];

  const recentActivities = [
    { id: 1, title: 'RFP-2026-004 sent to 3 vendors - awaiting responses', time: '2 hours ago', status: 'new', screen: 'communication-hub' as Screen },
    { id: 2, title: 'Quote received from Global Tech', time: '5 hours ago', screen: 'quote-intelligence' as Screen },
    { id: 3, title: 'RFP-2026-003 approved by Finance Department', time: 'Yesterday', screen: 'rfp-manager' as Screen },
    { id: 4, title: 'New vendor verified: Pacific Medical Supplies', time: '2 days ago', screen: 'vendor-market' as Screen },
    { id: 5, title: 'Negotiation completed with ABC Manufacturing', time: '3 days ago', screen: 'negotiation-hub' as Screen },
    { id: 6, title: 'Purchase Order PO-2026-015 created', time: '4 days ago', screen: 'orders-history' as Screen },
  ];

  const actionRequired = [
    { id: 1, title: 'Approve Draft RFP #006', priority: 'high', deadline: 'Today' },
    { id: 2, title: 'Review quotes for Office Supplies', priority: 'high', deadline: 'Today' },
    { id: 3, title: 'Sign Contract with Vendor ABC', priority: 'medium', deadline: 'Tomorrow' },
    { id: 4, title: 'Update vendor credentials for DEF Corp', priority: 'low', deadline: 'This week' },
  ];

  // Vendor data for search results
  const vendorData = [
    { id: 1, name: 'Global Tech', location: 'Mumbai', category: 'Lab Equipment', rating: 4.8, quotationsSubmitted: 'Today' },
    { id: 2, name: 'Pacific Medical Supplies', location: 'Bangalore', category: 'Medical Devices', rating: 4.6, quotationsSubmitted: 'Today' },
    { id: 3, name: 'ABC Manufacturing', location: 'Delhi', category: 'Surgical Equipment', rating: 4.9, quotationsSubmitted: 'Today' },
    { id: 4, name: 'MediTech Industries', location: 'Hyderabad', category: 'Diagnostic Tools', rating: 4.7, quotationsSubmitted: 'Today' },
    { id: 5, name: 'HealthCare Devices Ltd', location: 'Chennai', category: 'Medical Supplies', rating: 4.5, quotationsSubmitted: 'Today' },
    { id: 6, name: 'BioMed Supplies', location: 'Pune', category: 'Lab Equipment', rating: 4.8, quotationsSubmitted: 'Today' },
    { id: 7, name: 'Premium Medical Corp', location: 'Kolkata', category: 'PPE & Safety', rating: 4.6, quotationsSubmitted: 'Today' },
  ];

  const rfpData = [
    { id: 1, name: 'RFP-2026-004', status: 'Active', products: 'PCR Machines', deadline: '28 Jan 2026' },
    { id: 2, name: 'RFP-2026-003', status: 'Approved', products: 'Surgical Masks', deadline: '25 Jan 2026' },
    { id: 3, name: 'RFP-2026-006', status: 'Pending', products: 'Blood Glucose Monitors', deadline: '30 Jan 2026' },
    { id: 4, name: 'RFP-2026-007', status: 'Pending', products: 'X-Ray Film', deadline: '2 Feb 2026' },
    { id: 5, name: 'RFP-2026-005', status: 'Active', products: 'Lab Coats & PPE', deadline: '27 Jan 2026' },
  ];

  // Handle search
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = (e.target as HTMLInputElement).value;
      if (query.trim()) {
        setSearchQuery(query);
        setShowResults(true);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };

  // Determine what to show based on search query
  const getSearchResultType = () => {
    const query = searchQuery.toLowerCase();
    
    if (query.includes('vendor') && (query.includes('quotation') || query.includes('submitted'))) {
      return 'vendors';
    }
    if (query.includes('pending') && query.includes('rfp')) {
      return 'pending-rfps';
    }
    if (query.includes('active') && query.includes('rfp')) {
      return 'active-rfps';
    }
    
    // Default search across all
    return 'general';
  };

  const searchResultType = showResults ? getSearchResultType() : null;

  return (
    <div className="h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white pt-8 pb-6 -mx-8 px-8 mb-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome, Ram!</h1>
          <p className="text-sm text-gray-500">Your AI-powered procurement platform dashboard</p>
        </div>
        
        {/* AI Search Bar */}
        <div className="bg-white border border-[#eeeff1] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Search</h3>
            <Badge className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 font-medium">
              <Sparkles className="w-3 h-3 inline mr-1" />
              AI Powered
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input 
              placeholder='Ask anything, like "How many vendors submitted quotations today?"'
              className="pl-12 pr-4 h-14 border-[#eeeff1] text-sm focus:border-[#3B82F6] transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            {showResults && (
              <Button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent hover:bg-transparent h-auto p-0"
                onClick={handleClearSearch}
              >
                <span className="text-sm">✕</span>
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-1">Search across projects, vendors, quotations, or ask platform-related questions</p>
        </div>
      </div>

      {/* Search Results or Main Content */}
      {showResults ? (
        <div className="pb-8">
          {/* Search Results Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {searchResultType === 'vendors' && '7 Vendors submitted quotations today'}
              {searchResultType === 'pending-rfps' && '2 Pending RFPs'}
              {searchResultType === 'active-rfps' && '5 Active RFPs'}
              {searchResultType === 'general' && 'Search Results'}
            </h2>
            <p className="text-sm text-gray-500">
              Showing results for: "{searchQuery}"
            </p>
          </div>

          {/* Vendor Cards */}
          {searchResultType === 'vendors' && (
            <div className="grid grid-cols-3 gap-4">
              {vendorData.map((vendor) => (
                <div 
                  key={vendor.id}
                  className="bg-white border border-[#eeeff1] rounded-xl p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigate('vendor-market')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{vendor.name}</h3>
                      <p className="text-xs text-gray-500">{vendor.location}</p>
                    </div>
                    <Badge className="text-xs px-2 py-0.5 bg-green-50 text-green-700 font-medium">
                      {vendor.rating} ★
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Category:</span>
                      <span className="text-xs font-medium text-gray-900">{vendor.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Quotation:</span>
                      <Badge className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-medium">
                        {vendor.quotationsSubmitted}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending RFPs */}
          {searchResultType === 'pending-rfps' && (
            <div className="grid grid-cols-2 gap-4">
              {rfpData.filter(rfp => rfp.status === 'Pending').map((rfp) => (
                <div 
                  key={rfp.id}
                  className="bg-white border border-[#eeeff1] rounded-xl p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigate('rfp-manager')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{rfp.name}</h3>
                      <p className="text-xs text-gray-500">{rfp.products}</p>
                    </div>
                    <Badge className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 font-medium">
                      {rfp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Deadline:</span>
                    <span className="text-xs font-medium text-gray-900">{rfp.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active RFPs */}
          {searchResultType === 'active-rfps' && (
            <div className="grid grid-cols-2 gap-4">
              {rfpData.filter(rfp => rfp.status === 'Active').map((rfp) => (
                <div 
                  key={rfp.id}
                  className="bg-white border border-[#eeeff1] rounded-xl p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigate('rfp-manager')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{rfp.name}</h3>
                      <p className="text-xs text-gray-500">{rfp.products}</p>
                    </div>
                    <Badge className="text-xs px-2 py-0.5 bg-green-50 text-green-700 font-medium">
                      {rfp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Deadline:</span>
                    <span className="text-xs font-medium text-gray-900">{rfp.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* General Search - Show all */}
          {searchResultType === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Vendors</h3>
                <div className="grid grid-cols-3 gap-4">
                  {vendorData.slice(0, 3).map((vendor) => (
                    <div 
                      key={vendor.id}
                      className="bg-white border border-[#eeeff1] rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('vendor-market')}
                    >
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{vendor.name}</h4>
                      <p className="text-xs text-gray-500">{vendor.location}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">RFPs</h3>
                <div className="grid grid-cols-2 gap-4">
                  {rfpData.slice(0, 2).map((rfp) => (
                    <div 
                      key={rfp.id}
                      className="bg-white border border-[#eeeff1] rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('rfp-manager')}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">{rfp.name}</h4>
                          <p className="text-xs text-gray-500">{rfp.products}</p>
                        </div>
                        <Badge className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-medium">
                          {rfp.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Original Main Content
        <div className="pb-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              
              return (
                <div key={index} className="bg-white border border-[#eeeff1] rounded-xl p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`p-2.5 rounded-lg ${metric.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${metric.trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {metric.trendUp ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                      {metric.trend}
                    </span>
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-2">{metric.value}</h3>
                  <p className="text-sm text-gray-900 font-medium mb-1">{metric.label}</p>
                  <p className="text-xs text-gray-500">{metric.subtext}</p>
                </div>
              );
            })}
          </div>

          {/* Top Performing Vendors Analytics */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Top Performing Vendors</h2>
              <Badge className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 font-medium">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI Insights
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { 
                  id: 1, 
                  name: 'Global Tech', 
                  location: 'Mumbai', 
                  rating: 4.9,
                  totalOrders: 45,
                  onTimeDelivery: 98,
                  costSavings: 15,
                  responseTime: '2.3 hrs',
                  category: 'Lab Equipment'
                },
                { 
                  id: 2, 
                  name: 'ABC Manufacturing', 
                  location: 'Delhi', 
                  rating: 4.8,
                  totalOrders: 38,
                  onTimeDelivery: 95,
                  costSavings: 12,
                  responseTime: '3.1 hrs',
                  category: 'Surgical Equipment'
                },
                { 
                  id: 3, 
                  name: 'MediTech Industries', 
                  location: 'Hyderabad', 
                  rating: 4.7,
                  totalOrders: 32,
                  onTimeDelivery: 94,
                  costSavings: 10,
                  responseTime: '2.8 hrs',
                  category: 'Diagnostic Tools'
                },
                { 
                  id: 4, 
                  name: 'BioMed Supplies', 
                  location: 'Pune', 
                  rating: 4.8,
                  totalOrders: 29,
                  onTimeDelivery: 96,
                  costSavings: 11,
                  responseTime: '2.5 hrs',
                  category: 'Lab Equipment'
                },
              ].map((vendor) => (
                <div 
                  key={vendor.id}
                  className="bg-white border border-[#eeeff1] rounded-xl p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigate('vendor-market')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{vendor.name}</h3>
                      <p className="text-xs text-gray-500">{vendor.location}</p>
                    </div>
                    <Badge className="text-xs px-2 py-0.5 bg-green-50 text-green-700 font-medium">
                      {vendor.rating} ★
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">On-Time Delivery</span>
                        <span className="text-xs font-semibold text-gray-900">{vendor.onTimeDelivery}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${vendor.onTimeDelivery}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Orders</p>
                        <p className="text-sm font-semibold text-gray-900">{vendor.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Savings</p>
                        <p className="text-sm font-semibold text-green-600">+{vendor.costSavings}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[#eeeff1]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Avg Response</span>
                      <span className="text-xs font-medium text-gray-900">{vendor.responseTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-12 gap-4">
            {/* Recent Activities - Left 60% */}
            <div className="col-span-7">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-gray-900">Recent Activities</h2>
                <span className="text-xs text-gray-500">{recentActivities.length} updates</span>
              </div>
              <div className="bg-white border border-[#eeeff1] rounded-xl overflow-hidden">
                <div className="divide-y divide-[#eeeff1]">
                  {recentActivities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate(activity.screen)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 mb-1.5 font-medium">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                        {activity.status === 'new' && (
                          <Badge className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-medium">New</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Required - Right 40% */}
            <div className="col-span-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Action Required</h2>
                <Badge className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 font-medium">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI Prioritized
                </Badge>
              </div>
              <div className="bg-white border border-[#eeeff1] rounded-xl overflow-hidden">
                <div className="divide-y divide-[#eeeff1]">
                  {actionRequired.map((item) => (
                    <div key={item.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium mb-2">{item.title}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-500">Due: {item.deadline}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.priority === 'high' ? 'bg-red-50 text-red-700' : 
                              item.priority === 'medium' ? 'bg-orange-50 text-orange-700' : 
                              'bg-blue-50 text-blue-700'
                            } font-medium`}>
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                            </span>
                          </div>
                        </div>
                        <Button 
                          className="border border-[#3B82F6] bg-white hover:bg-blue-50 text-[#3B82F6] h-8 px-4 font-medium text-xs transition-colors ml-4"
                          onClick={() => {
                            if (item.title.includes('Draft RFP')) {
                              onNavigate('rfp-manager');
                            } else if (item.title.includes('Review quotes')) {
                              onNavigate('quote-intelligence');
                            }
                          }}
                        >
                          Take Action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}