import { Package, CheckCircle, IndianRupee, MapPin, Calendar, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import type { Screen } from '@/app/App';
import { useState } from 'react';
import { ClosurePhase } from '@/app/components/screens/ClosurePhaseNew';

interface OrdersHistoryProps {
  onNavigate: (screen: Screen) => void;
}

export function OrdersHistory({ onNavigate }: OrdersHistoryProps) {
  const [selectedClosure, setSelectedClosure] = useState<any | null>(null);

  const closedOrders = [
    {
      id: 'PO-2026-0047',
      projectName: 'Medical Equipment Procurement - Q1 2026',
      vendor: 'Global Electronics Supply',
      location: 'Mumbai, Maharashtra',
      totalValue: 9285000,
      closedDate: '23 Jan 2026',
      deliveryDate: '18 Mar 2026',
      status: 'Completed',
      category: 'Medical Devices',
      savings: 700000,
      savingsPercentage: 7,
    },
    {
      id: 'PO-2026-0042',
      projectName: 'Pharmaceutical Raw Materials - Batch 12',
      vendor: 'PharmaChem Industries',
      location: 'Hyderabad, Telangana',
      totalValue: 5450000,
      closedDate: '20 Jan 2026',
      deliveryDate: '5 Mar 2026',
      status: 'Completed',
      category: 'Pharmaceuticals',
      savings: 425000,
      savingsPercentage: 8,
    },
    {
      id: 'PO-2026-0038',
      projectName: 'Laboratory Equipment Upgrade',
      vendor: 'Scientific Solutions Pvt Ltd',
      location: 'Bengaluru, Karnataka',
      totalValue: 7820000,
      closedDate: '18 Jan 2026',
      deliveryDate: '28 Feb 2026',
      status: 'Completed',
      category: 'Lab Equipment',
      savings: 580000,
      savingsPercentage: 7,
    },
    {
      id: 'PO-2026-0035',
      projectName: 'Diagnostic Reagents Supply - Annual Contract',
      vendor: 'BioTech Diagnostics',
      location: 'Pune, Maharashtra',
      totalValue: 12500000,
      closedDate: '15 Jan 2026',
      deliveryDate: '20 Feb 2026',
      status: 'Completed',
      category: 'Diagnostics',
      savings: 950000,
      savingsPercentage: 8,
    },
    {
      id: 'PO-2026-0031',
      projectName: 'Surgical Instruments Procurement',
      vendor: 'MediTech Instruments',
      location: 'Chennai, Tamil Nadu',
      totalValue: 4680000,
      closedDate: '12 Jan 2026',
      deliveryDate: '15 Feb 2026',
      status: 'Completed',
      category: 'Surgical Equipment',
      savings: 320000,
      savingsPercentage: 6,
    },
    {
      id: 'PO-2026-0028',
      projectName: 'Hospital Furniture & Fixtures',
      vendor: 'HealthCare Solutions Ltd',
      location: 'Delhi, NCR',
      totalValue: 3250000,
      closedDate: '10 Jan 2026',
      deliveryDate: '10 Feb 2026',
      status: 'Completed',
      category: 'Furniture',
      savings: 275000,
      savingsPercentage: 8,
    },
    {
      id: 'PO-2026-0024',
      projectName: 'Medical Imaging Supplies',
      vendor: 'ImageCare Technologies',
      location: 'Kolkata, West Bengal',
      totalValue: 8950000,
      closedDate: '8 Jan 2026',
      deliveryDate: '8 Feb 2026',
      status: 'Completed',
      category: 'Imaging',
      savings: 650000,
      savingsPercentage: 7,
    },
    {
      id: 'PO-2026-0019',
      projectName: 'Patient Monitoring Systems',
      vendor: 'VitalCare Electronics',
      location: 'Ahmedabad, Gujarat',
      totalValue: 11200000,
      closedDate: '5 Jan 2026',
      deliveryDate: '5 Feb 2026',
      status: 'Completed',
      category: 'Monitoring Systems',
      savings: 880000,
      savingsPercentage: 8,
    },
    {
      id: 'PO-2026-0015',
      projectName: 'Sterilization Equipment',
      vendor: 'SteriliTech Solutions',
      location: 'Jaipur, Rajasthan',
      totalValue: 6750000,
      closedDate: '3 Jan 2026',
      deliveryDate: '1 Feb 2026',
      status: 'Completed',
      category: 'Sterilization',
      savings: 475000,
      savingsPercentage: 7,
    },
    {
      id: 'PO-2026-0012',
      projectName: 'Clinical Laboratory Consumables',
      vendor: 'LabSupply India',
      location: 'Lucknow, Uttar Pradesh',
      totalValue: 2850000,
      closedDate: '1 Jan 2026',
      deliveryDate: '25 Jan 2026',
      status: 'Completed',
      category: 'Consumables',
      savings: 215000,
      savingsPercentage: 8,
    },
  ];

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
        <ClosurePhase proposal={selectedClosure} />
      </div>
    );
  }

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
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{closedOrders.length} Completed</span>
            </div>
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

        <div className="grid grid-cols-1 gap-4">
          {closedOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedClosure(order)}
              className="w-full text-left bg-white border border-[#eeeff1] rounded-lg p-6 hover:border-[#3B82F6] transition-all group"
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
                          {order.totalValue.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Savings</p>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                        <p className="text-sm font-semibold text-green-600">
                          {order.savings.toLocaleString('en-IN')} ({order.savingsPercentage}%)
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
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}