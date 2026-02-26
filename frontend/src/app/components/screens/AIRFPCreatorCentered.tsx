import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, FileText, CheckCircle2, Bold, Italic, Underline, List, ListOrdered, Link, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { ConfirmDialog } from '@/app/components/ui/ConfirmDialog';

interface AIRFPCreatorCenteredProps {
  onBack: () => void;
  onSendForApproval: (rfpData: any) => void;
  projectName?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIRFPCreatorCentered({ onBack, onSendForApproval, projectName: initialProjectName = '' }: AIRFPCreatorCenteredProps) {
  const [projectName, setProjectName] = useState(initialProjectName);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm here to help you create an RFP. Please describe what you need. For example: \"Create proposal for Surgical Gloves of 10,000 pairs with sterile packaging\"`,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rfpGenerated, setRfpGenerated] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleSections, setVisibleSections] = useState<number[]>([]);

  // Track collected information
  const [collectedInfo, setCollectedInfo] = useState({
    product: '',
    quantity: '',
    deliveryTimeline: '',
    budget: '',
  });

  // RFP Canvas State
  const [rfpData, setRfpData] = useState({
    productName: '',
    quantity: '',
    specifications: [] as string[],
    deliveryTimeline: '',
    budget: '',
    qualityStandards: [] as string[],
  });

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
      const sections = 9; // Total number of sections
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
        setRfpData(data.rfp_data);
        setRfpGenerated(true);
        setCollectedInfo({
          product: data.rfp_data.productName ?? '',
          quantity: data.rfp_data.quantity ?? '',
          deliveryTimeline: data.rfp_data.deliveryTimeline ?? '',
          budget: data.rfp_data.budget ?? '',
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
        setRfpData(aiResponse.rfpData);
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

    // Update collected info
    setCollectedInfo(updatedInfo);

    // Check what's missing
    const missing = [];
    if (!updatedInfo.product) missing.push('product name');
    if (!updatedInfo.quantity) missing.push('quantity required');
    if (!updatedInfo.deliveryTimeline) missing.push('delivery timeline');
    if (!updatedInfo.budget) missing.push('budget range');

    // If information is missing, ask for it
    if (missing.length > 0) {
      let response = "I'd like to help you create an RFP. ";
      
      if (missing.length === 4) {
        response += "To get started, please provide:\n\n";
        response += "1. What product do you need?\n";
        response += "2. How much quantity do you require?\n";
        response += "3. What's your desired delivery timeline?\n";
        response += "4. What's your budget range?\n\n";
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
        qualityStandards: [
          'Must meet industry standards',
          'Quality testing required',
          'Minimum shelf life requirements',
          'Proper storage conditions'
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
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-[#F3F4F6] text-gray-900'
                      }`}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
        </div>
      </div>

      {/* Canvas Card - 70% - Floating with spacing */}
      <div className="w-[70%] py-6 pr-6 pl-3">
        <div className="bg-white rounded-2xl flex flex-col h-full shadow-sm">
          {/* Rich Text Editor Toolbar - Always visible */}
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bold className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Italic className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Underline className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <List className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ListOrdered className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <AlignLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <AlignCenter className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <AlignRight className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
                <div className="max-w-4xl mx-auto bg-white p-16">
                  {/* RFP Header - Minimal & Professional */}
                  <div className="mb-12 pb-8 border-b border-gray-300">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">REQUEST FOR PROPOSAL</h1>
                        <p className="text-lg text-gray-600">{projectName || 'Untitled Project'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Document No.</p>
                        <p className="text-sm font-bold text-gray-900">RFP-{new Date().getFullYear()}-{String(Date.now()).slice(-6)}</p>
                        <p className="text-xs text-gray-500 mt-3">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className={`mb-12 ${visibleSections.includes(0) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Executive Summary</h2>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      This Request for Proposal (RFP) is issued to solicit proposals from qualified suppliers for the procurement of {rfpData.productName}. 
                      The objective is to establish a partnership with a reliable vendor who can provide high-quality products that meet our stringent 
                      specifications and delivery requirements.
                    </p>
                  </div>

                  {/* Product Details - Clean Grid */}
                  <div className={`mb-12 ${visibleSections.includes(1) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">1. Product Requirements</h2>
                    <div className="space-y-6">
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Name</p>
                        <p className="text-sm text-gray-900">{rfpData.productName}</p>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity Required</p>
                        <p className="text-sm text-gray-900">{rfpData.quantity}</p>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Timeline</p>
                        <p className="text-sm text-gray-900">{rfpData.deliveryTimeline}</p>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget Allocation</p>
                        <p className="text-sm font-semibold text-gray-900">{rfpData.budget}</p>
                      </div>
                    </div>
                  </div>

                  {/* Technical Specifications - Minimal List */}
                  <div className={`mb-12 ${visibleSections.includes(2) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">2. Technical Specifications</h2>
                    <div className="space-y-4">
                      {rfpData.specifications.map((spec, index) => (
                        <div key={index} className="grid grid-cols-[40px_1fr] gap-4">
                          <span className="text-sm text-gray-400">{index + 1}.</span>
                          <span className="text-sm text-gray-700 leading-relaxed">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quality Standards - Clean Format */}
                  <div className={`mb-12 ${visibleSections.includes(3) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">3. Quality Standards & Compliance</h2>
                    <div className="space-y-4">
                      {rfpData.qualityStandards.map((standard, index) => (
                        <div key={index} className="grid grid-cols-[40px_1fr] gap-4">
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-700 leading-relaxed">{standard}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scope of Work */}
                  <div className={`mb-12 ${visibleSections.includes(4) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">4. Scope of Work</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Supply of {rfpData.productName} in accordance with the specifications outlined in Section 2
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Packaging and labeling as per industry standards and regulatory requirements
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Delivery to designated location(s) within the specified timeline
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Provision of necessary documentation including certificates of compliance and quality assurance reports
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Requirements */}
                  <div className={`mb-12 ${visibleSections.includes(5) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">5. Proposal Submission Requirements</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Company profile and relevant experience in supplying similar products
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Detailed pricing breakdown including unit cost, taxes, and shipping charges
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Product samples (if applicable) and technical documentation
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          References from previous clients and case studies
                        </span>
                      </div>
                      <div className="grid grid-cols-[40px_1fr] gap-4">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          Certification documents proving compliance with quality standards
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Criteria */}
                  <div className={`mb-12 ${visibleSections.includes(6) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">6. Evaluation Criteria</h2>
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      Proposals will be evaluated based on the following criteria:
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[1fr_100px] gap-4">
                        <span className="text-sm text-gray-700">Price Competitiveness</span>
                        <span className="text-sm text-gray-500 text-right">30%</span>
                      </div>
                      <div className="grid grid-cols-[1fr_100px] gap-4">
                        <span className="text-sm text-gray-700">Quality & Compliance</span>
                        <span className="text-sm text-gray-500 text-right">25%</span>
                      </div>
                      <div className="grid grid-cols-[1fr_100px] gap-4">
                        <span className="text-sm text-gray-700">Delivery Timeline & Reliability</span>
                        <span className="text-sm text-gray-500 text-right">20%</span>
                      </div>
                      <div className="grid grid-cols-[1fr_100px] gap-4">
                        <span className="text-sm text-gray-700">Previous Experience & References</span>
                        <span className="text-sm text-gray-500 text-right">15%</span>
                      </div>
                      <div className="grid grid-cols-[1fr_100px] gap-4">
                        <span className="text-sm text-gray-700">Technical Capabilities</span>
                        <span className="text-sm text-gray-500 text-right">10%</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className={`mb-12 ${visibleSections.includes(7) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">7. Terms & Conditions</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Terms</p>
                        <p className="text-sm text-gray-700">Net 30 days from delivery and acceptance</p>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Warranty Period</p>
                        <p className="text-sm text-gray-700">Minimum 12 months from date of delivery</p>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposal Validity</p>
                        <p className="text-sm text-gray-700">90 days from submission date</p>
                      </div>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Deadline</p>
                        <p className="text-sm text-gray-700">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className={`mb-12 ${visibleSections.includes(8) ? 'animate-slide-in' : 'section-hidden'}`}>
                    <h2 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">8. Contact Information</h2>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">For any queries or clarifications regarding this RFP, please contact:</p>
                      <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Procurement Department</p>
                        <p className="text-sm text-gray-700">procurement@company.com</p>
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
                // Handle save as draft
                console.log('Saved as draft:', { projectName: projectName || 'Untitled Project', ...rfpData });
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
              Send for Approval
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
        title="Send RFP for Approval?"
        description={`Are you sure you want to send "${projectName || 'Untitled Project'}" for approval? It will be reviewed by the approval team.`}
        confirmText="Send for Approval"
        cancelText="Cancel"
      />
    </div>
  );
}