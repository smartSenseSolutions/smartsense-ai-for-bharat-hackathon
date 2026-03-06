import { Package, CheckCircle, IndianRupee, MapPin, Calendar, ChevronRight, ArrowLeft, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import type { Screen } from '@/app/App';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClosurePhase } from '@/app/components/screens/ClosurePhaseNew';
import { API_BASE } from '@/app/config';

interface OrdersHistoryProps {
  onNavigate: (screen: Screen) => void;
}

export function OrdersHistory({ onNavigate }: OrdersHistoryProps) {
  const [selectedClosure, setSelectedClosure] = useState<any | null>(null);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/projects/history`);
        if (response.ok) {
          const data = await response.json();
          setClosedOrders(data);
        }
      } catch (error) {
        console.error('Error fetching closures history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (selectedClosure) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-[#eeeff1]">
          <div className="px-8 py-6">
            <button
              onClick={() => setSelectedClosure(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Closures</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{selectedClosure.projectName}</h1>
            <p className="text-sm text-gray-500 mt-1">{selectedClosure.id}</p>
          </div>
        </div>

        {/* Closure Phase Content */}
        <ClosurePhase proposal={selectedClosure} dealData={selectedClosure.fullData} />
      </div>
    );
  }

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-[#eeeff1] rounded-lg p-6 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-6 w-64 bg-gray-100 rounded-md"></div>
                <div className="h-5 w-20 bg-green-50 rounded-full"></div>
              </div>
              <div className="grid grid-cols-4 gap-6 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j}>
                    <div className="h-3 w-16 bg-gray-50 rounded mb-1"></div>
                    <div className="h-4 w-24 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j}>
                    <div className="h-3 w-16 bg-gray-50 rounded mb-1"></div>
                    <div className="h-4 w-24 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white">
        <div className="px-8 py-6 border-b border-[#eeeff1]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Closures</h1>
              <p className="text-sm text-gray-500 mt-1">View all completed procurement closures</p>
            </div>
            {!loading && closedOrders.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{closedOrders.length} Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PO number, vendor, or category..."
              className="w-full h-10 pl-10 pr-4 text-sm border border-[#eeeff1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-100 rounded-full animate-spin border-t-blue-500"></div>
                    <Sparkles className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Fetching closed deals...</p>
                </div>
              </div>
              <LoadingSkeleton />
            </motion.div>
          ) : closedOrders.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No closed deals found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs text-center">
                Completed projects will appear here once the deals are finalized.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              className="grid grid-cols-1 gap-4"
            >
              {closedOrders.map((order, index) => (
                <motion.button
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedClosure(order)}
                  className="w-full text-left bg-white border border-[#eeeff1] rounded-lg p-6 hover:border-[#3B82F6] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-base font-semibold text-gray-900">{order.projectName}</h3>
                        <Badge className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-0">
                          {order.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-6 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">PO Number</p>
                          <p className="text-sm font-medium text-gray-900">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Vendor</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900">{order.vendor}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Location</p>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-sm text-gray-700">{order.location}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Category</p>
                          <p className="text-sm text-gray-700">{order.category}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total Value</p>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5 text-gray-700" />
                            <p className="text-sm font-semibold text-gray-900">
                              {order.totalValue?.toLocaleString('en-IN') || '0'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Savings</p>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                            <p className="text-sm font-semibold text-green-600">
                              {order.savings?.toLocaleString('en-IN') || '0'} ({order.savingsPercentage}%)
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Closed Date</p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-sm text-gray-700">{order.closedDate}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Expected Delivery</p>
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-sm text-gray-700">{order.deliveryDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}