import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, FileText, CheckCircle2, Bold, Italic, Underline, List, ListOrdered, Link, AlignLeft, AlignCenter, AlignRight, Plus, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';
import { jwtDecode } from 'jwt-decode';

interface AIRFPCreatorCenteredProps {
  onBack: () => void;
  onSendForApproval: (rfpData: any) => void;
  onSaveAsDraft?: (rfpData: any) => void;
  projectName?: string;
  initialRfpData?: any;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const renderMarkdownMsg = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

const EditorInput = ({ value, onChange, multiline = false, className = "", richText = false }: { value: string, onChange: (val: string) => void, multiline?: boolean, className?: string, richText?: boolean }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const initialValue = useRef(value);

  // Sync external changes
  useEffect(() => {
    if (elementRef.current && elementRef.current.innerHTML !== value) {
      if (document.activeElement !== elementRef.current) {
        elementRef.current.innerHTML = value;
      }
    }
  }, [value]);

  return (
    <div
      ref={elementRef}
      contentEditable
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onBlur={(e) => onChange(e.currentTarget.innerHTML)}
      className={`min-h-[1.5em] focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 rounded transition-all block ${multiline || richText ? 'whitespace-pre-wrap' : 'whitespace-nowrap overflow-hidden'} ${className}`}
      onKeyDown={(e) => {
        if (!multiline && !richText && e.key === 'Enter') {
          e.preventDefault();
        }
      }}
      dangerouslySetInnerHTML={{ __html: initialValue.current }}
      style={!(multiline || richText) ? { display: 'flex', alignItems: 'center' } : {}}
    />
  );
};

export function AIRFPCreatorCentered({ onBack, onSendForApproval, onSaveAsDraft, projectName: initialProjectName = '', initialRfpData }: AIRFPCreatorCenteredProps) {
  const [projectName, setProjectName] = useState(initialProjectName);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: initialRfpData ? `Welcome back! You can continue editing your draft RFP for **${initialProjectName}**.` : `Hi! I'm here to help you create an RFP. Please describe what you need. For example: \"Create proposal for Surgical Gloves of 10,000 pairs with sterile packaging\"`,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rfpGenerated, setRfpGenerated] = useState(() => {
    // If we have initial data with a documented title/number, consider it generated
    if (initialRfpData && typeof initialRfpData === 'object' && Object.keys(initialRfpData).length > 0) {
      if (initialRfpData.specifications && initialRfpData.specifications.length > 0) {
        return true;
      }
    }
    return false;
  });
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageNumbers, setPageNumbers] = useState<Record<number, number>>({});


  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleSections, setVisibleSections] = useState<number[]>([]);

  // Track collected information
  const [collectedInfo, setCollectedInfo] = useState({
    product: '',
    quantity: '',
    deliveryTimeline: '',
    budget: '',
    rfpDeadline: '',
  });

  // RFP Canvas State
  const [rfpData, setRfpData] = useState(() => {
    if (initialRfpData && typeof initialRfpData === 'object' && Object.keys(initialRfpData).length > 0) {
      if (initialRfpData.specifications && initialRfpData.specifications.length > 0) {
        return initialRfpData;
      }
    }
    return {
      documentTitle: 'REQUEST FOR PROPOSAL',
      documentNo: `RFP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      documentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      executiveSummary: 'This Request for Proposal (RFP) is issued to solicit comprehensive proposals from qualified and experienced suppliers for the procurement of {productName}.\nThe primary objective of this RFP is to establish a strategic partnership with a reliable vendor who can consistently provide high-quality products meeting our stringent technical specifications and rigorous delivery requirements.\nWe are seeking comprehensive solutions that not only fulfill our immediate quantity needs but also align with our long-term quality standards and compliance frameworks.\nRespondents are expected to demonstrate proven industry experience, robust supply chain capabilities, competitive pricing models, and a strong commitment to excellence.\nThe selected partner will collaborate closely with our procurement team to ensure seamless execution, continuous support, and mutually beneficial value generation throughout the entirety of this engagement.',
      productName: '',
      quantity: '',
      specifications: [] as string[],
      deliveryTimeline: '',
      budget: '',
      qualityStandards: [] as string[],
      scopeOfWork: [] as string[],
      submissionRequirements: [] as string[],
      evaluationCriteria: [] as { name: string, weight: string }[],
      termsAndConditions: [] as { title: string, description: string }[],
      rfpDeadline: '',
      costBornByRespondents: 'All expenses incurred by Respondents in any way associated with the development, preparation and submission of a response including but not limited to attendance at meetings, discussions, etc. and providing any additional information required by [Company], will be borne entirely and, exclusively by the Respondent.',
      changesInScope: 'During the response period, [Company] reserves the right to change, add to or delete any part of this RFI. Additions, deletions, or modifications to the original tender could result in tender additions, which will become an integral part of the scope and tender response. HM reserves the right to award a contract for services that is less than those services specified in the scope.',
      clarificationOfSubmissions: '[Company] may, at its sole discretion, seek clarification from any Respondent regarding response information and may do so without notification to any other Respondent. [Company] reserves the right to engage in discussion or negotiation with any Respondent (or simultaneously with more than one Respondent) after the tender closes to improve or clarify any response.',
    };
  });

  const [userEmail, setUserEmail] = useState('procurement@company.com');

  useEffect(() => {
    if (!rfpGenerated || !containerRef.current) return;

    const calculatePages = () => {
      if (!containerRef.current) return;
      const newPages: Record<number, number> = {};
      const containerTop = containerRef.current.offsetTop;
      const PAGE_HEIGHT = 1056; // Standard A4 height approximation

      for (let i = 1; i <= 11; i++) {
        const el = document.getElementById(`section-${i}`);
        if (el) {
          const offsetTop = el.offsetTop - containerTop;
          newPages[i] = Math.max(2, Math.floor(offsetTop / PAGE_HEIGHT) + 2);
        }
      }
      setPageNumbers(newPages);
    };

    calculatePages();

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculatePages);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [rfpGenerated, rfpData, visibleSections]);

  useEffect(() => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const decoded: any = jwtDecode(token);
        const email = decoded?.email || decoded?.primary_email || decoded?.email_address;
        if (email) {
          setUserEmail(email);
        } else if (decoded?.sub && decoded.sub.includes('@')) {
          setUserEmail(decoded.sub);
        } else {
          setUserEmail('procurement@company.com');
        }
      }
    } catch (e) {
      console.error("Failed to decode token", e);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Animation effect for RFP generation
  useEffect(() => {
    if (rfpGenerated && !isAnimating) {
      setIsAnimating(true);
      setVisibleSections([]);

      // Sequentially reveal sections with delay
      const sections = 13; // Total number of sections
      for (let i = 0; i < sections; i++) {
        setTimeout(() => {
          setVisibleSections(prev => [...prev, i]);
          if (i === sections - 1) {
            setTimeout(() => setIsAnimating(false), 500);
          }
        }, i * 400); // 400ms delay between each section
      }
    }
  }, [rfpGenerated]);

  const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsGenerating(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/rfp/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          project_name: projectName,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.is_complete && data.rfp_data) {
        setRfpData({
          documentTitle: 'REQUEST FOR PROPOSAL',
          documentNo: `RFP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          documentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          executiveSummary: `This Request for Proposal (RFP) is issued to solicit comprehensive proposals from qualified and experienced suppliers for the procurement of ${data.rfp_data.productName || 'products'}.\nThe primary objective of this RFP is to establish a strategic partnership with a reliable vendor who can consistently provide high-quality products meeting our stringent technical specifications and rigorous delivery requirements.\nWe are seeking comprehensive solutions that not only fulfill our immediate quantity needs but also align with our long-term quality standards and compliance frameworks.\nRespondents are expected to demonstrate proven industry experience, robust supply chain capabilities, competitive pricing models, and a strong commitment to excellence.\nThe selected partner will collaborate closely with our procurement team to ensure seamless execution, continuous support, and mutually beneficial value generation throughout the entirety of this engagement.`,
          productName: data.rfp_data.productName || '',
          quantity: data.rfp_data.quantity || '',
          deliveryTimeline: data.rfp_data.deliveryTimeline || '',
          budget: data.rfp_data.budget || '',
          specifications: data.rfp_data.specifications || [],
          qualityStandards: data.rfp_data.qualityStandards || [],
          scopeOfWork: data.rfp_data.scopeOfWork || [
            `Supply of ${data.rfp_data.productName || 'product'} in accordance with the specifications outlined in Section 2`,
            'Packaging and labeling as per industry standards and regulatory requirements',
            'Delivery to designated location(s) within the specified timeline',
            'Provision of necessary documentation including certificates of compliance and quality assurance reports'
          ],
          submissionRequirements: data.rfp_data.submissionRequirements || [
            'Company profile and relevant experience in supplying similar products',
            'Detailed pricing breakdown including unit cost, taxes, and shipping charges',
            'Product samples (if applicable) and technical documentation',
            'References from previous clients and case studies',
            'Certification documents proving compliance with quality standards'
          ],
          evaluationCriteria: data.rfp_data.evaluationCriteria || [
            { name: 'Price Competitiveness', weight: '30%' },
            { name: 'Quality & Compliance', weight: '25%' },
            { name: 'Delivery Timeline & Reliability', weight: '20%' },
            { name: 'Previous Experience & References', weight: '15%' },
            { name: 'Technical Capabilities', weight: '10%' }
          ],
          termsAndConditions: data.rfp_data.termsAndConditions || [
            { title: 'Payment Terms', description: 'Net 30 days from delivery and acceptance' },
            { title: 'Warranty Period', description: 'Minimum 12 months from date of delivery' },
            { title: 'Proposal Validity', description: '90 days from submission date' }
          ],
          rfpDeadline: data.rfp_data.rfpDeadline || '',
          costBornByRespondents: data.rfp_data.costBornByRespondents || 'All expenses incurred by Respondents in any way associated with the development, preparation and submission of a response including but not limited to attendance at meetings, discussions, etc. and providing any additional information required by [Company], will be borne entirely and, exclusively by the Respondent.',
          changesInScope: data.rfp_data.changesInScope || 'During the response period, [Company] reserves the right to change, add to or delete any part of this RFI. Additions, deletions, or modifications to the original tender could result in tender additions, which will become an integral part of the scope and tender response. HM reserves the right to award a contract for services that is less than those services specified in the scope.',
          clarificationOfSubmissions: data.rfp_data.clarificationOfSubmissions || '[Company] may, at its sole discretion, seek clarification from any Respondent regarding response information and may do so without notification to any other Respondent. [Company] reserves the right to engage in discussion or negotiation with any Respondent (or simultaneously with more than one Respondent) after the tender closes to improve or clarify any response.',
        });
        setRfpGenerated(true);
        setCollectedInfo({
          product: data.rfp_data.productName ?? '',
          quantity: data.rfp_data.quantity ?? '',
          deliveryTimeline: data.rfp_data.deliveryTimeline ?? '',
          budget: data.rfp_data.budget ?? '',
          rfpDeadline: data.rfp_data.rfpDeadline ?? '',
        });
      }
    } catch (err) {
      // Fallback to local pattern-matching when the backend is unreachable
      const aiResponse = generateAIResponse(inputValue);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (aiResponse.rfpData) {
        setRfpData({
          documentTitle: 'REQUEST FOR PROPOSAL',
          documentNo: `RFP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          documentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          executiveSummary: `This Request for Proposal (RFP) is issued to solicit comprehensive proposals from qualified and experienced suppliers for the procurement of ${aiResponse.rfpData.productName || 'products'}.\nThe primary objective of this RFP is to establish a strategic partnership with a reliable vendor who can consistently provide high-quality products meeting our stringent technical specifications and rigorous delivery requirements.\nWe are seeking comprehensive solutions that not only fulfill our immediate quantity needs but also align with our long-term quality standards and compliance frameworks.\nRespondents are expected to demonstrate proven industry experience, robust supply chain capabilities, competitive pricing models, and a strong commitment to excellence.\nThe selected partner will collaborate closely with our procurement team to ensure seamless execution, continuous support, and mutually beneficial value generation throughout the entirety of this engagement.`,
          ...aiResponse.rfpData
        });
        setRfpGenerated(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAIResponse = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();
    const updatedInfo = { ...collectedInfo };

    // Extract information from user input
    // Product detection
    if (!updatedInfo.product) {
      if (lowerInput.includes('gloves') || lowerInput.includes('surgical glove')) {
        updatedInfo.product = 'Surgical Gloves';
      } else if (lowerInput.includes('mask') || lowerInput.includes('n95')) {
        updatedInfo.product = 'N95 Masks';
      } else if (lowerInput.includes('syringe')) {
        updatedInfo.product = 'Medical Syringes';
      }
      // Add more product pattern matching as needed
    }

    // Quantity detection
    if (!updatedInfo.quantity) {
      const quantityMatch = userInput.match(/(\d+[,\d]*)\s*(pairs?|units?|pieces?|boxes?|packs?)/i);
      if (quantityMatch) {
        updatedInfo.quantity = `${quantityMatch[1]} ${quantityMatch[2]}`;
      }
    }

    // Timeline detection  
    if (!updatedInfo.deliveryTimeline) {
      const timelineMatch = userInput.match(/(\d+)\s*(days?|weeks?|months?)/i);
      if (timelineMatch) {
        updatedInfo.deliveryTimeline = `${timelineMatch[1]} ${timelineMatch[2]}`;
      } else if (lowerInput.includes('asap') || lowerInput.includes('urgent')) {
        updatedInfo.deliveryTimeline = '30 days or less';
      }
    }

    // Budget detection - No validation, accept any number
    if (!updatedInfo.budget) {
      // Range format: $10,000 - $50,000 OR 10000 to 50000
      const budgetRangeMatch = userInput.match(/[\$₹]?\s*([\d,]+)\s*(?:-|to)\s*[\$₹]?\s*([\d,]+)/i);
      if (budgetRangeMatch) {
        const currency = lowerInput.includes('rupee') || lowerInput.includes('inr') || userInput.includes('₹') ? '₹' : '$';
        updatedInfo.budget = `${currency}${budgetRangeMatch[1]} - ${currency}${budgetRangeMatch[2]}`;
      } else {
        // Single amount - accept ANY number
        const singleAmountMatch = userInput.match(/[\$₹]?\s*([\d,]+)/);
        if (singleAmountMatch && singleAmountMatch[1]) {
          const amount = singleAmountMatch[1];
          const currency = lowerInput.includes('rupee') || lowerInput.includes('inr') || userInput.includes('₹') ? '₹' : '$';
          updatedInfo.budget = `${currency}${amount}`;
        }
      }
    }

    // Deadline detection
    if (!updatedInfo.rfpDeadline) {
      if (lowerInput.includes('deadline')) {
        updatedInfo.rfpDeadline = userInput;
      }
    }

    // Update collected info
    setCollectedInfo(updatedInfo);

    // Check what's missing
    const missing = [];
    if (!updatedInfo.product) missing.push('product name');
    if (!updatedInfo.quantity) missing.push('quantity required');
    if (!updatedInfo.deliveryTimeline) missing.push('delivery timeline');
    if (!updatedInfo.budget) missing.push('budget range');
    if (!updatedInfo.rfpDeadline) missing.push('submission deadline for the RFP');

    // If information is missing, ask for it
    if (missing.length > 0) {
      let response = "I'd like to help you create an RFP. ";

      if (missing.length === 5) {
        response += "To get started, please provide:\n\n";
        response += "1. What product do you need?\n";
        response += "2. How much quantity do you require?\n";
        response += "3. What's your desired delivery timeline?\n";
        response += "4. What's your budget range?\n";
        response += "5. What's the submission deadline for the proposals?\n\n";
        response += "You can provide all details in one message!";
      } else {
        response += `I still need the following information:\n\n`;
        missing.forEach((item, index) => {
          response += `${index + 1}. ${item.charAt(0).toUpperCase() + item.slice(1)}\n`;
        });
        response += "\nPlease provide these details so I can create your RFP.";
      }

      return {
        message: response,
        rfpData: null
      };
    }

    // All information collected - generate RFP
    return {
      message: `Perfect! I've generated a comprehensive RFP for ${updatedInfo.product}. You can see the details on the right side. Would you like me to make any changes?`,
      rfpData: {
        productName: updatedInfo.product === 'Surgical Gloves' ? 'Sterile Nitrile Surgical Gloves' : updatedInfo.product,
        quantity: updatedInfo.quantity,
        specifications: updatedInfo.product === 'Surgical Gloves' ? [
          'Material: Nitrile (latex-free)',
          'Size: 7.5 (or assorted sizes)',
          'Thickness: 0.2mm minimum',
          'Powder-free',
          'Sterile packaging (single-use)',
          'Textured fingertips for better grip',
          'Compliance: FDA approved, ISO 13485 certified'
        ] : [
          'Industry standard specifications',
          'Quality certified materials',
          'Compliant with regulatory standards'
        ],
        deliveryTimeline: updatedInfo.deliveryTimeline,
        budget: updatedInfo.budget,
        rfpDeadline: updatedInfo.rfpDeadline,
        qualityStandards: [
          'Must meet industry standards',
          'Quality testing required',
          'Minimum shelf life requirements',
          'Proper storage conditions'
        ],
        scopeOfWork: [
          `Supply of ${updatedInfo.product} in accordance with the specifications outlined in Section 2`,
          'Packaging and labeling as per industry standards and regulatory requirements',
          'Delivery to designated location(s) within the specified timeline',
          'Provision of necessary documentation including certificates of compliance and quality assurance reports'
        ],
        submissionRequirements: [
          'Company profile and relevant experience in supplying similar products',
          'Detailed pricing breakdown including unit cost, taxes, and shipping charges',
          'Product samples (if applicable) and technical documentation',
          'References from previous clients and case studies',
          'Certification documents proving compliance with quality standards'
        ],
        evaluationCriteria: [
          { name: 'Price Competitiveness', weight: '30%' },
          { name: 'Quality & Compliance', weight: '25%' },
          { name: 'Delivery Timeline & Reliability', weight: '20%' },
          { name: 'Previous Experience & References', weight: '15%' },
          { name: 'Technical Capabilities', weight: '10%' }
        ],
        termsAndConditions: [
          { title: 'Payment Terms', description: 'Net 30 days from delivery and acceptance' },
          { title: 'Warranty Period', description: 'Minimum 12 months from date of delivery' },
          { title: 'Proposal Validity', description: '90 days from submission date' }
        ],
      }
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Chat Card - 30% - Floating with spacing */}
      <div className="w-[30%] flex items-center py-6 pl-6">
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col h-full w-full">
          {/* Back Button in Chat Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900">RFP AI Agent</h2>
              <span className="ml-auto text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Nova Lite</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Describe your RFP requirements</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <img
                  src="https://storyset.com/illustration/add-files/rafiki"
                  alt="Write your requirements"
                  className="w-64 h-64 mb-6"
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Write Your RFP Requirements</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  Describe what you need and our AI will create a comprehensive RFP for you
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${message.role === 'user'
                        ? 'bg-[#3B82F6] text-white'
                        : 'bg-[#F3F4F6] text-gray-900'
                        }`}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{renderMarkdownMsg(message.content)}</p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-[#F3F4F6] rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-500">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!rfpGenerated && (
            <div className="p-3">
              <div className="relative">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your requirements..."
                  className={`flex-1 w-full ${isInputFocused ? 'min-h-[120px]' : 'min-h-[40px]'} max-h-[200px] resize-none border-0 bg-[#F3F4F6] text-xs transition-all duration-200 pr-12 pb-12`}
                  rows={1}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isGenerating}
                  className="absolute bottom-2 right-2 h-[32px] w-[32px] bg-[#3B82F6] hover:bg-[#2563EB] p-0 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas Card - 70% - Floating with spacing */}
      <div className="w-[70%] py-6 pr-6 pl-3">
        <div className="bg-white rounded-2xl flex flex-col h-full shadow-sm">
          {/* Rich Text Editor Toolbar - Always visible */}
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center gap-1">
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bold className="w-4 h-4 text-gray-600" />
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Italic className="w-4 h-4 text-gray-600" />
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Underline className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <List className="w-4 h-4 text-gray-600" />
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ListOrdered className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyLeft'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <AlignLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyCenter'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <AlignCenter className="w-4 h-4 text-gray-600" />
              </button>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyRight'); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <AlignRight className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button onMouseDown={(e) => { e.preventDefault(); const url = prompt('Enter link URL:'); if (url) document.execCommand('createLink', false, url); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Link className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Canvas Content - Scrollable Area */}
          <div className="flex-1 overflow-y-auto bg-[#FAFAFA] scrollbar-hide">
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              
              .animate-slide-in {
                animation: slideIn 0.5s ease-out forwards;
              }
              
              .section-hidden {
                opacity: 0;
                transform: translateY(20px);
              }
            `}</style>
            {!rfpGenerated ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">RFP Preview</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Your AI-generated RFP will appear here. Start by describing your requirements.
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="max-w-4xl mx-auto bg-white p-16" ref={containerRef}>
                  {/* RFP Header - Minimal & Professional */}
                  <div className="mb-12 pb-8 border-b border-gray-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <EditorInput
                          value={rfpData.documentTitle || 'REQUEST FOR PROPOSAL'}
                          onChange={(val) => setRfpData({ ...rfpData, documentTitle: val })}
                          className="text-4xl font-bold text-gray-900 mb-3 tracking-tight w-full max-w-[600px] uppercase font-sans p-0 m-0 leading-none h-[40px]"
                        />
                        <EditorInput
                          value={projectName || 'Untitled Project'}
                          onChange={setProjectName}
                          className="text-lg text-gray-600 font-medium w-full max-w-lg mt-1"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Document No.</p>
                        <EditorInput
                          value={rfpData.documentNo || `RFP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`}
                          onChange={(val) => setRfpData({ ...rfpData, documentNo: val })}
                          className="text-sm font-bold text-gray-900 text-right w-[150px] p-0 m-0 ml-auto"
                        />
                        <EditorInput
                          value={rfpData.documentDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          onChange={(val) => setRfpData({ ...rfpData, documentDate: val })}
                          className="text-xs text-gray-500 mt-2 text-right w-[150px] p-0 m-0 ml-auto"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className={`mb-12 ${visibleSections.includes(0) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Executive Summary</h2>
                    <EditorInput
                      value={rfpData.executiveSummary}
                      onChange={(val) => setRfpData({ ...rfpData, executiveSummary: val })}
                      multiline={true}
                      className="text-sm text-gray-700 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Table of Contents */}
                  <div className={`mb-12 bg-gray-50 p-6 rounded-xl border border-gray-100 ${visibleSections.includes(1) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Table of Contents</h2>
                    <div className="space-y-2 text-sm text-gray-600 font-medium pb-2">
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-1')?.scrollIntoView({ behavior: 'smooth' })}><span>1. Product Requirements</span><span className="text-gray-400 font-normal">{pageNumbers[1] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-2')?.scrollIntoView({ behavior: 'smooth' })}><span>2. Technical Specifications</span><span className="text-gray-400 font-normal">{pageNumbers[2] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-3')?.scrollIntoView({ behavior: 'smooth' })}><span>3. Quality Standards & Compliance</span><span className="text-gray-400 font-normal">{pageNumbers[3] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-4')?.scrollIntoView({ behavior: 'smooth' })}><span>4. Scope of Work</span><span className="text-gray-400 font-normal">{pageNumbers[4] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-5')?.scrollIntoView({ behavior: 'smooth' })}><span>5. Proposal Submission Requirements</span><span className="text-gray-400 font-normal">{pageNumbers[5] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-6')?.scrollIntoView({ behavior: 'smooth' })}><span>6. Evaluation Criteria</span><span className="text-gray-400 font-normal">{pageNumbers[6] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-7')?.scrollIntoView({ behavior: 'smooth' })}><span>7. Terms & Conditions</span><span className="text-gray-400 font-normal">{pageNumbers[7] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-8')?.scrollIntoView({ behavior: 'smooth' })}><span>8. Cost Born By Respondents</span><span className="text-gray-400 font-normal">{pageNumbers[8] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-9')?.scrollIntoView({ behavior: 'smooth' })}><span>9. Changes in Scope</span><span className="text-gray-400 font-normal">{pageNumbers[9] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-10')?.scrollIntoView({ behavior: 'smooth' })}><span>10. Clarification of Submissions</span><span className="text-gray-400 font-normal">{pageNumbers[10] || '-'}</span></div>
                      <div className="flex justify-between hover:text-blue-600 cursor-pointer transition-colors" onClick={() => document.getElementById('section-11')?.scrollIntoView({ behavior: 'smooth' })}><span>11. Contact Information</span><span className="text-gray-400 font-normal">{pageNumbers[11] || '-'}</span></div>
                    </div>
                  </div>

                  {/* Product Details - Clean Grid */}
                  <div id="section-1" className={`mb-12 ${visibleSections.includes(2) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">1. Product Requirements</h2>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Name</p>
                        <EditorInput value={rfpData.productName} onChange={(val) => setRfpData({ ...rfpData, productName: val })} className="text-sm text-gray-900 font-medium" />
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity Required</p>
                        <EditorInput value={rfpData.quantity} onChange={(val) => setRfpData({ ...rfpData, quantity: val })} className="text-sm text-gray-900 font-medium" />
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Timeline</p>
                        <EditorInput value={rfpData.deliveryTimeline} onChange={(val) => setRfpData({ ...rfpData, deliveryTimeline: val })} className="text-sm text-gray-900 font-medium" />
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget Allocation</p>
                        <EditorInput value={rfpData.budget} onChange={(val) => setRfpData({ ...rfpData, budget: val })} className="text-sm text-gray-900 font-semibold" />
                      </div>
                    </div>
                  </div>

                  {/* Technical Specifications - Minimal List */}
                  <div id="section-2" className={`mb-12 ${visibleSections.includes(3) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">2. Technical Specifications</h2>
                    <div className="space-y-4">
                      {rfpData.specifications.map((spec, index) => (
                        <div key={index} className="flex gap-4 items-start group">
                          <span className="text-sm text-gray-400 w-6 text-right shrink-0 mt-[2px]">{index + 1}.</span>
                          <EditorInput
                            value={spec}
                            richText={true}
                            onChange={(val) => {
                              const newSpecs = [...rfpData.specifications];
                              newSpecs[index] = val;
                              setRfpData({ ...rfpData, specifications: newSpecs });
                            }}
                            className="text-sm text-gray-700 leading-relaxed flex-1 w-full m-0"
                          />
                          <button
                            onClick={() => {
                              const newSpecs = rfpData.specifications.filter((_, i) => i !== index);
                              setRfpData({ ...rfpData, specifications: newSpecs });
                            }}
                            className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setRfpData({ ...rfpData, specifications: [...rfpData.specifications, 'New technical specification...'] })}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 p-1.5 ml-10 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add specification
                      </button>
                    </div>
                  </div>

                  {/* Quality Standards - Clean Format */}
                  <div id="section-3" className={`mb-12 ${visibleSections.includes(4) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">3. Quality Standards & Compliance</h2>
                    <div className="space-y-4">
                      {rfpData.qualityStandards.map((standard, index) => (
                        <div key={index} className="flex gap-4 items-start group">
                          <span className="text-sm text-gray-400 w-6 text-right shrink-0 mt-[2px]">•</span>
                          <EditorInput
                            value={standard}
                            richText={true}
                            onChange={(val) => {
                              const newStandards = [...rfpData.qualityStandards];
                              newStandards[index] = val;
                              setRfpData({ ...rfpData, qualityStandards: newStandards });
                            }}
                            className="text-sm text-gray-700 leading-relaxed flex-1 w-full m-0"
                          />
                          <button
                            onClick={() => {
                              const newStandards = rfpData.qualityStandards.filter((_, i) => i !== index);
                              setRfpData({ ...rfpData, qualityStandards: newStandards });
                            }}
                            className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setRfpData({ ...rfpData, qualityStandards: [...rfpData.qualityStandards, 'New quality standard...'] })}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 p-1.5 ml-10 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add quality standard
                      </button>
                    </div>
                  </div>

                  <div id="section-4" className={`mb-12 ${visibleSections.includes(5) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">4. Scope of Work</h2>
                    <div className="space-y-4">
                      {rfpData.scopeOfWork.map((scope, index) => (
                        <div key={index} className="flex gap-4 items-start group">
                          <span className="text-sm text-gray-400 w-6 text-right shrink-0 mt-[2px]">•</span>
                          <EditorInput
                            value={scope}
                            multiline={true}
                            onChange={(val) => {
                              const newScope = [...rfpData.scopeOfWork];
                              newScope[index] = val;
                              setRfpData({ ...rfpData, scopeOfWork: newScope });
                            }}
                            className="text-sm text-gray-700 leading-relaxed flex-1 w-full m-0"
                          />
                          <button
                            onClick={() => {
                              const newScope = rfpData.scopeOfWork.filter((_, i) => i !== index);
                              setRfpData({ ...rfpData, scopeOfWork: newScope });
                            }}
                            className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setRfpData({ ...rfpData, scopeOfWork: [...rfpData.scopeOfWork, 'New scope item...'] })}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 p-1.5 ml-10 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add scope
                      </button>
                    </div>
                  </div>

                  <div id="section-5" className={`mb-12 ${visibleSections.includes(6) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">5. Proposal Submission Requirements</h2>
                    <div className="space-y-4">
                      {rfpData.submissionRequirements.map((req, index) => (
                        <div key={index} className="flex gap-4 items-start group">
                          <span className="text-sm text-gray-400 w-6 text-right shrink-0 mt-[2px]">•</span>
                          <EditorInput
                            value={req}
                            multiline={true}
                            onChange={(val) => {
                              const newReqs = [...rfpData.submissionRequirements];
                              newReqs[index] = val;
                              setRfpData({ ...rfpData, submissionRequirements: newReqs });
                            }}
                            className="text-sm text-gray-700 leading-relaxed flex-1 w-full m-0"
                          />
                          <button
                            onClick={() => {
                              const newReqs = rfpData.submissionRequirements.filter((_, i) => i !== index);
                              setRfpData({ ...rfpData, submissionRequirements: newReqs });
                            }}
                            className="p-1.5 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setRfpData({ ...rfpData, submissionRequirements: [...rfpData.submissionRequirements, 'New requirement...'] })}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 p-1.5 ml-10 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add requirement
                      </button>
                    </div>
                  </div>

                  {/* Evaluation Criteria */}
                  <div id="section-6" className={`mb-12 ${visibleSections.includes(7) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">6. Evaluation Criteria</h2>
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      Proposals will be evaluated based on the following criteria:
                    </p>
                    <div className="space-y-3">
                      {rfpData.evaluationCriteria?.map((criteria, index) => (
                        <div key={index} className="grid grid-cols-[1fr_100px_30px] gap-4 items-center group">
                          <EditorInput
                            value={criteria.name || 'Criteria Name'}
                            multiline={true}
                            onChange={(val) => {
                              const newCriteria = [...rfpData.evaluationCriteria];
                              newCriteria[index].name = val;
                              setRfpData({ ...rfpData, evaluationCriteria: newCriteria });
                            }}
                            className="text-sm text-gray-700 font-medium m-0 p-1.5 bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-blue-200 focus:ring-2 focus:ring-blue-100 rounded transition-all"
                          />
                          <EditorInput
                            value={criteria.weight || '0%'}
                            onChange={(val) => {
                              const newCriteria = [...rfpData.evaluationCriteria];
                              newCriteria[index].weight = val;
                              setRfpData({ ...rfpData, evaluationCriteria: newCriteria });
                            }}
                            className="text-sm text-gray-500 font-semibold text-right m-0 p-1.5 bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-blue-200 focus:ring-2 focus:ring-blue-100 rounded transition-all"
                          />
                          <button
                            onClick={() => {
                              const newCriteria = rfpData.evaluationCriteria.filter((_, i) => i !== index);
                              setRfpData({ ...rfpData, evaluationCriteria: newCriteria });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setRfpData({ ...rfpData, evaluationCriteria: [...(rfpData.evaluationCriteria || []), { name: 'New criteria', weight: '10%' }] })}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2 p-1.5 hover:bg-blue-50 rounded transition-colors w-fit"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add criteria
                      </button>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div id="section-7" className={`mb-12 ${visibleSections.includes(8) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">7. Terms & Conditions</h2>
                    <div className="space-y-6">
                      {rfpData.termsAndConditions?.map((term, index) => (
                        <div key={index} className="grid grid-cols-[200px_1fr_30px] gap-4 items-start group">
                          <EditorInput
                            value={term.title || 'Term Title'}
                            multiline={true}
                            onChange={(val) => {
                              const newTerms = [...rfpData.termsAndConditions];
                              newTerms[index].title = val;
                              setRfpData({ ...rfpData, termsAndConditions: newTerms });
                            }}
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-full m-0 p-1 max-w-[190px]"
                          />
                          <EditorInput
                            value={term.description || 'Description...'}
                            multiline={true}
                            onChange={(val) => {
                              const newTerms = [...rfpData.termsAndConditions];
                              newTerms[index].description = val;
                              setRfpData({ ...rfpData, termsAndConditions: newTerms });
                            }}
                            className="text-sm text-gray-700 m-0 p-1"
                          />
                          <button
                            onClick={() => {
                              const newTerms = rfpData.termsAndConditions.filter((_, i) => i !== index);
                              setRfpData({ ...rfpData, termsAndConditions: newTerms });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center mt-0.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-4 py-2 border-t border-gray-100">
                        <button
                          onClick={() => setRfpData({ ...rfpData, termsAndConditions: [...(rfpData.termsAndConditions || []), { title: 'New Term', description: 'Description' }] })}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 p-1.5 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add term
                        </button>
                      </div>

                      <div className="grid grid-cols-[200px_1fr] gap-4 items-center pt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Deadline</p>
                        <EditorInput
                          value={rfpData.rfpDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          onChange={(val) => setRfpData({ ...rfpData, rfpDeadline: val })}
                          className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit inline-block"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cost Born By Respondents */}
                  <div id="section-8" className={`mb-12 ${visibleSections.includes(9) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">8. Cost Born By Respondents</h2>
                    <EditorInput
                      value={rfpData.costBornByRespondents}
                      onChange={(val) => setRfpData({ ...rfpData, costBornByRespondents: val })}
                      multiline={true}
                      className="text-sm text-gray-700 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Changes in Scope */}
                  <div id="section-9" className={`mb-12 ${visibleSections.includes(10) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">9. Changes in Scope</h2>
                    <EditorInput
                      value={rfpData.changesInScope}
                      onChange={(val) => setRfpData({ ...rfpData, changesInScope: val })}
                      multiline={true}
                      className="text-sm text-gray-700 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Clarification of Submissions */}
                  <div id="section-10" className={`mb-12 ${visibleSections.includes(11) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">10. Clarification of Submissions</h2>
                    <EditorInput
                      value={rfpData.clarificationOfSubmissions}
                      onChange={(val) => setRfpData({ ...rfpData, clarificationOfSubmissions: val })}
                      multiline={true}
                      className="text-sm text-gray-700 leading-relaxed font-sans"
                    />
                  </div>

                  <div id="section-11" className={`mb-12 ${visibleSections.includes(12) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">11. Contact Information</h2>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">For any queries or clarifications regarding this RFP, please contact:</p>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Procurement Department</p>
                        <EditorInput
                          value={userEmail}
                          onChange={setUserEmail}
                          className="text-sm text-gray-900 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-8 border-t border-gray-300">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      This document is confidential and proprietary. All information contained herein is for the exclusive use of the intended recipient(s).
                      Unauthorized disclosure, distribution, or copying is strictly prohibited.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <Button
              onClick={() => {
                onSaveAsDraft?.({ projectName: projectName || 'Untitled Project', ...rfpData });
              }}
              disabled={!projectName.trim() || !rfpGenerated}
              className="h-12 px-6 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 disabled:opacity-50 text-sm font-medium"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!projectName.trim() || !rfpGenerated}
              className="h-12 px-6 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-sm font-medium"
            >
              Publish RFP
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          onSendForApproval({ projectName: projectName || 'Untitled Project', ...rfpData });
        }}
        title="Publish RFP?"
        description={`Are you sure you want to publish "${projectName || 'Untitled Project'}"? It will no longer be editable once published.`}
        confirmText="Publish RFP"
        cancelText="Cancel"
      />
    </div>
  );
}