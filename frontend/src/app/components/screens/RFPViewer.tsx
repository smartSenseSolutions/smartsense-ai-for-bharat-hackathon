import { useRef } from 'react';
import { FileText, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface RFPViewerProps {
    rfpData: any;
    projectName: string;
    onClose?: () => void;
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

export function RFPViewer({ rfpData, projectName, onClose }: RFPViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    if (!rfpData) return null;

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] overflow-y-auto rounded-xl border border-gray-200 shadow-lg relative">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-20 bg-white shadow-sm"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            )}

            <div className="p-8">
                <div className="max-w-4xl mx-auto bg-white p-12 shadow-sm rounded-lg" ref={containerRef}>
                    {/* RFP Header */}
                    <div className="mb-10 pb-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight uppercase">
                                    {rfpData.documentTitle || 'REQUEST FOR PROPOSAL'}
                                </h1>
                                <p className="text-lg text-gray-600 font-medium">{projectName || 'Untitled Project'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Document No.</p>
                                <p className="text-sm font-bold text-gray-900">{rfpData.documentNo || 'N/A'}</p>
                                <p className="text-xs text-gray-500 mt-1">{rfpData.documentDate || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">Executive Summary</h2>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {rfpData.executiveSummary}
                        </p>
                    </div>

                    {/* Product Requirements */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">1. Product Requirements</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Name</p>
                                <p className="text-sm text-gray-900 font-semibold">{rfpData.productName || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</p>
                                <p className="text-sm text-gray-900 font-semibold">{rfpData.quantity || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Timeline</p>
                                <p className="text-sm text-gray-900 font-semibold">{rfpData.deliveryTimeline || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget</p>
                                <p className="text-sm text-gray-900 font-bold text-blue-600">{rfpData.budget || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">2. Technical Specifications</h2>
                        <div className="space-y-3">
                            {rfpData.specifications?.map((spec: string, index: number) => (
                                <div key={index} className="flex gap-4 items-start">
                                    <span className="text-sm text-gray-400 w-5 text-right shrink-0 mt-[1px]">{index + 1}.</span>
                                    <div className="text-sm text-gray-700 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: spec }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quality Standards */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">3. Quality Standards & Compliance</h2>
                        <div className="space-y-3">
                            {rfpData.qualityStandards?.map((std: string, index: number) => (
                                <div key={index} className="flex gap-4 items-start">
                                    <span className="text-sm text-gray-400 w-5 text-right shrink-0 mt-[1px]">{index + 1}.</span>
                                    <div className="text-sm text-gray-700 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: std }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scope of Work */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">4. Scope of Work</h2>
                        <div className="space-y-3">
                            {rfpData.scopeOfWork?.map((work: string, index: number) => (
                                <div key={index} className="flex gap-4 items-start">
                                    <span className="text-sm text-gray-400 w-5 text-right shrink-0 mt-[1px]">{index + 1}.</span>
                                    <div className="text-sm text-gray-700 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: work }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submission Requirements */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">5. Submission Requirements</h2>
                        <div className="space-y-3">
                            {rfpData.submissionRequirements?.map((req: string, index: number) => (
                                <div key={index} className="flex gap-4 items-start">
                                    <span className="text-sm text-gray-400 w-5 text-right shrink-0 mt-[1px]">{index + 1}.</span>
                                    <div className="text-sm text-gray-700 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: req }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Evaluation Criteria */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">6. Evaluation Criteria</h2>
                        <div className="space-y-4">
                            {rfpData.evaluationCriteria?.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                    <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-bold">{item.weight}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="mb-10">
                        <h2 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded inline-block">7. Terms & Conditions</h2>
                        <div className="space-y-6">
                            {rfpData.termsAndConditions?.map((item: any, index: number) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-400">{index + 1}.</span>
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{item.title}</h3>
                                    </div>
                                    <div className="text-sm text-gray-600 leading-relaxed pl-6" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">End of Document</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
