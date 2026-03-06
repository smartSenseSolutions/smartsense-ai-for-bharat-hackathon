import { CheckCircle, IndianRupee, Briefcase, MapPin, FileText, Clock, Calendar, Mail, X, Building2, Phone } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE } from '@/app/config';




function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUnixDate(unix: number): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Closure Phase Component
export function ClosurePhase({ proposal, dealData }: { proposal: any; dealData?: any }) {
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // Derive display values — always prefer AI-extracted data, fall back to meaningful placeholders
  const vendorName = dealData?.vendor_name || 'Vendor name not specified';
  const vendorEmail = dealData?.vendor_email || '';
  const vendorLocation = dealData?.vendor_location || 'Location not mentioned in emails';
  const vendorContact = dealData?.vendor_contact || 'Not mentioned in emails';
  const contactPerson = dealData?.contact_person || '';
  const finalPrice = dealData?.final_price ?? null;
  const originalPrice = dealData?.original_price ?? null;
  const savings = dealData?.savings ?? null;
  const savingsPct = dealData?.savings_percentage ?? null;
  const deliveryDays = dealData?.delivery_days ?? null;
  const warranty = dealData?.warranty || 'Not mentioned in emails';
  const paymentTerms = dealData?.payment_terms || 'Not mentioned in emails';
  const certifications: string[] = dealData?.certifications?.length > 0 ? dealData.certifications : [];
  const keyTerms: string[] = dealData?.key_terms || [];
  const summary = dealData?.summary || '';
  const contractStartDate = dealData?.contract_start_date || 'To be confirmed';
  const contractEndDate = dealData?.contract_end_date || 'To be confirmed';

  // Payment schedule
  const paymentSchedule: { milestone: string; percentage: number; amount: number; dueDate: string }[] =
    dealData?.payment_schedule?.length > 0
      ? dealData.payment_schedule.map((s: any) => ({
        milestone: s.milestone || 'Payment',
        percentage: s.percentage ?? 0,
        amount: finalPrice ? Math.round((finalPrice * (s.percentage ?? 0)) / 100) : 0,
        dueDate: s.dueDate || s.due_date || 'To be confirmed',
      }))
      : [];

  // Delivery milestones
  const deliveryMilestones: { phase: string; duration: string; date: string }[] =
    dealData?.delivery_milestones?.length > 0
      ? dealData.delivery_milestones.map((m: any) => ({
        phase: m.phase || 'Phase',
        duration: m.duration || '',
        date: m.estimated_date || m.date || '',
      }))
      : [];

  // Closed-by from localStorage user
  const closedByRaw = localStorage.getItem('user');
  const closedBy = closedByRaw ? (() => { try { const u = JSON.parse(closedByRaw); return u.email || u.name || 'Procurement Team'; } catch { return 'Procurement Team'; } })() : 'Procurement Team';
  const closedDate = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });


  return (
    <div className="h-[calc(100vh-140px)] overflow-y-auto px-8 py-6 pb-20 scrollbar-hide">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Procurement Completed</h2>
          <p className="text-sm text-gray-500">Deal successfully closed — summary of finalized terms</p>
        </div>
      </div>

      {/* AI Extracted Notice */}
      {dealData && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg mb-5">
          <div className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-800">Deal terms extracted by AI (Amazon Nova)</p>
            {summary && <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">{summary}</p>}
            {keyTerms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keyTerms.map((term, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white border border-blue-200 rounded text-[10px] font-medium text-blue-700">{term}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Savings Highlight */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#3B82F6] rounded-lg flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-white" />
            </div>
            <div>
              {savings != null ? (
                <>
                  <p className="text-xs text-gray-600">Total Savings Achieved</p>
                  <p className="text-2xl font-bold text-[#3B82F6]">₹{savings.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-600">{savingsPct}% discount from original quote</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-600">Savings</p>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">Not specified in final agreement</p>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Final Contract Value</p>
            {finalPrice != null ? (
              <>
                <p className="text-xl font-bold text-gray-900">₹{finalPrice.toLocaleString('en-IN')}</p>
                {originalPrice != null && originalPrice !== finalPrice && (
                  <p className="text-xs text-gray-400 line-through">₹{originalPrice.toLocaleString('en-IN')}</p>
                )}
              </>
            ) : (
              <p className="text-sm font-medium text-gray-500">Not mentioned in emails</p>
            )}
          </div>
        </div>
      </div>

      {/* Vendor & Contract Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Vendor Info */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Vendor Information
          </h3>
          <div className="space-y-2.5 mb-3">
            <div>
              <p className="text-xs text-gray-500">Vendor Name</p>
              <p className="text-sm font-medium text-gray-900">{vendorName}</p>
            </div>
            {contactPerson && (
              <div>
                <p className="text-xs text-gray-500">Contact Person</p>
                <p className="text-sm text-gray-900">{contactPerson}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className={`text-sm flex items-center gap-1 ${vendorLocation.includes('not') ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {!vendorLocation.includes('not') && <MapPin className="w-3 h-3" />}
                {vendorLocation}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className={`text-sm ${vendorContact.includes('not') ? 'text-gray-400 italic' : 'text-gray-900'}`}>{vendorContact}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-900 break-all">{vendorEmail || '—'}</p>
            </div>
          </div>
          {certifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#eeeff1] text-gray-900 hover:bg-gray-50 text-xs h-8"
              onClick={() => setPortfolioOpen(true)}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              View Certifications
            </Button>
          )}
        </div>

        {/* Contract Details */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contract Details
          </h3>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-500">PO Number</p>
              <p className={`text-sm ${!dealData?.po_number || dealData?.po_number.includes('Pending') ? 'text-gray-400 italic' : 'text-gray-900'}`}>{dealData?.po_number || 'Pending — to be issued'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contract Number</p>
              <p className={`text-sm ${!dealData?.contract_number || dealData?.contract_number.includes('Pending') ? 'text-gray-400 italic' : 'text-gray-900'}`}>{dealData?.contract_number || 'Pending — to be issued'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Contract Period</p>
              <p className={`text-sm ${contractStartDate === 'To be confirmed' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {contractStartDate === 'To be confirmed' && contractEndDate === 'To be confirmed'
                  ? 'To be confirmed'
                  : `${contractStartDate} – ${contractEndDate}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Terms</p>
              <p className={`text-sm ${paymentTerms.includes('not') ? 'text-gray-400 italic' : 'text-gray-900'}`}>{paymentTerms}</p>
            </div>
          </div>
        </div>

        {/* Delivery & Warranty */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Delivery & Warranty
          </h3>
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-500">Delivery Timeline</p>
              {deliveryDays != null
                ? <p className="text-sm font-medium text-gray-900">{deliveryDays} days from PO</p>
                : <p className="text-sm text-gray-400 italic">Not specified</p>}
            </div>
            {deliveryDays != null && (
              <div>
                <p className="text-xs text-gray-500">Estimated Delivery</p>
                <p className="text-sm text-gray-900">
                  {(() => {
                    const d = new Date();
                    d.setDate(d.getDate() + deliveryDays);
                    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  })()}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Warranty</p>
              <p className={`text-sm ${warranty.includes('not') ? 'text-gray-400 italic' : 'text-gray-900'}`}>{warranty}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Payment Schedule & Delivery Milestones */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Payment Schedule */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            Payment Schedule
          </h3>
          {paymentSchedule.length > 0 ? (
            <div className="space-y-3">
              {paymentSchedule.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{payment.milestone}</p>
                      <p className={`text-xs ${payment.dueDate === 'To be confirmed' ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                        Due: {payment.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {payment.amount > 0
                      ? <p className="text-sm font-semibold text-gray-900">₹{payment.amount.toLocaleString('en-IN')}</p>
                      : <p className="text-xs text-gray-400 italic">Amount TBD</p>
                    }
                    <p className="text-xs text-gray-500">{payment.percentage}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg">
              <IndianRupee className="w-6 h-6 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No payment schedule specified</p>
              <p className="text-xs text-gray-400 mt-0.5">Payment milestones were not defined for this deal.</p>
            </div>
          )}
        </div>

        {/* Delivery Milestones */}
        <div className="border border-[#eeeff1] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Delivery Milestones
          </h3>
          {deliveryMilestones.length > 0 ? (
            <div className="space-y-1">
              {deliveryMilestones.map((milestone, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1 flex-shrink-0">
                    <div className="w-3 h-3 bg-[#3B82F6] rounded-full" />
                    {idx < deliveryMilestones.length - 1 && (
                      <div className="w-0.5 h-8 bg-blue-200 mt-0.5" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{milestone.phase}</p>
                      {milestone.date && <p className="text-xs text-gray-400">{milestone.date}</p>}
                    </div>
                    {milestone.duration && <p className="text-xs text-gray-500">{milestone.duration}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg">
              <Calendar className="w-6 h-6 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No delivery milestones specified</p>
              <p className="text-xs text-gray-400 mt-0.5">Delivery phases were not defined for this deal.</p>
            </div>
          )}
        </div>
      </div>

      {/* Deal Closed Successfully */}
      <div className="border border-green-200 rounded-lg p-4 mb-6 bg-green-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Deal Closed Successfully</p>
            <p className="text-xs text-gray-600">
              Closed by <span className="font-medium">{closedBy}</span> on {closedDate}
              {vendorName && <> · Awarded to <span className="font-medium">{vendorName}</span></>}
            </p>
          </div>
        </div>
      </div>

      {/* Certifications Panel */}
      {portfolioOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setPortfolioOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[400px] bg-white shadow-xl flex flex-col" style={{ zIndex: 1 }}>
            <div className="bg-white border-b border-[#eeeff1] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{vendorName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Certifications & Compliance</p>
              </div>
              <button onClick={() => setPortfolioOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {certifications.map((cert, idx) => (
                    <Badge key={idx} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-900">{vendorEmail || '—'}</span>
                  </div>
                  {contactPerson && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-900">{contactPerson}</span>
                    </div>
                  )}
                  {!vendorContact.includes('not') && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-900">{vendorContact}</span>
                    </div>
                  )}
                  {!vendorLocation.includes('not') && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-900">{vendorLocation}</span>
                    </div>
                  )}
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