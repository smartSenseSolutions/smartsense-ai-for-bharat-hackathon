import { TrendingUp, DollarSign, Calendar, Award, FileText, ChevronRight, IndianRupee, Clock, Shield, FileSpreadsheet, Download, Languages, X, Send } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';

type Screen = string;

interface QuoteIntelligenceProps {
  onNavigate: (screen: Screen) => void;
  onVendorSelect: (vendor: any) => void;
}

export function QuoteIntelligence({ onNavigate, onVendorSelect }: QuoteIntelligenceProps) {
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock quotations from different projects
  const quotations = [
    {
      id: 1,
      projectName: 'Medical Grade N95 Respirators',
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      price: 118500,
      deliveryDays: 50,
      warranty: '3 years',
      submittedAt: '21 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'Tamil',
      originalMessage: 'எங்களின் போட்டி விலைகளுடன் ISO 13485 சான்றிதழ் பெற்ற தயாரிப்புகளை தயவுசெய்து காணவும்.',
      translatedMessage: 'Please find our competitive quotation with ISO 13485 certified products.',
      attachments: [
        { name: 'Quotation_GES_2026.pdf', size: '245 KB', type: 'pdf' },
        { name: 'Product_Specifications.xlsx', size: '89 KB', type: 'excel' },
        { name: 'Compliance_Certificate.pdf', size: '156 KB', type: 'pdf' },
      ],
    },
    {
      id: 2,
      projectName: 'Medical Grade N95 Respirators',
      vendor: 'TechDistributor Inc.',
      email: 'contact@techdist.com',
      price: 125000,
      deliveryDays: null,
      warranty: '3 years',
      submittedAt: '21 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'Hindi',
      originalMessage: 'हमें त्वरित डिलीवरी विकल्पों के साथ अपना सर्वोत्तम मूल्य प्रस्तुत करते हुए प्रसन्नता हो रही है।',
      translatedMessage: 'We are pleased to submit our best pricing with expedited delivery options.',
      attachments: [
        { name: 'TechDist_Quote.pdf', size: '198 KB', type: 'pdf' },
        { name: 'Technical_Datasheet.docx', size: '112 KB', type: 'doc' },
      ],
    },
    {
      id: 3,
      projectName: 'Surgical Gloves Procurement',
      vendor: 'Enterprise Solutions Co.',
      email: 'sales@enterprise.com',
      price: 132000,
      deliveryDays: 40,
      warranty: null,
      submittedAt: '20 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'English',
      originalMessage: 'Thank you for the opportunity. Our quote includes premium support and training.',
      translatedMessage: 'Thank you for the opportunity. Our quote includes premium support and training.',
      attachments: [
        { name: 'Enterprise_Quotation.pdf', size: '234 KB', type: 'pdf' },
        { name: 'Price_Breakdown.xlsx', size: '67 KB', type: 'excel' },
      ],
    },
    {
      id: 4,
      projectName: 'CT Scan Machine - Radiology',
      vendor: 'MedSupply International',
      email: 'orders@medsupply.com',
      price: 115000,
      deliveryDays: null,
      warranty: null,
      submittedAt: '21 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'Telugu',
      originalMessage: 'పూర్తి CE మార్కింగ్ అనుగుణత మరియు పొడిగించిన వారంటీ కవరేజ్‌తో పోటీ ధర.',
      translatedMessage: 'Competitive pricing with full CE marking compliance and extended warranty coverage.',
      attachments: [
        { name: 'MedSupply_Quote_Jan2026.pdf', size: '312 KB', type: 'pdf' },
      ],
    },
    {
      id: 5,
      projectName: 'Laboratory Equipment Bundle',
      vendor: 'Healthcare Distributors',
      email: 'info@healthdist.com',
      price: 128500,
      deliveryDays: 42,
      warranty: '2 years',
      submittedAt: '20 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'English',
      originalMessage: 'Attached is our detailed proposal with flexible payment terms available.',
      translatedMessage: 'Attached is our detailed proposal with flexible payment terms available.',
      attachments: [
        { name: 'Healthcare_Proposal.pdf', size: '289 KB', type: 'pdf' },
        { name: 'Terms_and_Conditions.docx', size: '45 KB', type: 'doc' },
      ],
    },
    {
      id: 6,
      projectName: 'Dialysis Machines - Nephrology',
      vendor: 'BioMedical Supplies Ltd.',
      email: 'procurement@biomedical.com',
      price: 122000,
      deliveryDays: 48,
      warranty: null,
      submittedAt: '21 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'English',
      originalMessage: 'Our quote includes comprehensive warranty and dedicated technical support team.',
      translatedMessage: 'Our quote includes comprehensive warranty and dedicated technical support team.',
      attachments: [
        { name: 'BioMed_Quotation.pdf', size: '267 KB', type: 'pdf' },
        { name: 'Delivery_Schedule.xlsx', size: '78 KB', type: 'excel' },
      ],
    },
    {
      id: 7,
      projectName: 'Ventilators - ICU Expansion',
      vendor: 'Prime Medical Equipment',
      email: 'sales@primemedical.com',
      price: null,
      deliveryDays: 52,
      warranty: '2 years',
      submittedAt: '20 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'English',
      originalMessage: 'Please review our competitive offer with all required certifications included.',
      translatedMessage: 'Please review our competitive offer with all required certifications included.',
      attachments: [
        { name: 'Prime_Medical_Quote.pdf', size: '221 KB', type: 'pdf' },
      ],
    },
    {
      id: 8,
      projectName: 'ECG Machines - Cardiology',
      vendor: 'Clinical Diagnostics Corp',
      email: 'quotes@clinicaldiag.com',
      price: 145000,
      deliveryDays: 35,
      warranty: '3 years',
      submittedAt: '19 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'Bengali',
      originalMessage: 'আমরা সম্পূর্ণ ইনস্টলেশন এবং প্রশিক্ষণ সহায়তা সহ আমাদের প্রতিযোগিতামূলক মূল্য প্রদান করছি।',
      translatedMessage: 'We are providing our competitive pricing with complete installation and training support.',
      attachments: [
        { name: 'ClinicalDiag_Quote.pdf', size: '198 KB', type: 'pdf' },
        { name: 'Installation_Plan.xlsx', size: '76 KB', type: 'excel' },
      ],
    },
    {
      id: 9,
      projectName: 'Ultrasound Machines - Radiology',
      vendor: 'MedTech Solutions India',
      email: 'sales@medtechindia.com',
      price: 165000,
      deliveryDays: 45,
      warranty: '4 years',
      submittedAt: '19 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'Marathi',
      originalMessage: 'कृपया आमचे स्पर्धात्मक कोटेशन पहा ज्यामध्ये विस्तारित वॉरंटी समाविष्ट आहे.',
      translatedMessage: 'Please find our competitive quotation with extended warranty included.',
      attachments: [
        { name: 'MedTech_Quotation.pdf', size: '287 KB', type: 'pdf' },
      ],
    },
    {
      id: 10,
      projectName: 'Blood Gas Analyzers - Emergency',
      vendor: 'Pacific Medical Supplies',
      email: 'quotes@pacificmed.sg',
      price: 98500,
      deliveryDays: 30,
      warranty: '2 years',
      submittedAt: '18 Jan 2026',
      subject: 'Quotation Submitted',
      originalLanguage: 'English',
      originalMessage: 'Our best offer includes fast delivery and comprehensive calibration services.',
      translatedMessage: 'Our best offer includes fast delivery and comprehensive calibration services.',
      attachments: [
        { name: 'Pacific_Quote.pdf', size: '203 KB', type: 'pdf' },
        { name: 'Calibration_Service.pdf', size: '134 KB', type: 'pdf' },
      ],
    },
  ];

  const filteredQuotations = quotations.filter((quote) => {
    return searchQuery === '' || 
      quote.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.projectName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleEmailClick = (quotation: any) => {
    setSelectedQuotation(quotation);
    setEmailThreadOpen(true);
  };

  const handleDownloadAttachment = (fileName: string) => {
    toast.success(`Downloading ${fileName}...`);
    setTimeout(() => {
      toast.success(`${fileName} downloaded successfully`);
    }, 1000);
  };

  const getFileIcon = (type: string) => {
    if (type === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (type === 'excel') {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    } else if (type === 'doc') {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="bg-white rounded-2xl h-[calc(100vh-48px)] flex flex-col p-5">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Quotations Received</h1>
            <p className="text-sm text-gray-500">Quotations have been received from {quotations.length} vendors</p>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <Input
              placeholder="Search for quotation emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-white border-gray-200 text-sm w-full"
            />
          </div>

          {/* Gmail-style Email List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white flex-1">
            {filteredQuotations.length > 0 ? (
              <div className="divide-y divide-gray-100 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredQuotations.map((quote) => (
                  <div
                    key={quote.id}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {quote.vendor.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="flex-1 min-w-0">
                        <div 
                          onClick={() => handleEmailClick(quote)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900">
                              {quote.vendor}
                            </span>
                            {quote.originalLanguage !== 'English' && (
                              <Badge variant="outline" className="text-xs border-[#3B82F6] text-[#3B82F6] bg-blue-50 px-1.5 py-0">
                                <Languages className="w-3 h-3 mr-1" />
                                Translated
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1.5 line-clamp-1">
                            {quote.translatedMessage}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                            {quote.price && (
                              <span className="flex items-center gap-1">
                                <IndianRupee className="w-3.5 h-3.5" />
                                {quote.price.toLocaleString()}
                              </span>
                            )}
                            {quote.deliveryDays && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {quote.deliveryDays} days
                              </span>
                            )}
                            {quote.warranty && (
                              <span className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                {quote.warranty}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Attachments */}
                        {quote.attachments && quote.attachments.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {quote.attachments.map((attachment: any, idx: number) => {
                              let IconComponent = FileText;
                              let iconColor = 'text-gray-500';
                              
                              if (attachment.type === 'pdf') {
                                iconColor = 'text-red-500';
                              } else if (attachment.type === 'excel') {
                                IconComponent = FileSpreadsheet;
                                iconColor = 'text-green-600';
                              } else if (attachment.type === 'doc') {
                                iconColor = 'text-blue-500';
                              }

                              return (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadAttachment(attachment.name);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
                                  title={`${attachment.name} (${attachment.size})`}
                                >
                                  <IconComponent className={`w-3.5 h-3.5 ${iconColor}`} />
                                  <span className="max-w-[120px] truncate">{attachment.name}</span>
                                  <Download className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex-shrink-0 text-xs text-gray-500">
                        {quote.submittedAt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">No quotations found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Thread Modal */}
      {emailThreadOpen && selectedQuotation && createPortal(
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
                <h2 className="text-base font-semibold text-gray-900">Quotation - {selectedQuotation.projectName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedQuotation.email}</p>
              </div>
              <button
                onClick={() => setEmailThreadOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Thread Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Initial RFP Email */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">RK</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">Ram Krish</span>
                        {selectedQuotation.originalLanguage !== 'English' && (
                          <Badge variant="outline" className="text-xs border-[#3B82F6] text-[#3B82F6] bg-blue-50 px-1.5 py-0">
                            <Languages className="w-3 h-3 mr-1" />
                            Translated
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">20 Jan 2026 10:30</span>
                    </div>
                    <p className="text-xs text-gray-500">to {selectedQuotation.email}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <p className="text-sm text-gray-900 leading-relaxed mb-3">
                    <strong>Request for Quotation - {selectedQuotation.projectName}</strong>
                  </p>
                  
                  {/* English Message - Always shown */}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Dear {selectedQuotation.vendor},<br /><br />
                    We are requesting quotations for {selectedQuotation.projectName}. Please review the attached specifications and provide your best quote including pricing, delivery timeline, and warranty terms.<br /><br />
                    Looking forward to your response.
                  </p>
                  
                  {/* Original Language - Collapsible */}
                  {selectedQuotation.originalLanguage !== 'English' && (
                    <details className="text-xs mt-3">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5" />
                        Show original ({selectedQuotation.originalLanguage})
                      </summary>
                      <div className="mt-2 text-gray-600 italic pl-4 border-l-2 border-gray-200">
                        {selectedQuotation.originalLanguage === 'Tamil' && (
                          <>
                            அன்புள்ள {selectedQuotation.vendor},<br /><br />
                            {selectedQuotation.projectName} க்கான விலைப்பட்டியல்களை நாங்கள் கோருகிறோம். இணைக்கப்பட்ட விவரக்குறிப்புகளை மதிப்பாய்வு செய்து, விலை நிர்ணயம், விநியோக காலக்கெடு மற்றும் உத்தரவாத விதிமுறைகள் உள்ளிட்ட உங்கள் சிறந்த விலைப்பட்டியலை வழங்கவும்.<br /><br />
                            உங்கள் பதிலுக்கு எதிர்பார்த்துக் காத்திருக்கிறோம்.
                          </>
                        )}
                        {selectedQuotation.originalLanguage === 'Hindi' && (
                          <>
                            प्रिय {selectedQuotation.vendor},<br /><br />
                            हम {selectedQuotation.projectName} के लिए उद्धरण का अनुरोध कर रहे हैं। कृपया संलग्न विनिर्देशों की समीक्षा करें और मूल्य निर्धारण, डिलीवरी समयरेखा और वारंटी शर्तों सहित अपना सर्वोत्तम उद्धरण प्रदान करें।<br /><br />
                            आपकी प्रतिक्रिया की प्रतीक्षा में।
                          </>
                        )}
                        {selectedQuotation.originalLanguage === 'Telugu' && (
                          <>
                            ప్రియమైన {selectedQuotation.vendor},<br /><br />
                            మేము {selectedQuotation.projectName} కోసం కొటేషన్‌లను అభ్యర్థిస్తున్నాము. దయచేసి జోడించిన స్పెసిఫికేషన్‌లను సమీక్షించండి మరియు ధర, డెలివరీ టైమ్‌లైన్ మరియు వారంటీ నిబంధనలతో సహా మీ ఉత్తమ కొటేషన్‌ను అందించండి.<br /><br />
                            మీ స్పందన కోసం ఎదురు చూస్తున్నాము.
                          </>
                        )}
                        {selectedQuotation.originalLanguage === 'Bengali' && (
                          <>
                            প্রিয় {selectedQuotation.vendor},<br /><br />
                            আমরা {selectedQuotation.projectName} এর জন্য কোটেশন অনুরোধ করছি। অনুগ্রহ করে সংযুক্ত স্পেসিফিকেশন পর্যালোচনা করুন এবং মূল্য, ডেলিভারি টাইমলাইন এবং ওয়ারেন্টি শর্তাবলী সহ আপনার সেরা কোটেশন প্রদান করুন।<br /><br />
                            আপনার প্রতিক্রিয়ার জন্য অপেক্ষা করছি।
                          </>
                        )}
                        {selectedQuotation.originalLanguage === 'Marathi' && (
                          <>
                            प्रिय {selectedQuotation.vendor},<br /><br />
                            आम्ही {selectedQuotation.projectName} साठी कोटेशन विनंती करत आहोत. कृपया संलग्न तपशील पुनरावलोकन करा आणि किंमत, वितरण वेळापत्रक आणि वॉरंटी अटींसह आपले सर्वोत्तम कोटेशन प्रदान करा.<br /><br />
                            आपल्या प्रतिसादाची वाट पाहत आहोत.
                          </>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>

              {/* Quotation Response */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedQuotation.vendor.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{selectedQuotation.vendor}</span>
                        {selectedQuotation.originalLanguage !== 'English' && (
                          <Badge variant="outline" className="text-xs border-[#3B82F6] text-[#3B82F6] bg-blue-50 px-1.5 py-0">
                            <Languages className="w-3 h-3 mr-1" />
                            Translated
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{selectedQuotation.submittedAt} 11:20</span>
                    </div>
                    <p className="text-xs text-gray-500">to procurement@procureai.com</p>
                  </div>
                </div>
                <div className="ml-13 space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Thank you for your inquiry. Please find our quotation for {selectedQuotation.projectName}:
                  </p>
                  
                  {/* Gmail-style Quotation Metrics - Inline */}
                  <div className="text-sm text-gray-900 leading-relaxed space-y-1">
                    <p><span className="font-semibold">Price:</span> {selectedQuotation.price ? `₹${selectedQuotation.price.toLocaleString()}` : 'N/A'}</p>
                    <p><span className="font-semibold">Delivery:</span> {selectedQuotation.deliveryDays ? `${selectedQuotation.deliveryDays} days` : 'N/A'}</p>
                    <p><span className="font-semibold">Warranty:</span> {selectedQuotation.warranty ? selectedQuotation.warranty : 'N/A'}</p>
                  </div>

                  {/* Attachments Section */}
                  {selectedQuotation.attachments && selectedQuotation.attachments.length > 0 && (
                    <div className="space-y-2">
                      {selectedQuotation.attachments.map((attachment: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => handleDownloadAttachment(attachment.name)}
                          className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex-shrink-0">
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500">{attachment.size}</p>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="w-4 h-4 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message - Always English with Original Language Collapsible */}
                  <div className="text-sm text-gray-900 leading-relaxed">
                    {selectedQuotation.translatedMessage}
                  </div>
                  
                  {/* Original Message (Collapsed) - Non-English */}
                  {selectedQuotation.originalLanguage !== 'English' && (
                    <details className="text-xs mt-3">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5" />
                        Show original ({selectedQuotation.originalLanguage})
                      </summary>
                      <p className="mt-2 text-gray-600 italic pl-4 border-l-2 border-gray-200">
                        {selectedQuotation.originalMessage}
                      </p>
                    </details>
                  )}
                </div>
              </div>
            </div>

            {/* Reply Section */}
            <div className="border-t border-[#eeeff1] bg-white">
              <div className="px-6 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">RK</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2">Reply to {selectedQuotation.vendor}</p>
                  </div>
                </div>
                <div className="ml-13">
                  <textarea
                    placeholder="Type your reply..."
                    className="w-full min-h-[120px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Button
                      variant="outline"
                      onClick={() => setEmailThreadOpen(false)}
                      className="text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        toast.success(`Reply sent to ${selectedQuotation.vendor}`);
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
        </div>,
        document.body
      )}
    </>
  );
}