import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';

interface AIRFPCreatorProps {
  projectName: string;
  onBack: () => void;
  onSendForApproval: (rfpData: any) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIRFPCreator({ projectName, onBack, onSendForApproval }: AIRFPCreatorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm here to help you create an RFP for "${projectName}". Please describe what you need. For example: "Create proposal for Surgical Gloves of 10,000 pairs with sterile packaging"`,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rfpGenerated, setRfpGenerated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);

    // Simulate AI processing
    setTimeout(() => {
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

      setIsGenerating(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();

    // Check if this is the initial RFP request
    if (lowerInput.includes('surgical gloves') || lowerInput.includes('gloves')) {
      return {
        message: "I've generated a comprehensive RFP for Surgical Gloves. You can see the details on the right side. Would you like me to make any changes?",
        rfpData: {
          productName: 'Sterile Nitrile Surgical Gloves',
          quantity: '10,000 pairs',
          specifications: [
            'Material: Nitrile (latex-free)',
            'Size: 7.5 (or assorted sizes)',
            'Thickness: 0.2mm minimum',
            'Powder-free',
            'Sterile packaging (single-use)',
            'Textured fingertips for better grip',
            'Compliance: FDA approved, ISO 13485 certified'
          ],
          deliveryTimeline: '45 days from PO date',
          budget: '$45,000 - $55,000',
          qualityStandards: [
            'Must meet ASTM D3578 standards',
            'Biocompatibility testing required',
            'Shelf life: Minimum 3 years',
            'Storage: Cool, dry environment'
          ],
        }
      };
    }

    // Handle modification requests
    if (lowerInput.includes('change') || lowerInput.includes('modify') || lowerInput.includes('update')) {
      if (lowerInput.includes('quantity')) {
        return {
          message: "I've updated the quantity. Please specify the new quantity you'd like.",
          rfpData: { ...rfpData }
        };
      }
      if (lowerInput.includes('timeline') || lowerInput.includes('delivery')) {
        return {
          message: "I can adjust the delivery timeline. What timeline would you prefer?",
          rfpData: { ...rfpData }
        };
      }
      return {
        message: "I can help you modify the RFP. What specific changes would you like to make?",
        rfpData: { ...rfpData }
      };
    }

    // Default response
    return {
      message: "I understand. Could you please provide more specific details about what you'd like to change or add to the RFP?",
      rfpData: null
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
      {/* Left Side - Chat Interface */}
      <div className="w-[380px] bg-white flex flex-col border-r border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{projectName}</h2>
            <p className="text-xs text-gray-500 mt-1">Create your RFP with AI assistance</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#F3F4F6] text-gray-900'
                  }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="text-xs font-medium text-[#3B82F6]">AI Assistant</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-[#F3F4F6] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your requirements or request changes..."
              className="flex-1 min-h-[44px] max-h-[120px] resize-none border-0 bg-[#F3F4F6] text-sm"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isGenerating}
              className="h-[44px] w-[44px] bg-[#3B82F6] hover:bg-[#2563EB] p-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Canvas/Preview */}
      <div className="flex-1 bg-[#fafafa] p-8 overflow-y-auto">
        <div className="max-w-[800px] mx-auto">
          {!rfpGenerated ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">RFP Preview</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Your AI-generated RFP will appear here. Start by describing your requirements in the chat.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              {/* RFP Header */}
              <div className="mb-8 pb-6 border-b border-gray-100">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Request for Proposal</h1>
                <p className="text-sm text-gray-500">{projectName}</p>
              </div>

              {/* Product Details */}
              <div className="mb-8">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Product Details</h2>
                <div className="grid grid-cols-2 gap-4 bg-[#F3F4F6] rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Product Name</p>
                    <p className="text-sm font-medium text-gray-900">{rfpData.productName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quantity Required</p>
                    <p className="text-sm font-medium text-gray-900">{rfpData.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Delivery Timeline</p>
                    <p className="text-sm font-medium text-gray-900">{rfpData.deliveryTimeline}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Budget Range</p>
                    <p className="text-sm font-medium text-gray-900">{rfpData.budget}</p>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="mb-8">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Technical Specifications</h2>
                <div className="space-y-2">
                  {rfpData.specifications.map((spec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full mt-2"></div>
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Standards */}
              <div className="mb-8">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Quality Standards & Compliance</h2>
                <div className="space-y-2">
                  {rfpData.qualityStandards.map((standard, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{standard}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish RFP Button */}
              <div className="pt-6 border-t border-gray-100">
                <Button
                  onClick={() => onSendForApproval({ projectName, ...rfpData })}
                  className="w-full h-12 bg-[#3B82F6] hover:bg-[#2563EB]"
                >
                  Publish RFP
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}