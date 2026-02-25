import { useState } from 'react';
import { Sparkles, Send, CheckCircle2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import type { Screen } from '@/app/App';

interface RFPManagerProps {
  onNavigate: (screen: Screen) => void;
  selectedVendor?: any;
  onRFPSent: (rfp: any) => void;
}

export function RFPManager({ onNavigate, selectedVendor, onRFPSent }: RFPManagerProps) {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [timeline, setTimeline] = useState('');
  const [requirements, setRequirements] = useState('');
  const [generatedRFP, setGeneratedRFP] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending_approval' | 'approved' | 'sent'>('draft');
  const [approvalLevel, setApprovalLevel] = useState<'none' | 'manager' | 'finance' | 'complete'>('none');

  const generateRFP = () => {
    const rfpText = `REQUEST FOR PROPOSAL

Date: January 22, 2026
RFP Number: RFP-2026-004
${selectedVendor ? `Vendor: ${selectedVendor.name}` : ''}

Dear Prospective Vendor,

We are pleased to invite you to submit a proposal for the following procurement:

PRODUCT SPECIFICATION:
Product Name: ${productName || '[Product Name]'}
Quantity Required: ${quantity || '[Quantity]'}
Delivery Timeline: ${timeline || '[Timeline]'}

KEY REQUIREMENTS:
${requirements || '[Requirements to be specified]'}

TERMS AND CONDITIONS:
1. All prices should be quoted in USD
2. Delivery terms: FOB Destination
3. Payment terms: Net 30 days from delivery
4. Warranty: Minimum 12 months from delivery date
5. Quality standards: Must meet ISO 9001 certification requirements

SUBMISSION REQUIREMENTS:
- Detailed technical specifications
- Unit pricing and total cost breakdown
- Delivery schedule and logistics plan
- Quality certifications and compliance documents
- References from similar projects

EVALUATION CRITERIA:
- Price competitiveness (40%)
- Quality and compliance (30%)
- Delivery capability (20%)
- Vendor track record (10%)

SUBMISSION DEADLINE:
Please submit your proposal by [Deadline Date] to procurement@company.com

Should you have any questions or require clarification, please contact our procurement team.

We look forward to receiving your proposal.

Sincerely,
Procurement Department`;

    setGeneratedRFP(rfpText);
  };

  const handleSend = () => {
    const rfp = {
      id: 'RFP-2026-004',
      vendor: selectedVendor?.name || 'Multiple Vendors',
      product: productName,
      status: 'sent',
      timestamp: new Date(),
    };
    onRFPSent(rfp);
  };

  const statusSteps = [
    { key: 'draft', label: 'Draft', icon: FileText },
    { key: 'pending_approval', label: 'Pending Approval', icon: CheckCircle2 },
    { key: 'approved', label: 'Approved', icon: CheckCircle2 },
    { key: 'sent', label: 'Sent', icon: Send },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create Proposal</h1>
            {selectedVendor && (
              <p className="text-sm text-gray-600">For: <span className="font-medium text-gray-900">{selectedVendor.name}</span></p>
            )}
          </div>
          
          {/* Status Pills */}
          <div className="flex items-center gap-2">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.key === status;
              const isPassed = statusSteps.findIndex(s => s.key === status) > index;
              
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive ? 'bg-blue-500 text-white' : 
                    isPassed ? 'bg-green-50 text-green-700' : 
                    'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{step.label}</span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className={`w-6 h-0.5 rounded ${isPassed ? 'bg-green-200' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-8">
        {/* Approval Workflow - Show when pending */}
        {status === 'pending_approval' && (
          <div className="bg-amber-50 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Approval Required</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    approvalLevel === 'manager' || approvalLevel === 'finance' || approvalLevel === 'complete' 
                      ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <CheckCircle2 className={`w-5 h-5 ${
                      approvalLevel === 'manager' || approvalLevel === 'finance' || approvalLevel === 'complete'
                        ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                    <p className="text-xs text-gray-600">Department Manager</p>
                  </div>
                </div>
                {approvalLevel === 'manager' && (
                  <Button 
                    size="sm" 
                    className="bg-[#3B82F6] hover:bg-[#2563EB] h-9"
                    onClick={() => {
                      setApprovalLevel('finance');
                      setTimeout(() => {
                        setApprovalLevel('complete');
                        setStatus('approved');
                      }, 1500);
                    }}
                  >
                    Approve
                  </Button>
                )}
                {(approvalLevel === 'finance' || approvalLevel === 'complete') && (
                  <Badge className="text-xs px-3 py-1 bg-green-50 text-green-700 border border-green-200">Approved</Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    approvalLevel === 'complete' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <CheckCircle2 className={`w-5 h-5 ${
                      approvalLevel === 'complete' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Michael Chen</p>
                    <p className="text-xs text-gray-600">Finance Department</p>
                  </div>
                </div>
                {approvalLevel === 'finance' && (
                  <Badge className="text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200">Pending</Badge>
                )}
                {approvalLevel === 'complete' && (
                  <Badge className="text-xs px-3 py-1 bg-green-50 text-green-700 border border-green-200">Approved</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Left Side - Input Form */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Proposal Details</h2>
              <Card className="bg-white">
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="product" className="text-sm font-medium text-gray-700">Product Name</Label>
                    <Input 
                      id="product"
                      placeholder="e.g., Industrial Laptops"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity</Label>
                      <Input 
                        id="quantity"
                        placeholder="e.g., 500 units"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeline" className="text-sm font-medium text-gray-700">Timeline</Label>
                      <Input 
                        id="timeline"
                        placeholder="e.g., 60 days"
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements" className="text-sm font-medium text-gray-700">Requirements</Label>
                    <Textarea 
                      id="requirements"
                      placeholder="• Intel i7 processor or equivalent&#10;• 16GB RAM minimum&#10;• 512GB SSD storage&#10;• Windows 11 Pro pre-installed"
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      className="min-h-[240px] resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] h-11"
              onClick={generateRFP}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Proposal
            </Button>
          </div>

          {/* Right Side - Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
              {generatedRFP && (
                <Badge className="text-xs px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3 mr-1 inline" />
                  AI Generated
                </Badge>
              )}
            </div>
            
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="bg-gray-50 rounded-lg p-5 min-h-[480px] font-mono text-xs text-gray-700 whitespace-pre-wrap">
                  {generatedRFP || 'Your AI-generated proposal will appear here...\n\nClick "Generate Proposal" to create a professional RFP document based on your inputs.'}
                </div>
              </CardContent>
            </Card>

            {generatedRFP && (
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 h-11"
                  onClick={() => {
                    setStatus('pending_approval');
                    setApprovalLevel('manager');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit for Approval
                </Button>
                <Button 
                  variant="outline"
                  className="h-11 px-6"
                  onClick={generateRFP}
                >
                  Regenerate
                </Button>
              </div>
            )}

            {status === 'approved' && (
              <Button 
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] h-11"
                onClick={handleSend}
              >
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedVendor?.name || 'Vendors'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}