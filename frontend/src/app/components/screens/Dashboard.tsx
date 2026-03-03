import { FileText, DollarSign, TrendingUp, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import type { Screen } from '@/app/App';
import { useState, useEffect } from 'react';

interface DashboardProps {
  userName?: string;
  onNavigate: (screen: Screen) => void;
  onSearchClick: () => void;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  project_id?: string;
  vendor_id?: string;
  is_new: boolean;
  created_at: string;
}

interface DashboardStats {
  active_rfps_count: number;
  total_savings: number;
  active_vendors_count: number;
  top_rfps: Array<{
    id: string;
    project_name: string;
    status: string;
    created_at: string;
  }>;
}

export function Dashboard({ userName, onNavigate, onSearchClick }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch('http://localhost:8000/api/stats/dashboard'),
          fetch('http://localhost:8000/api/activities')
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    let displayStatus = s;
    if (s === 'open' || s === 'pending') displayStatus = 'published';
    if (s === 'closed') displayStatus = 'completed';

    const cardStyles: Record<string, string> = {
      draft: 'bg-rose-50 border-rose-100',
      published: 'bg-amber-50 border-amber-100',
      'in-progress': 'bg-blue-50 border-blue-100',
      completed: 'bg-emerald-50 border-emerald-100',
    };

    const labels: Record<string, string> = {
      draft: 'Draft',
      published: 'Published',
      'in-progress': 'In Progress',
      completed: 'Completed',
    };

    return {
      cardClass: cardStyles[displayStatus] || 'bg-white border-[#eeeff1]',
      label: labels[displayStatus] || (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase())
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const metrics = [
    { label: 'Active RFPs', value: stats?.active_rfps_count.toString() || '0', subtext: 'Ongoing', icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Savings', value: `$${stats?.total_savings || 0}`, subtext: 'This Month', icon: DollarSign, color: 'text-gray-600 bg-gray-50' },
    { label: 'Active Vendors', value: stats?.active_vendors_count.toString() || '0', subtext: 'Verified', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white pt-8 pb-6 -mx-8 px-8 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome, {userName || 'User'}!</h1>
            <p className="text-sm text-gray-500">Your AI-powered procurement platform dashboard</p>
          </div>
          <Badge className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 font-medium">
            <Sparkles className="w-3 h-3 inline mr-1" />
            AI Insights Ready
          </Badge>
        </div>
      </div>

      <div className="pb-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white border border-[#eeeff1] rounded-xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className={`p-2.5 rounded-lg ${metric.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-semibold text-gray-900 mb-2">{metric.value}</h3>
                <p className="text-sm text-gray-900 font-medium mb-1">{metric.label}</p>
                <p className="text-xs text-gray-500">{metric.subtext}</p>
              </div>
            );
          })}
        </div>

        {/* Top Performing RFPs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Top Performing RFPs</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {stats?.top_rfps.map((rfp) => {
              const { cardClass, label } = getStatusStyles(rfp.status);
              return (
                <div
                  key={rfp.id}
                  className={`flex flex-col min-h-[140px] border rounded-xl p-5 hover:bg-gray-100/50 transition-all cursor-pointer ${cardClass}`}
                  onClick={() => onNavigate('rfp-manager')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{rfp.project_name}</h3>
                    </div>
                    <Badge className="text-[10px] px-2 py-0.5 font-medium bg-gray-200 text-gray-700 border-none shadow-none whitespace-nowrap">
                      {label}
                    </Badge>
                  </div>
                  <div className="flex justify-end mt-auto">
                    <p className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                      Created: {formatDate(rfp.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!stats?.top_rfps || stats.top_rfps.length === 0) && (
              <div className="col-span-4 py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                No active RFPs found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities - Full Width */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Activities</h2>
            <Badge variant="outline" className="text-xs font-normal text-gray-500">
              Latest updates
            </Badge>
          </div>
          <div className="bg-white border border-[#eeeff1] rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-[#eeeff1] max-h-[500px] overflow-y-auto scrollbar-hide">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm text-gray-900 font-semibold group-hover:text-blue-600 transition-colors">
                          {activity.title}
                        </p>
                        {activity.is_new && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-none font-bold uppercase tracking-wider">New</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{activity.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center text-[10px] text-gray-400 font-medium">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                        {activity.project_id && (
                          <span className="text-[10px] text-blue-500 font-medium">Project ID: {activity.project_id.split('-')[0]}...</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-medium"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (activity.project_id) onNavigate('rfp-manager');
                        else if (activity.vendor_id) onNavigate('vendor-market');
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="py-20 text-center text-gray-500">
                  <p className="text-sm">No recent activities found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}