import { FileText, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

import type { Screen } from '@/app/App';
import { useState, useEffect } from 'react';
import { API_BASE } from '@/app/config';
import { motion } from 'motion/react';


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
  total_rfps_count: number;
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
          fetch(`${API_BASE}/api/stats/dashboard`),
          fetch(`${API_BASE}/api/activities`)
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

    const badgeStyles: Record<string, string> = {
      draft: 'bg-rose-100 text-rose-700',
      published: 'bg-[#FEF3C7] text-[#92400E]', // Yellow/Amber for published
      'in-progress': 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-800',
    };

    const labels: Record<string, string> = {
      draft: 'Draft',
      published: 'Published',
      'in-progress': 'In Progress',
      completed: 'Completed',
    };

    return {
      badgeClass: badgeStyles[displayStatus] || 'bg-gray-100 text-gray-700',
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

  const formatIndianNumber = (num: number, isCurrency: boolean = false) => {
    let result = '';
    if (num >= 10000000) {
      result = (num / 10000000).toFixed(1).replace(/\.0$/, '') + ' Cr';
    } else if (num >= 100000) {
      result = (num / 100000).toFixed(1).replace(/\.0$/, '') + ' Lac';
    } else if (num >= 1000) {
      result = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    } else {
      result = num.toString();
    }
    return isCurrency ? `₹${result}` : result;
  };

  const metrics = [
    { label: 'All RFPs', value: formatIndianNumber(stats?.total_rfps_count || 0), subtext: 'Overall', image: '/document.gif', color: 'bg-[#Eff6ff]', link: 'proposals-list' as Screen },
    { label: 'Total Savings', value: formatIndianNumber(stats?.total_savings || 0, true), subtext: 'Overall', image: '/money.gif', color: 'bg-[#fefce8]' },
    { label: 'Active Vendors', value: formatIndianNumber(stats?.active_vendors_count || 0), subtext: 'Verified', image: '/search.gif', color: 'bg-[#Eff6ff]' },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-8 pb-8">
      {/* Header */}
      <div className="bg-white pt-8 pb-6 -mx-8 px-8 mb-4">
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
        <div className="grid grid-cols-3 gap-6 mb-10">
          {metrics.map((metric, index) => {
            return (
              <div
                key={index}
                className={`bg-white border border-[#eeeff1] rounded-2xl p-7 transition-all ${metric.link ? 'cursor-pointer hover:border-blue-200 hover:shadow-sm' : ''}`}
                onClick={() => metric.link && onNavigate(metric.link)}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${metric.color} flex-shrink-0 flex items-center justify-center`}>
                    <img src={metric.image} alt={metric.label} className="w-16 h-16 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[34px] font-bold text-gray-900 mb-0.5 leading-none">{metric.value}</h3>
                    <p className="text-sm text-gray-900 font-bold mb-0.5">{metric.label}</p>
                    <p className="text-xs text-gray-400 font-medium">{metric.subtext}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Active RFPs</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {stats?.top_rfps.map((rfp) => {
              const { badgeClass, label } = getStatusStyles(rfp.status);
              return (
                <div
                  key={rfp.id}
                  className="flex flex-col min-h-[140px] border border-gray-100 bg-gray-50 rounded-xl p-5 hover:bg-gray-100 transition-all cursor-pointer"
                  onClick={() => onNavigate('rfp-manager')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{rfp.project_name}</h3>
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 font-medium border-none shadow-none whitespace-nowrap ${badgeClass}`}>
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
                No active RFPs (In Progress) found.
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
            <div className="divide-y divide-[#eeeff1]">
              {activities.slice(0, 5).map((activity) => {
                const activityTime = new Date(activity.created_at + (activity.created_at.includes('Z') ? '' : 'Z')).getTime();
                const now = new Date().getTime();
                const diffMins = (now - activityTime) / (1000 * 60);
                const isRecent = diffMins < 3;

                const formattedTime = new Date(activity.created_at + (activity.created_at.includes('Z') ? '' : 'Z')).toLocaleString('en-GB', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                  hour12: false
                });

                return (
                  <div
                    key={activity.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm text-gray-900 font-semibold">
                            {activity.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {(activity.description ?? '').replace(/\b(published|draft|pending|completed|closed|open)\b/gi, match => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase())}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center text-[10px] text-gray-400 font-medium">
                            <Clock className="w-3 h-3 mr-1" />
                            {formattedTime}
                          </span>
                          {activity.project_id && (
                            <span className="text-[10px] text-blue-500 font-medium">Project ID: {activity.project_id}</span>
                          )}
                        </div>
                      </div>
                      {isRecent && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-none font-bold uppercase tracking-wider shrink-0 mt-0.5">New</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
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