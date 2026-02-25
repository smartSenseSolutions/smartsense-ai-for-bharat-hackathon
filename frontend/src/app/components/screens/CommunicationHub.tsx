import { Mail, Search, Paperclip, Send, Languages, ArrowLeft, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

interface CommunicationHubProps {
  onNavigate: (screen: any) => void;
}

export function CommunicationHub({ onNavigate }: CommunicationHubProps) {
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);

  // Mock email threads from different projects
  const emailThreads = [
    {
      id: 1,
      projectName: 'Medical Grade N95 Respirators',
      vendor: 'MedTech Surgical Supplies',
      email: 'sales@medtechsurgical.com',
      subject: 'ISO 13485 Certification Documentation Request',
      timestamp: '23 Jan 2026 09:30',
      status: 'pending',
      priority: 'high',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'sales@medtechsurgical.com',
          timestamp: '23 Jan 2026 09:30',
          originalLanguage: 'English',
          originalMessage: 'Dear Team, We require your latest ISO 13485 certification documents for our vendor qualification process. Please share at your earliest convenience.',
          translatedMessage: 'Dear Team, We require your latest ISO 13485 certification documents for our vendor qualification process. Please share at your earliest convenience.',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@medtechsurgical.com',
          fromName: 'MedTech Surgical Supplies',
          to: 'procurement@hospital.com',
          timestamp: '23 Jan 2026 11:15',
          originalLanguage: 'English',
          originalMessage: 'Hello, Thank you for your inquiry. Please find attached our updated ISO 13485 certificate valid until Dec 2027. We have also included our FDA approval documentation.',
          translatedMessage: 'Hello, Thank you for your inquiry. Please find attached our updated ISO 13485 certificate valid until Dec 2027. We have also included our FDA approval documentation.',
          type: 'received',
          hasAttachment: true,
        },
        {
          id: 3,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'sales@medtechsurgical.com',
          timestamp: '23 Jan 2026 14:20',
          originalLanguage: 'English',
          originalMessage: 'Thank you for the prompt response. Could you also provide the manufacturing facility audit reports?',
          translatedMessage: 'Thank you for the prompt response. Could you also provide the manufacturing facility audit reports?',
          type: 'sent',
        },
      ],
    },
    {
      id: 2,
      projectName: 'Surgical Gloves Procurement - Hyderabad Facility',
      vendor: 'SterileGuard Manufacturing',
      email: 'orders@sterileguard.my',
      subject: 'Bulk Order Pricing Discussion',
      timestamp: '23 Jan 2026 08:45',
      status: 'pending',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'orders@sterileguard.my',
          timestamp: '23 Jan 2026 08:45',
          originalLanguage: 'English',
          originalMessage: 'We are planning to order 150,000 surgical gloves monthly. Can you provide volume discount pricing?',
          translatedMessage: 'We are planning to order 150,000 surgical gloves monthly. Can you provide volume discount pricing?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'orders@sterileguard.my',
          fromName: 'SterileGuard Manufacturing',
          to: 'procurement@hospital.com',
          timestamp: '23 Jan 2026 10:30',
          originalLanguage: 'English',
          originalMessage: 'For orders above 100,000 units, we can offer 12% discount with 30-day payment terms. For 150K+ monthly commitment, we can extend to 15% with free logistics.',
          translatedMessage: 'For orders above 100,000 units, we can offer 12% discount with 30-day payment terms. For 150K+ monthly commitment, we can extend to 15% with free logistics.',
          type: 'received',
        },
      ],
    },
    {
      id: 3,
      projectName: 'CT Scan Machine - Radiology Department',
      vendor: 'Japan Medical Innovation',
      email: 'support@japanmedical.jp',
      subject: 'Installation Timeline and Training Schedule',
      timestamp: '22 Jan 2026 09:00',
      status: 'responded',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'support@japanmedical.jp',
          timestamp: '22 Jan 2026 09:00',
          originalLanguage: 'English',
          originalMessage: 'We have completed the site preparation. Can you confirm the installation date and training schedule?',
          translatedMessage: 'We have completed the site preparation. Can you confirm the installation date and training schedule?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'support@japanmedical.jp',
          fromName: 'Japan Medical Innovation',
          to: 'procurement@hospital.com',
          timestamp: '22 Jan 2026 16:20',
          originalLanguage: 'English',
          originalMessage: 'Installation scheduled for 15 Feb 2026. Our training team will arrive 2 days prior for pre-installation briefing. Training duration: 5 days with certification.',
          translatedMessage: 'Installation scheduled for 15 Feb 2026. Our training team will arrive 2 days prior for pre-installation briefing. Training duration: 5 days with certification.',
          type: 'received',
        },
      ],
    },
    {
      id: 4,
      projectName: 'Laboratory Reagents - Pathology Lab',
      vendor: 'Global BioSupply Co',
      email: 'logistics@globalbiosupply.ca',
      subject: 'Cold Chain Logistics Clarification',
      timestamp: '22 Jan 2026 10:15',
      status: 'pending',
      priority: 'high',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'logistics@globalbiosupply.ca',
          timestamp: '22 Jan 2026 10:15',
          originalLanguage: 'English',
          originalMessage: 'How do you ensure cold chain integrity during transportation from Canada to India? What is your temperature monitoring system?',
          translatedMessage: 'How do you ensure cold chain integrity during transportation from Canada to India? What is your temperature monitoring system?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'logistics@globalbiosupply.ca',
          fromName: 'Global BioSupply Co',
          to: 'procurement@hospital.com',
          timestamp: '22 Jan 2026 14:10',
          originalLanguage: 'English',
          originalMessage: 'We use GDP-certified temperature-controlled vehicles with real-time monitoring. All shipments include data loggers and we provide temperature excursion reports.',
          translatedMessage: 'We use GDP-certified temperature-controlled vehicles with real-time monitoring. All shipments include data loggers and we provide temperature excursion reports.',
          type: 'received',
        },
        {
          id: 3,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'logistics@globalbiosupply.ca',
          timestamp: '22 Jan 2026 15:30',
          originalLanguage: 'English',
          originalMessage: 'What happens if there is a temperature excursion during transit?',
          translatedMessage: 'What happens if there is a temperature excursion during transit?',
          type: 'sent',
        },
        {
          id: 4,
          from: 'logistics@globalbiosupply.ca',
          fromName: 'Global BioSupply Co',
          to: 'procurement@hospital.com',
          timestamp: '22 Jan 2026 18:45',
          originalLanguage: 'English',
          originalMessage: 'Any excursion triggers immediate notification. Products are quarantined and we provide full replacement at no cost if specifications are not met.',
          translatedMessage: 'Any excursion triggers immediate notification. Products are quarantined and we provide full replacement at no cost if specifications are not met.',
          type: 'received',
        },
      ],
    },
    {
      id: 5,
      projectName: 'MRI Machine - Main Hospital',
      vendor: 'Swiss MedTech Solutions',
      email: 'finance@swissmedtech.ch',
      subject: 'Payment Terms Negotiation',
      timestamp: '21 Jan 2026 11:20',
      status: 'pending',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'finance@swissmedtech.ch',
          timestamp: '21 Jan 2026 11:20',
          originalLanguage: 'English',
          originalMessage: 'Can we discuss installment payment options for the MRI machine? We prefer 40-60 split with 10% advance.',
          translatedMessage: 'Can we discuss installment payment options for the MRI machine? We prefer 40-60 split with 10% advance.',
          type: 'sent',
        },
        {
          id: 2,
          from: 'finance@swissmedtech.ch',
          fromName: 'Swiss MedTech Solutions',
          to: 'procurement@hospital.com',
          timestamp: '21 Jan 2026 16:45',
          originalLanguage: 'German',
          originalMessage: 'Wir können eine 30-70 Ratenzahlung mit 5% Anzahlung anbieten. Die zweite Zahlung ist nach Installation fällig.',
          translatedMessage: 'We can offer a 30-70 installment payment with 5% down payment. The second payment is due after installation.',
          type: 'received',
        },
      ],
    },
    {
      id: 6,
      projectName: 'Pharmaceutical Raw Materials - API Procurement',
      vendor: 'Irish Pharmaceutical Supplies',
      email: 'regulatory@irishpharma.ie',
      subject: 'Drug Master File (DMF) Documentation',
      timestamp: '21 Jan 2026 09:00',
      status: 'responded',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'regulatory@irishpharma.ie',
          timestamp: '21 Jan 2026 09:00',
          originalLanguage: 'English',
          originalMessage: 'We need your DMF reference number and Certificate of Analysis for the API batch we intend to order.',
          translatedMessage: 'We need your DMF reference number and Certificate of Analysis for the API batch we intend to order.',
          type: 'sent',
        },
        {
          id: 2,
          from: 'regulatory@irishpharma.ie',
          fromName: 'Irish Pharmaceutical Supplies',
          to: 'procurement@hospital.com',
          timestamp: '21 Jan 2026 13:30',
          originalLanguage: 'English',
          originalMessage: 'Our DMF is registered with USFDA under reference number 12345. Certificate of Analysis for batch XYZ-2025 is attached. Purity: 99.8%.',
          translatedMessage: 'Our DMF is registered with USFDA under reference number 12345. Certificate of Analysis for batch XYZ-2025 is attached. Purity: 99.8%.',
          type: 'received',
          hasAttachment: true,
        },
      ],
    },
    {
      id: 7,
      projectName: 'Dialysis Machines - Nephrology Unit',
      vendor: 'Pacific Medical Supplies',
      email: 'sales@pacificmedical.sg',
      subject: 'Warranty and AMC Terms Discussion',
      timestamp: '20 Jan 2026 10:45',
      status: 'pending',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'sales@pacificmedical.sg',
          timestamp: '20 Jan 2026 10:45',
          originalLanguage: 'English',
          originalMessage: 'What warranty period do you offer? Also, please share AMC costs after warranty expiry.',
          translatedMessage: 'What warranty period do you offer? Also, please share AMC costs after warranty expiry.',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@pacificmedical.sg',
          fromName: 'Pacific Medical Supplies',
          to: 'procurement@hospital.com',
          timestamp: '20 Jan 2026 15:20',
          originalLanguage: 'English',
          originalMessage: '3 year comprehensive warranty included covering parts, labor, and preventive maintenance. AMC rates after warranty: ₹45,000/year with 24-hour response time.',
          translatedMessage: '3 year comprehensive warranty included covering parts, labor, and preventive maintenance. AMC rates after warranty: ₹45,000/year with 24-hour response time.',
          type: 'received',
        },
        {
          id: 3,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'sales@pacificmedical.sg',
          timestamp: '20 Jan 2026 16:30',
          originalLanguage: 'English',
          originalMessage: 'Does the warranty cover consumables and filters?',
          translatedMessage: 'Does the warranty cover consumables and filters?',
          type: 'sent',
        },
      ],
    },
    {
      id: 8,
      projectName: 'Ventilators - ICU Expansion',
      vendor: 'HealthCare Logistics UK',
      email: 'logistics@healthcarelogistics.co.uk',
      subject: 'Delivery Delay Notification',
      timestamp: '20 Jan 2026 08:30',
      status: 'pending',
      priority: 'high',
      thread: [
        {
          id: 1,
          from: 'logistics@healthcarelogistics.co.uk',
          fromName: 'HealthCare Logistics UK',
          to: 'procurement@hospital.com',
          timestamp: '20 Jan 2026 08:30',
          originalLanguage: 'English',
          originalMessage: 'Due to customs clearance delays, the shipment is held at Mumbai port. We are working with authorities to expedite.',
          translatedMessage: 'Due to customs clearance delays, the shipment is held at Mumbai port. We are working with authorities to expedite.',
          type: 'received',
        },
        {
          id: 2,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'logistics@healthcarelogistics.co.uk',
          timestamp: '20 Jan 2026 09:15',
          originalLanguage: 'English',
          originalMessage: 'This is concerning as we have a deadline. What is the revised ETA? Will there be any penalty waiver?',
          translatedMessage: 'This is concerning as we have a deadline. What is the revised ETA? Will there be any penalty waiver?',
          type: 'sent',
        },
        {
          id: 3,
          from: 'logistics@healthcarelogistics.co.uk',
          fromName: 'HealthCare Logistics UK',
          to: 'procurement@hospital.com',
          timestamp: '20 Jan 2026 11:45',
          originalLanguage: 'English',
          originalMessage: 'Apologies for the delay. New ETA: 5 Feb 2026. We are offering 5% discount as compensation and will expedite installation.',
          translatedMessage: 'Apologies for the delay. New ETA: 5 Feb 2026. We are offering 5% discount as compensation and will expedite installation.',
          type: 'received',
        },
        {
          id: 4,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'logistics@healthcarelogistics.co.uk',
          timestamp: '20 Jan 2026 12:30',
          originalLanguage: 'English',
          originalMessage: 'Acknowledged. Please provide daily status updates until delivery is completed.',
          translatedMessage: 'Acknowledged. Please provide daily status updates until delivery is completed.',
          type: 'sent',
        },
      ],
    },
    {
      id: 9,
      projectName: 'Blood Gas Analyzers - Emergency Department',
      vendor: 'Clinical Diagnostics Corp',
      email: 'support@clinicaldiagnostics.com',
      subject: 'Technical Support Query',
      timestamp: '19 Jan 2026 14:20',
      status: 'responded',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'support@clinicaldiagnostics.com',
          timestamp: '19 Jan 2026 14:20',
          originalLanguage: 'English',
          originalMessage: 'Our lab technicians need training materials for the blood gas analyzer. Do you provide user manuals and video tutorials?',
          translatedMessage: 'Our lab technicians need training materials for the blood gas analyzer. Do you provide user manuals and video tutorials?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'support@clinicaldiagnostics.com',
          fromName: 'Clinical Diagnostics Corp',
          to: 'procurement@hospital.com',
          timestamp: '19 Jan 2026 16:45',
          originalLanguage: 'English',
          originalMessage: 'User manual and video tutorials shared via link. Our support team is available 24/7 for any technical queries. We also offer on-site training if needed.',
          translatedMessage: 'User manual and video tutorials shared via link. Our support team is available 24/7 for any technical queries. We also offer on-site training if needed.',
          type: 'received',
          hasAttachment: true,
        },
      ],
    },
    {
      id: 10,
      projectName: 'Ultrasound Machines - Radiology Wing',
      vendor: 'Korean BioTech Partners',
      email: 'service@koreanbiotech.kr',
      subject: 'Spare Parts Availability Inquiry',
      timestamp: '19 Jan 2026 11:00',
      status: 'pending',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'service@koreanbiotech.kr',
          timestamp: '19 Jan 2026 11:00',
          originalLanguage: 'English',
          originalMessage: 'What is the availability of spare parts like probes and transducers? How long does it take for parts to reach India?',
          translatedMessage: 'What is the availability of spare parts like probes and transducers? How long does it take for parts to reach India?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'service@koreanbiotech.kr',
          fromName: 'Korean BioTech Partners',
          to: 'procurement@hospital.com',
          timestamp: '19 Jan 2026 15:30',
          originalLanguage: 'Korean',
          originalMessage: '프로브 및 모든 주요 부품은 한국 창고에서 재고가 있습니다. 인도까지 배송: 7-10일. 긴급 배송은 3-5일 가능합니다.',
          translatedMessage: 'Probes and all major parts are in stock at our Korean warehouse. Delivery to India: 7-10 days. Expedited shipping available in 3-5 days.',
          type: 'received',
        },
      ],
    },
    {
      id: 11,
      projectName: 'ECG Machines - Cardiology Department',
      vendor: 'AsiaHealth Medical Devices',
      email: 'regulatory@asiahealthdevices.in',
      subject: 'CDSCO Registration Status',
      timestamp: '18 Jan 2026 09:30',
      status: 'responded',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'regulatory@asiahealthdevices.in',
          timestamp: '18 Jan 2026 09:30',
          originalLanguage: 'English',
          originalMessage: 'Is your ECG machine registered with CDSCO? We need the registration certificate for our records.',
          translatedMessage: 'Is your ECG machine registered with CDSCO? We need the registration certificate for our records.',
          type: 'sent',
        },
        {
          id: 2,
          from: 'regulatory@asiahealthdevices.in',
          fromName: 'AsiaHealth Medical Devices',
          to: 'procurement@hospital.com',
          timestamp: '18 Jan 2026 14:15',
          originalLanguage: 'English',
          originalMessage: 'Yes, our ECG machines are registered with CDSCO under license number CD-1234. Registration certificate and test reports are attached.',
          translatedMessage: 'Yes, our ECG machines are registered with CDSCO under license number CD-1234. Registration certificate and test reports are attached.',
          type: 'received',
          hasAttachment: true,
        },
      ],
    },
    {
      id: 12,
      projectName: 'Infusion Pumps - General Ward',
      vendor: 'BioLab Solutions Inc',
      email: 'service@biolabsolutions.de',
      subject: 'Calibration and Validation Services',
      timestamp: '18 Jan 2026 10:00',
      status: 'pending',
      priority: 'normal',
      thread: [
        {
          id: 1,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'service@biolabsolutions.de',
          timestamp: '18 Jan 2026 10:00',
          originalLanguage: 'English',
          originalMessage: 'Do you provide annual calibration and IQ/OQ validation services for the infusion pumps?',
          translatedMessage: 'Do you provide annual calibration and IQ/OQ validation services for the infusion pumps?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'service@biolabsolutions.de',
          fromName: 'BioLab Solutions Inc',
          to: 'procurement@hospital.com',
          timestamp: '18 Jan 2026 14:30',
          originalLanguage: 'German',
          originalMessage: 'Jährliche Kalibrierung und IQ/OQ Validierung sind im Service-Paket enthalten. Wir führen auch PQ durch, falls erforderlich.',
          translatedMessage: 'Annual calibration and IQ/OQ validation are included in the service package. We also perform PQ if required.',
          type: 'received',
        },
        {
          id:3,
          from: 'procurement@hospital.com',
          fromName: 'You',
          to: 'service@biolabsolutions.de',
          timestamp: '18 Jan 2026 15:45',
          originalLanguage: 'English',
          originalMessage: 'What are the additional costs for PQ documentation?',
          translatedMessage: 'What are the additional costs for PQ documentation?',
          type: 'sent',
        },
      ],
    },
  ];

  const filteredQueries = emailThreads.filter((query) => {
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;
    
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      query.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

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
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="bg-white rounded-2xl h-[calc(100vh-48px)] flex flex-col p-5">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Communications</h1>
            <p className="text-sm text-gray-500">Manage vendor queries and email threads from all projects</p>
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
                All ({emailThreads.length})
              </button>
              <button
                onClick={() => handleFilterChange('pending')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({emailThreads.filter(q => q.status === 'pending').length})
              </button>
              <button
                onClick={() => handleFilterChange('responded')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === 'responded'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Read ({emailThreads.filter(q => q.status === 'responded').length})
              </button>
            </div>
          </div>

          {/* Gmail-style Email List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white flex-1">
            {filteredQueries.length > 0 ? (
              <div className="divide-y divide-gray-100 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredQueries.map((query) => (
                  <button
                    key={query.id}
                    onClick={() => handleEmailClick(query)}
                    className="w-full px-4 py-3.5 h-[72px] flex items-center gap-4 hover:bg-gray-50 transition-colors group text-left"
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm ${query.status === 'pending' ? 'font-semibold text-gray-900' : 'font-normal text-gray-900'}`}>
                          {query.vendor}
                        </span>
                        {query.priority === 'high' && (
                          <Badge className="text-[10px] px-1.5 py-0 border-0 bg-red-50 text-red-700 font-medium">
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
                          {getPreviewText(query).substring(0, 60)}...
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
                <p className="text-sm text-gray-500">No emails found</p>
              </div>
            )}</div>
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
                <p className="text-xs text-gray-500 mt-0.5">{selectedQuery.projectName}</p>
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