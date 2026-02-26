import { Languages, Send, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';

// Queries Phase Component with Gmail-style UI
export function QueriesPhaseGmail({ proposal }: { proposal: any }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);

  const queries = [
    {
      id: 1,
      vendor: 'TechDistributor Inc.',
      email: 'contact@techdist.com',
      subject: 'Technical Specifications Query',
      timestamp: '21 Jan 2026 14:30',
      status: 'pending',
      priority: 'high',
      thread: [
        {
          id: 1,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 14:30',
          originalLanguage: 'Hindi',
          originalMessage: 'क्या हम तकनीकी विनिर्देशों के बारे में अधिक जानकारी प्राप्त कर सकते हैं?',
          translatedMessage: 'Can we have more details about the technical specifications?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@techdist.com',
          timestamp: '21 Jan 2026 16:15',
          originalLanguage: 'English',
          originalMessage: 'Thank you for your inquiry. The technical specifications include: Material composition (Nitrile latex-free), minimum thickness of 0.2mm, powder-free with textured fingertips, and must be FDA approved with ISO 13485 certification.',
          translatedMessage: 'Thank you for your inquiry. The technical specifications include: Material composition (Nitrile latex-free), minimum thickness of 0.2mm, powder-free with textured fingertips, and must be FDA approved with ISO 13485 certification.',
          type: 'sent',
        },
        {
          id: 3,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 09:20',
          originalLanguage: 'Hindi',
          originalMessage: 'इस जानकारी के लिए धन्यवाद। क्या पंचर प्रतिरोध के संबंध में कोई विशिष्ट आवश्यकताएं हैं?',
          translatedMessage: 'Thank you for this information. Do you have specific requirements regarding puncture resistance?',
          type: 'received',
        },
        {
          id: 4,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@techdist.com',
          timestamp: '22 Jan 2026 11:45',
          originalLanguage: 'English',
          originalMessage: 'Yes, the gloves must meet ASTM D6319 standards for puncture resistance. Additionally, they should have a minimum tensile strength of 14 MPa and elongation at break of 500%.',
          translatedMessage: 'Yes, the gloves must meet ASTM D6319 standards for puncture resistance. Additionally, they should have a minimum tensile strength of 14 MPa and elongation at break of 500%.',
          type: 'sent',
        },
        {
          id: 5,
          from: 'contact@techdist.com',
          fromName: 'TechDistributor Inc.',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 14:30',
          originalLanguage: 'Hindi',
          originalMessage: 'बिल्कुल सही। हमारे दस्ताने इन सभी मानकों को पूरा करते हैं। क्या आप आवश्यक आकार और प्रति आकार मात्रा वितरण की पुष्टि कर सकते हैं?',
          translatedMessage: 'Perfect. Our gloves meet all these standards. Can you confirm the required sizes and quantity distribution per size?',
          type: 'received',
        },
      ],
    },
    {
      id: 2,
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      subject: 'Warranty Terms Clarification',
      timestamp: '21 Jan 2026 11:15',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'info@globalsupply.com',
          fromName: 'Global Electronics Supply',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 11:15',
          originalLanguage: 'Tamil',
          originalMessage: 'உத்தரவாத விதிமுறைகள் என்ன?',
          translatedMessage: 'What are the warranty terms?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@globalsupply.com',
          timestamp: '21 Jan 2026 15:30',
          originalLanguage: 'English',
          originalMessage: 'We offer a comprehensive 3-year warranty covering manufacturing defects and performance issues.',
          translatedMessage: 'We offer a comprehensive 3-year warranty covering manufacturing defects and performance issues.',
          type: 'sent',
        },
      ],
    },
    {
      id: 3,
      vendor: 'Enterprise Solutions Co.',
      email: 'sales@enterprise.com',
      subject: 'Payment Schedule Information',
      timestamp: '20 Jan 2026 16:45',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'sales@enterprise.com',
          fromName: 'Enterprise Solutions Co.',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 16:45',
          originalLanguage: 'English',
          originalMessage: 'What is the payment schedule?',
          translatedMessage: 'What is the payment schedule?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@enterprise.com',
          timestamp: '21 Jan 2026 09:20',
          originalLanguage: 'English',
          originalMessage: 'Payment will be made in 3 installments: 30% upfront, 40% upon delivery, and 30% after installation.',
          translatedMessage: 'Payment will be made in 3 installments: 30% upfront, 40% upon delivery, and 30% after installation.',
          type: 'sent',
        },
        {
          id: 3,
          from: 'sales@enterprise.com',
          fromName: 'Enterprise Solutions Co.',
          to: 'procurement@company.com',
          timestamp: '21 Jan 2026 14:10',
          originalLanguage: 'English',
          originalMessage: 'Thank you for the clarification. This payment schedule works for us.',
          translatedMessage: 'Thank you for the clarification. This payment schedule works for us.',
          type: 'received',
        },
      ],
    },
    {
      id: 4,
      vendor: 'MedSupply International',
      email: 'orders@medsupply.com',
      subject: 'Delivery Timeframe Question',
      timestamp: '20 Jan 2026 09:20',
      status: 'pending',
      priority: 'high',
      thread: [
        {
          id: 1,
          from: 'orders@medsupply.com',
          fromName: 'MedSupply International',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 09:20',
          originalLanguage: 'Telugu',
          originalMessage: 'డెలివరీ కాలపరిమితి ఏమిటి?',
          translatedMessage: 'What is the delivery timeframe?',
          type: 'received',
        },
      ],
    },
    {
      id: 5,
      vendor: 'BioMed Supplies',
      email: 'contact@biomedsupplies.com',
      subject: 'Product Certification Inquiry',
      timestamp: '19 Jan 2026 15:30',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'contact@biomedsupplies.com',
          fromName: 'BioMed Supplies',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 15:30',
          originalLanguage: 'English',
          originalMessage: 'Do you require CE marking and ISO 13485 certification for all products?',
          translatedMessage: 'Do you require CE marking and ISO 13485 certification for all products?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@biomedsupplies.com',
          timestamp: '20 Jan 2026 08:15',
          originalLanguage: 'English',
          originalMessage: 'Yes, CE marking and ISO 13485 certification are mandatory requirements for all medical-grade products.',
          translatedMessage: 'Yes, CE marking and ISO 13485 certification are mandatory requirements for all medical-grade products.',
          type: 'sent',
        },
      ],
    },
    {
      id: 6,
      vendor: 'HealthCare Innovations',
      email: 'sales@healthcareinnovations.com',
      subject: 'Bulk Pricing Request',
      timestamp: '19 Jan 2026 10:45',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'sales@healthcareinnovations.com',
          fromName: 'HealthCare Innovations',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 10:45',
          originalLanguage: 'Bengali',
          originalMessage: 'আপনি কি 100,000 ইউনিটের বেশি অর্ডারের জন্য আমাদের ভলিউম ছাড় দিতে পারেন?',
          translatedMessage: 'Can you offer us a volume discount for orders over 100,000 units?',
          type: 'received',
        },
      ],
    },
    {
      id: 7,
      vendor: 'Medical Devices Corp',
      email: 'info@meddevicescorp.com',
      subject: 'Shipping Logistics Question',
      timestamp: '18 Jan 2026 14:20',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'info@meddevicescorp.com',
          fromName: 'Medical Devices Corp',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 14:20',
          originalLanguage: 'Marathi',
          originalMessage: 'तातडीच्या ऑर्डरसाठी कोणते शिपिंग पर्याय उपलब्ध आहेत?',
          translatedMessage: 'What shipping options are available for urgent orders?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@meddevicescorp.com',
          timestamp: '19 Jan 2026 09:00',
          originalLanguage: 'English',
          originalMessage: 'We offer express shipping with 3-5 day delivery and standard shipping with 10-14 day delivery.',
          translatedMessage: 'We offer express shipping with 3-5 day delivery and standard shipping with 10-14 day delivery.',
          type: 'sent',
        },
      ],
    },
    {
      id: 8,
      vendor: 'Lab Equipment Solutions',
      email: 'support@labequipmentsolutions.com',
      subject: 'Customization Options',
      timestamp: '18 Jan 2026 11:00',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'support@labequipmentsolutions.com',
          fromName: 'Lab Equipment Solutions',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 11:00',
          originalLanguage: 'English',
          originalMessage: 'Are custom sizes or packaging configurations available for this product line?',
          translatedMessage: 'Are custom sizes or packaging configurations available for this product line?',
          type: 'received',
        },
      ],
    },
    {
      id: 9,
      vendor: 'PharmaSupply Global',
      email: 'orders@pharmasupplyglobal.com',
      subject: 'Storage Requirements Query',
      timestamp: '17 Jan 2026 16:30',
      status: 'responded',
      thread: [
        {
          id: 1,
          from: 'orders@pharmasupplyglobal.com',
          fromName: 'PharmaSupply Global',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 16:30',
          originalLanguage: 'Gujarati',
          originalMessage: 'ઉત્પાદનો માટે સંગ્રહની આવશ્યકતાઓ શું છે?',
          translatedMessage: 'What are the storage requirements for the products?',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@pharmasupplyglobal.com',
          timestamp: '18 Jan 2026 10:15',
          originalLanguage: 'English',
          originalMessage: 'Products should be stored in a cool, dry place at temperatures between 15-25°C with humidity below 60%.',
          translatedMessage: 'Products should be stored in a cool, dry place at temperatures between 15-25°C with humidity below 60%.',
          type: 'sent',
        },
      ],
    },
    {
      id: 10,
      vendor: 'Clinical Supplies Ltd',
      email: 'procurement@clinicalsupplies.com',
      subject: 'Minimum Order Quantity',
      timestamp: '17 Jan 2026 09:15',
      status: 'pending',
      thread: [
        {
          id: 1,
          from: 'procurement@clinicalsupplies.com',
          fromName: 'Clinical Supplies Ltd',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 09:15',
          originalLanguage: 'Kannada',
          originalMessage: 'ಈ ಉತ್ಪನ್ನಕ್ಕೆ ಕನಿಷ್ಠ ಆದೇಶ ಪ್ರಮಾಣ ಎಷ್ಟು?',
          translatedMessage: 'What is the minimum order quantity for this product?',
          type: 'received',
        },
      ],
    },
  ];

  const filteredQueries = queries.filter((query) => {
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;
    
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      query.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Update selected query when filter changes
  const handleFilterChange = (filter: 'all' | 'pending' | 'responded') => {
    setStatusFilter(filter);
  };

  const handleEmailClick = (query: any) => {
    setSelectedQuery(query);
    setEmailThreadOpen(true);
  };

  // Get preview text from first message
  const getPreviewText = (query: any) => {
    const firstMessage = query.thread[0];
    return firstMessage.translatedMessage || firstMessage.originalMessage;
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Vendor Queries</h2>
            <p className="text-sm text-gray-500">Manage vendor questions with AI-powered translation</p>
          </div>
        </div>

        {/* Search Bar with Status Filter */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-white border-gray-200 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({queries.length})
            </button>
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === 'pending'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread ({queries.filter(q => q.status === 'pending').length})
            </button>
            <button
              onClick={() => handleFilterChange('responded')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === 'responded'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Read ({queries.filter(q => q.status === 'responded').length})
            </button>
          </div>
        </div>

        {/* Gmail-style Email List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {filteredQueries.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredQueries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => handleEmailClick(query)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group text-left"
                >
                  {/* Unread Indicator */}
                  <div className="flex-shrink-0">
                    {query.status === 'pending' ? (
                      <div className="w-2 h-2 bg-[#3B82F6] rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2"></div>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {query.vendor.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className={`text-sm ${query.status === 'pending' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {query.vendor}
                      </span>
                      {query.priority === 'high' && (
                        <Badge className="text-xs px-1.5 py-0 border-0 bg-red-50 text-red-700">
                          High Priority
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${query.status === 'pending' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {query.subject}
                      </span>
                      <span className="text-sm text-gray-500">-</span>
                      <span className="text-sm text-gray-500 truncate">
                        {getPreviewText(query).substring(0, 80)}...
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {query.timestamp.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">No queries found</p>
            </div>
          )}
        </div>
      </div>

      {/* Gmail-style Email Thread Side Panel */}
      {emailThreadOpen && selectedQuery && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setEmailThreadOpen(false)}
          />
          
          {/* Side Panel */}
          <div className="absolute top-0 right-0 h-full w-[700px] bg-white shadow-lg flex flex-col" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="bg-white border-b border-[#eeeff1] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selectedQuery.subject}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedQuery.email}</p>
              </div>
              <button
                onClick={() => setEmailThreadOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Thread Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedQuery.thread.map((message: any, index: number) => (
                <div key={message.id} className={`mb-6 ${index === selectedQuery.thread.length - 1 ? 'mb-0' : ''}`}>
                  {/* Message Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'sent' ? 'bg-[#3B82F6]' : 'bg-gray-300'
                    }`}>
                      <span className={`text-sm font-medium ${message.type === 'sent' ? 'text-white' : 'text-gray-700'}`}>
                        {message.fromName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{message.fromName}</span>
                          {message.originalLanguage !== 'English' && message.type === 'received' && (
                            <Badge variant="outline" className="text-xs border-[#3B82F6] text-[#3B82F6] bg-blue-50 px-1.5 py-0">
                              <Languages className="w-3 h-3 mr-1" />
                              Translated
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-500">to {message.to}</p>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="ml-13 space-y-3">
                    {message.originalLanguage !== 'English' && message.type === 'received' ? (
                      <>
                        {/* Translated Message (Primary) */}
                        <div className="text-sm text-gray-900 leading-relaxed">
                          {message.translatedMessage}
                        </div>
                        {/* Original Message (Collapsed) */}
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <Languages className="w-3.5 h-3.5" />
                            Show original ({message.originalLanguage})
                          </summary>
                          <p className="mt-2 text-gray-600 italic pl-4 border-l-2 border-gray-200">
                            {message.originalMessage}
                          </p>
                        </details>
                      </>
                    ) : (
                      <div className="text-sm text-gray-900 leading-relaxed">
                        {message.originalMessage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Section */}
            <div className="border-t border-[#eeeff1] bg-white">
              <div className="px-6 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">YO</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2">Reply to {selectedQuery.vendor}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <textarea
                    placeholder="Type your reply..."
                    className="w-full min-h-[120px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {selectedQuery.thread[selectedQuery.thread.length - 1].originalLanguage !== 'English' && (
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                          <Languages className="w-3 h-3 mr-1" />
                          Auto-translate to {selectedQuery.thread[selectedQuery.thread.length - 1].originalLanguage}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setEmailThreadOpen(false)}
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          toast.success(`Reply sent to ${selectedQuery.vendor}`);
                          setEmailThreadOpen(false);
                        }}
                        className="bg-[#3B82F6] text-white hover:bg-[#2563EB] text-sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}