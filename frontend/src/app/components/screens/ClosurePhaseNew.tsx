import { CheckCircle, IndianRupee, Briefcase, MapPin, FileText, Clock, Calendar, Mail, Download, TrendingUp, X, Building2, Award, Users, Package, Phone, MoreVertical } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { useState } from 'react';
import { createPortal } from 'react-dom';

// Closure Phase Component
export function ClosurePhase({ proposal }: { proposal: any }) {
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [hoveredProjectIndex, setHoveredProjectIndex] = useState<number | null>(null);

  const closureDetails = {
    selectedVendor: 'Global Electronics Supply',
    vendorEmail: 'sarah.chen@globalsupply.com',
    vendorLocation: 'Mumbai, Maharashtra',
    vendorContact: '+91 98765 43210',
    finalPrice: 9285000,
    originalPrice: 9985000,
    savings: 700000,
    savingsPercentage: 7,
    deliveryDays: 45,
    warranty: '3 years comprehensive',
    extendedWarranty: '2 years additional (optional)',
    paymentTerms: 'Net 30 days',
    paymentSchedule: [
      { milestone: 'PO Issuance', percentage: 30, amount: 2785500, dueDate: '1 Feb 2026' },
      { milestone: 'Delivery Confirmation', percentage: 50, amount: 4642500, dueDate: '18 Mar 2026' },
      { milestone: 'Installation & Acceptance', percentage: 20, amount: 1857000, dueDate: '1 Apr 2026' },
    ],
    contractStartDate: '1 Feb 2026',
    contractEndDate: '31 Jan 2029',
    closedBy: 'Ram Krish',
    closedDate: '23 Jan 2026 18:45',
    poNumber: 'PO-2026-0047',
    contractNumber: 'CT-2026-0128',
    certifications: ['ISO 13485:2016', 'CE Mark', 'FDA Registered', 'GMP Certified'],
    deliveryMilestones: [
      { phase: 'Order Processing', duration: '5 days', date: '6 Feb 2026' },
      { phase: 'Manufacturing & QC', duration: '25 days', date: '3 Mar 2026' },
      { phase: 'Shipping & Customs', duration: '10 days', date: '13 Mar 2026' },
      { phase: 'Final Delivery', duration: '5 days', date: '18 Mar 2026' },
    ],
    supportTerms: {
      technicalSupport: '24/7 hotline with 4-hour response time',
      onSiteSupport: 'Available within 48 hours',
      training: '2-day on-site staff training included',
      spare: 'Priority access to spare parts inventory',
    },
    approvals: [
      { name: 'Ram Krish', role: 'Procurement Manager', date: '23 Jan 2026', status: 'Approved' },
      { name: 'Sandeep Kumar', role: 'Technical Lead', date: '23 Jan 2026', status: 'Approved' },
      { name: 'Dr. Priya Sharma', role: 'Department Head', date: '23 Jan 2026', status: 'Approved' },
    ],
  };

  const closureEmails = [
    {
      id: 1,
      from: 'sarah.chen@globalsupply.com',
      fromName: 'Sarah Chen',
      to: 'ramkrish@smartsense.com',
      timestamp: '22 Jan 2026 14:30',
      subject: 'Final Proposal - Medical Equipment Supply',
      message: 'Dear Ram,\n\nFollowing our successful negotiations, I am pleased to submit our final proposal for the medical equipment supply contract.\n\nFinal Terms:\n• Total Value: ₹92,85,000 (7% discount from original quote)\n• Payment Terms: 30-50-20 schedule as discussed\n• Delivery: 45 days from PO\n• Warranty: 3 years comprehensive + 2 years optional extension\n• Free installation and 2-day staff training\n\nAll products are ISO 13485 certified with full compliance documentation. We are committed to maintaining the quality standards your organization expects.\n\nPlease let me know if you need any clarifications. Looking forward to a successful partnership.\n\nBest regards,\nSarah Chen\nSenior Account Manager\nGlobal Electronics Supply',
      type: 'received',
    },
    {
      id: 2,
      from: 'ramkrish@smartsense.com',
      fromName: 'Ram Krish',
      to: 'sarah.chen@globalsupply.com',
      timestamp: '22 Jan 2026 16:15',
      message: 'Hi Sarah,\n\nThank you for the comprehensive proposal. The terms look excellent and align well with our requirements.\n\nI have a few final points to confirm:\n\n1. Technical Support: Can you confirm the 24/7 support availability with guaranteed 4-hour response time?\n2. Spare Parts: What is the typical lead time for spare parts delivery?\n3. Contract Duration: Can we lock in pricing for the full 3-year contract period?\n4. Training: Will the training cover all staff shifts or just one batch?\n\nOnce we have clarity on these points, we can proceed with internal approvals and PO issuance.\n\nThanks,\nRam Krish\nProcurement Manager\nSmartSense Healthcare',
      type: 'sent',
    },
    {
      id: 3,
      from: 'sarah.chen@globalsupply.com',
      fromName: 'Sarah Chen',
      to: 'ramkrish@smartsense.com',
      timestamp: '22 Jan 2026 17:45',
      message: 'Hi Ram,\n\nGreat questions! Here are the clarifications:\n\n1. Technical Support: Yes, confirmed 24/7 hotline with guaranteed 4-hour response for critical issues. On-site support available within 48 hours if needed.\n\n2. Spare Parts: We maintain stock in our Mumbai warehouse. Standard spare parts delivery within 72 hours across India. Critical components available within 24 hours.\n\n3. Contract Duration: Absolutely! Pricing locked for the entire 3-year period with no annual escalations. This is our commitment to long-term partnerships.\n\n4. Training: We will provide training for up to 3 batches (covering all shifts) at no additional cost. Each session is 2 days with hands-on practice.\n\nI have also attached our standard service level agreement document for your review. We are ready to sign as soon as you are!\n\nBest,\nSarah',
      type: 'received',
    },
    {
      id: 4,
      from: 'ramkrish@smartsense.com',
      fromName: 'Ram Krish',
      to: 'sarah.chen@globalsupply.com',
      timestamp: '23 Jan 2026 11:20',
      message: 'Hi Sarah,\n\nPerfect! This addresses all our concerns. I have reviewed the terms with our technical team and department head. Everyone is very satisfied with the proposal.\n\nI am proceeding with the final approval process today. Our legal team will review the contract documents, and I expect to have the PO issued by end of day.\n\nCould you please send me:\n1. Final contract document for signature\n2. Banking details for payment processing\n3. Point of contact for delivery coordination\n\nLooking forward to a successful partnership!\n\nBest regards,\nRam',
      type: 'sent',
    },
    {
      id: 5,
      from: 'sarah.chen@globalsupply.com',
      fromName: 'Sarah Chen',
      to: 'ramkrish@smartsense.com',
      timestamp: '23 Jan 2026 13:50',
      message: 'Hi Ram,\n\nExcellent news! I am attaching all the requested documents:\n\n1. Contract_GES_SmartSense_2026.pdf - Ready for signatures\n2. Banking_Details_GES.pdf - Wire transfer and NEFT details\n3. Delivery_Coordination_Contact.pdf - Our logistics team contact\n\nOur logistics manager, Mr. Rajesh Kumar, will be your primary point of contact for delivery scheduling and installation coordination.\n\nI have also cc\'d our legal team so they can directly coordinate with your legal department if needed.\n\nThank you for choosing Global Electronics Supply. We are excited to begin this partnership and committed to exceeding your expectations!\n\nWarm regards,\nSarah Chen\n\nAttachments: Contract_GES_SmartSense_2026.pdf (287 KB), Banking_Details_GES.pdf (124 KB), Delivery_Coordination_Contact.pdf (98 KB)',
      type: 'received',
      attachments: [
        { name: 'Contract_GES_SmartSense_2026.pdf', size: '287 KB' },
        { name: 'Banking_Details_GES.pdf', size: '124 KB' },
        { name: 'Delivery_Coordination_Contact.pdf', size: '98 KB' },
      ],
    },
    {
      id: 6,
      from: 'ramkrish@smartsense.com',
      fromName: 'Ram Krish',
      to: 'sarah.chen@globalsupply.com',
      timestamp: '23 Jan 2026 18:45',
      message: 'Hi Sarah,\n\n🎉 Great news! The contract has been approved and signed by all stakeholders.\n\nI am pleased to inform you that Purchase Order PO-2026-0047 has been issued for ₹92,85,000.\n\nKey Details:\n• PO Number: PO-2026-0047\n• Contract Number: CT-2026-0128\n• First payment (30%): ₹27,85,500 will be processed by 1 Feb 2026\n• Expected delivery: 18 Mar 2026\n\nPlease confirm receipt of the PO and provide an order acknowledgment.\n\nOur team is excited to receive the equipment and begin the implementation. Thank you for your professional handling of this entire process!\n\nBest regards,\nRam Krish\nProcurement Manager\nSmartSense Healthcare\n\nAttached: PO-2026-0047.pdf (156 KB)',
      type: 'sent',
      attachments: [
        { name: 'PO-2026-0047.pdf', size: '156 KB' },
      ],
    },
    {
      id: 7,
      from: 'sarah.chen@globalsupply.com',
      fromName: 'Sarah Chen',
      to: 'ramkrish@smartsense.com',
      timestamp: '23 Jan 2026 19:30',
      message: 'Hi Ram,\n\nFantastic! PO received and confirmed. Order acknowledgment is attached.\n\nOur team is already mobilizing for production:\n• Manufacturing start: 3 Feb 2026\n• Quality inspection: Week of 24 Feb 2026\n• Shipping: 1st week of March 2026\n• Delivery to your facility: 18 Mar 2026\n\nRajesh Kumar from our logistics team will reach out next week to coordinate the delivery schedule and installation planning.\n\nThank you for your trust in Global Electronics Supply. We are committed to making this a seamless experience for your team.\n\nHere is to a successful long-term partnership! 🤝\n\nBest regards,\nSarah Chen\n\nAttached: Order_Acknowledgment_PO-2026-0047.pdf (142 KB)',
      type: 'received',
      attachments: [
        { name: 'Order_Acknowledgment_PO-2026-0047.pdf', size: '142 KB' },
      ],
    },
  ];

  const vendorPortfolio = {
    companyName: 'Global Electronics Supply',
    yearEstablished: 2008,
    headquarters: 'Mumbai, Maharashtra',
    employeeCount: '500+',
    annualRevenue: '₹450 Cr',
    description: 'Leading supplier of medical equipment and healthcare technology solutions across India. Specializing in diagnostic equipment, patient monitoring systems, and laboratory instruments with comprehensive after-sales support.',
    certifications: [
      { name: 'ISO 13485:2016', desc: 'Medical Devices Quality Management' },
      { name: 'CE Mark', desc: 'European Conformity' },
      { name: 'FDA Registered', desc: 'US Food and Drug Administration' },
      { name: 'GMP Certified', desc: 'Good Manufacturing Practice' },
      { name: 'ISO 9001:2015', desc: 'Quality Management Systems' },
      { name: 'WHO-GMP', desc: 'World Health Organization Certification' },
    ],
    pastProjects: [
      {
        client: 'Apollo Hospitals',
        location: 'Chennai, Tamil Nadu',
        value: '₹2.5 Cr',
        year: '2024',
        scope: 'Complete ICU equipment setup with 50+ patient monitoring systems',
      },
      {
        client: 'Fortis Healthcare',
        location: 'Bangalore, Karnataka',
        value: '₹1.8 Cr',
        year: '2023',
        scope: 'Diagnostic equipment supply for multi-specialty hospital expansion',
      },
      {
        client: 'Max Healthcare',
        location: 'Delhi NCR',
        value: '₹3.2 Cr',
        year: '2023',
        scope: 'Laboratory automation systems and diagnostic equipment',
      },
      {
        client: 'Manipal Hospitals',
        location: 'Pune, Maharashtra',
        value: '₹1.5 Cr',
        year: '2022',
        scope: 'Cardiac care equipment and patient monitoring solutions',
      },
    ],
    capabilities: [
      'Medical Equipment Supply',
      'Installation & Commissioning',
      'Preventive Maintenance',
      '24/7 Technical Support',
      'Staff Training Programs',
      'Spare Parts Management',
      'Equipment Calibration',
      'Compliance Documentation',
    ],
    keyClients: [
      'Apollo Hospitals',
      'Fortis Healthcare',
      'Max Healthcare',
      'Manipal Hospitals',
      'Narayana Health',
      'Cloudnine Hospitals',
      'Columbia Asia',
      'Aster DM Healthcare',
    ],
    coverage: [
      'Pan-India delivery network',
      'Regional warehouses in Mumbai, Delhi, Bangalore, Chennai',
      'Same-day service in metro cities',
      ' 48-hour response time nationwide',
    ],
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Procurement Completed</h2>
          <p className="text-sm text-gray-500">Deal successfully closed with all approvals and documentation</p>
        </div>
      </div>

      {/* Savings Highlight */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#3B82F6] rounded-lg flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Savings Achieved</p>
              <p className="text-2xl font-bold text-[#3B82F6]">₹{closureDetails.savings.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-600">{closureDetails.savingsPercentage}% discount from original quote</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Final Contract Value</p>
            <p className="text-xl font-bold text-gray-900">₹{closureDetails.finalPrice.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 line-through">₹{closureDetails.originalPrice.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Vendor & Contract Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Vendor Information
          </h3>
          <div className="space-y-2.5 mb-3">
            <div>
              <p className="text-xs text-gray-500">Vendor Name</p>
              <p className="text-sm font-medium text-gray-900">{closureDetails.selectedVendor}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm text-gray-900 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {closureDetails.vendorLocation}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contact</p>
              <p className="text-sm text-gray-900">{closureDetails.vendorContact}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-900">{closureDetails.vendorEmail}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-[#eeeff1] text-gray-900 hover:bg-gray-50 text-xs h-8"
            onClick={() => setPortfolioOpen(true)}
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            View Vendor Portfolio
          </Button>
        </div>

        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contract Details
          </h3>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-500">PO Number</p>
              <p className="text-sm font-medium text-gray-900">{closureDetails.poNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contract Number</p>
              <p className="text-sm font-medium text-gray-900">{closureDetails.contractNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contract Period</p>
              <p className="text-sm text-gray-900">{closureDetails.contractStartDate} - {closureDetails.contractEndDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Terms</p>
              <p className="text-sm text-gray-900">{closureDetails.paymentTerms}</p>
            </div>
          </div>
        </div>

        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Delivery & Warranty
          </h3>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-500">Delivery Timeline</p>
              <p className="text-sm font-medium text-gray-900">{closureDetails.deliveryDays} days</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expected Delivery</p>
              <p className="text-sm text-gray-900">18 Mar 2026</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Warranty</p>
              <p className="text-sm text-gray-900">{closureDetails.warranty}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Extended Warranty</p>
              <p className="text-sm text-gray-900">{closureDetails.extendedWarranty}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deal Closure Communication */}
      <div className="border border-[#eeeff1] rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Deal Closure Communication
        </h3>
        
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div
            onClick={() => setEmailThreadOpen(true)}
            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">SC</span>
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">
                    Sarah Chen - Global Electronics Supply
                  </span>
                  <Badge className="bg-green-50 text-green-700 border-0 text-xs px-1.5 py-0">
                    Completed
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-1.5">
                  Final proposal, negotiations, and PO issuance - Complete deal closure thread
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    7 messages
                  </span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {closureDetails.finalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    6 attachments
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 text-xs text-gray-500">
                23 Jan 2026
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Thread Side Panel */}
      {emailThreadOpen && createPortal(
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
                <h2 className="text-base font-semibold text-gray-900">Deal Closure Communication</h2>
                <p className="text-xs text-gray-500 mt-0.5">{closureDetails.vendorEmail}</p>
              </div>
              <button
                onClick={() => setEmailThreadOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Thread Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .flex-1.overflow-y-auto::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {closureEmails.map((email, index) => (
                <div key={email.id} className={`mb-6 ${index === closureEmails.length - 1 ? 'mb-0' : ''}`}>
                  {/* Message Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      email.type === 'sent' ? 'bg-[#3B82F6]' : 'bg-gray-300'
                    }`}>
                      <span className={`text-sm font-medium ${email.type === 'sent' ? 'text-white' : 'text-gray-700'}`}>
                        {email.fromName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{email.fromName}</span>
                        </div>
                        <span className="text-xs text-gray-500">{email.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-500">to {email.to}</p>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="ml-13 space-y-3">
                    {email.subject && (
                      <p className="text-sm font-medium text-gray-700">Subject: {email.subject}</p>
                    )}
                    <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                      {email.message}
                    </div>
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {email.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-[#eeeff1] rounded text-xs">
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-gray-700">{attachment.name}</span>
                            <span className="text-gray-400">({attachment.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Payment Schedule & Delivery Milestones */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Payment Schedule */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            Payment Schedule
          </h3>
          <div className="space-y-3">
            {closureDetails.paymentSchedule.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{payment.milestone}</p>
                    <p className="text-xs text-gray-500">Due: {payment.dueDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{payment.amount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{payment.percentage}% of total</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Milestones */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Delivery Milestones
          </h3>
          <div className="space-y-3">
            {closureDetails.deliveryMilestones.map((milestone, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-[#3B82F6] rounded-full"></div>
                  {idx < closureDetails.deliveryMilestones.length - 1 && (
                    <div className="w-0.5 h-8 bg-[#3B82F6]"></div>
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{milestone.phase}</p>
                    <p className="text-xs text-gray-500">{milestone.date}</p>
                  </div>
                  <p className="text-xs text-gray-500">{milestone.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Closure Information */}
      <div className="border border-[#eeeff1] rounded-lg p-4 mb-6 bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Deal Closed Successfully</p>
              <p className="text-xs text-gray-600">
                Closed by <span className="font-medium">{closureDetails.closedBy}</span> on {closureDetails.closedDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Portfolio Side Panel */}
      {portfolioOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setPortfolioOpen(false)}
          />
          
          {/* Side Panel */}
          <div className="absolute top-0 right-0 h-full w-[480px] bg-white shadow-lg flex flex-col" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="bg-white border-b border-[#eeeff1] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{vendorPortfolio.companyName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Vendor Portfolio & Credentials</p>
              </div>
              <button
                onClick={() => setPortfolioOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Portfolio Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .flex-1.overflow-y-auto::-webkit-scrollbar {
                  display: none;
                }
              `}</style>

              <div className="space-y-6">
                {/* Company Overview */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Overview</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[100px]">Category</span>
                      <span className="text-xs text-gray-900">Medical Equipment Supply</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[100px]">Location</span>
                      <span className="text-xs text-gray-900">{closureDetails.vendorLocation}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[100px]">Experience</span>
                      <span className="text-xs text-gray-900">{new Date().getFullYear() - vendorPortfolio.yearEstablished} years in business</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[100px]">Rating</span>
                      <span className="text-xs text-gray-900">4.8 ⭐</span>
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {closureDetails.certifications.map((cert: string, idx: number) => (
                      <Badge key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-0">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Products & Services */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Products & Services</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Specialized in medical equipment supply with a focus on quality and reliability.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-900">High-quality medical-grade products</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-900">FDA approved and certified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-900">Fast delivery across India</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-900">24/7 customer support</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">On-time Delivery</div>
                      <div className="text-lg font-semibold text-gray-900">98%</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Quality Score</div>
                      <div className="text-lg font-semibold text-gray-900">4.8/5</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Response Time</div>
                      <div className="text-lg font-semibold text-gray-900">&lt; 4 hrs</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Projects Completed</div>
                      <div className="text-lg font-semibold text-gray-900">150+</div>
                    </div>
                  </div>
                </div>

                {/* Past Projects */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Past Projects</h3>
                  <div className="space-y-3">
                    {vendorPortfolio.pastProjects.map((project, idx) => (
                      <div
                        key={idx}
                        className="border border-[#eeeff1] rounded-lg p-3 relative group"
                        onMouseEnter={() => setHoveredProjectIndex(idx)}
                        onMouseLeave={() => setHoveredProjectIndex(null)}
                      >
                        {/* Three Dots Menu */}
                        {hoveredProjectIndex === idx && (
                          <div className="absolute top-3 right-3 z-10">
                            <div className="relative">
                              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              <div className="absolute right-0 top-8 w-36 bg-white border border-[#eeeff1] rounded-lg shadow-lg py-1">
                                <button className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                  View RFP
                                </button>
                                <button className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 pr-8">
                            <p className="text-sm font-medium text-gray-900">{project.client}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {project.location}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-900">{project.value}</p>
                            <p className="text-xs text-gray-500">{project.year}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{project.scope}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-900">{closureDetails.vendorEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-900">{closureDetails.vendorContact}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-900">{closureDetails.vendorLocation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}