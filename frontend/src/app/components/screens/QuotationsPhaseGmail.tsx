import { Send, X, IndianRupee, Clock, FileText, FileSpreadsheet, Download, Loader2, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatUnixDate(unix: number | null | undefined): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileType(contentType: string, filename: string): 'pdf' | 'excel' | 'doc' | 'other' {
  const ct = contentType?.toLowerCase() ?? '';
  const ext = filename?.split('.').pop()?.toLowerCase() ?? '';
  if (ct.includes('pdf') || ext === 'pdf') return 'pdf';
  if (ct.includes('spreadsheet') || ct.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (ct.includes('word') || ['docx', 'doc'].includes(ext)) return 'doc';
  return 'other';
}

function FileIcon({ contentType, filename, className }: { contentType: string; filename: string; className?: string }) {
  const type = fileType(contentType, filename);
  if (type === 'excel') return <FileSpreadsheet className={`text-green-600 ${className}`} />;
  if (type === 'doc') return <FileText className={`text-blue-500 ${className}`} />;
  if (type === 'pdf') return <FileText className={`text-red-500 ${className}`} />;
  return <FileText className={`text-gray-400 ${className}`} />;
}

// Quotations Phase Component with Gmail-style UI
export function QuotationsPhaseGmail({ proposal }: { proposal: any }) {
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  const projectId = proposal?.id?.startsWith('RFP-')
    ? proposal.id.replace('RFP-', '')
    : proposal?.id;

  useEffect(() => {
    if (!projectId) { setIsLoading(false); return; }
    const token = localStorage.getItem('auth_token');
    fetch(`${API_BASE}/api/quotes/by-project/${projectId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setQuotations(Array.isArray(data) ? data : []))
      .catch(() => setQuotations([]))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const filteredQuotations = quotations.filter(q =>
    searchQuery === '' ||
    (q.vendor_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.sender_email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEmailClick = async (quotation: any) => {
    setSelectedQuotation(quotation);
    setEmailThreadOpen(true);
    setThreadMessages([]);

    if (!quotation.thread_id) return;

    setIsThreadLoading(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/api/email/threads/${quotation.thread_id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.messages || []);
      }
    } catch {
      // thread unavailable — fall back to quote record data shown in panel
    } finally {
      setIsThreadLoading(false);
    }
  };

  const handleDownloadAttachment = async (att: { id: string; filename: string; content_type: string }, messageId: string) => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(
        `${API_BASE}/api/email/attachments/${att.id}?message_id=${messageId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to download ${att.filename}`);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quotations Received</h2>
            <p className="text-sm text-gray-500">
              {proposal?.title ? `${proposal.title} · ` : ''}
              {isLoading ? 'Loading…' : `${quotations.length} quotation${quotations.length !== 1 ? 's' : ''} received via email`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <Input
            placeholder="Search by vendor name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 bg-white border-gray-200 text-sm w-full"
          />
        </div>

        {/* Gmail-style Email List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Fetching quotations…</span>
            </div>
          ) : filteredQuotations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredQuotations.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => handleEmailClick(quote)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {(quote.vendor_name || 'UN').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{quote.vendor_name || quote.sender_email}</span>
                        <span className="text-xs text-gray-400">{quote.sender_email}</span>
                      </div>
                      {quote.notes && (
                        <p className="text-xs text-gray-600 mb-1.5 line-clamp-1">{quote.notes}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        {quote.price != null && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {Number(quote.price).toLocaleString('en-IN')}
                          </span>
                        )}
                        {quote.delivery_timeline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {quote.delivery_timeline}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {formatDate(quote.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Mail className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No quotations received yet</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Vendor quotation emails will appear here automatically once suppliers reply to their RFP invitations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Email Thread Side Panel */}
      {emailThreadOpen && selectedQuotation && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setEmailThreadOpen(false)} />

          {/* Panel */}
          <div className="absolute top-0 right-0 h-full w-[700px] bg-white shadow-xl flex flex-col" style={{ zIndex: 1 }}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {selectedQuotation.vendor_name || selectedQuotation.sender_email}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedQuotation.sender_email}
                  {selectedQuotation.email_subject ? ` · ${selectedQuotation.email_subject}` : ''}
                </p>
              </div>
              <button onClick={() => setEmailThreadOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quote summary bar */}
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center gap-6 text-sm flex-shrink-0">
              {selectedQuotation.price != null && (
                <span className="flex items-center gap-1 text-gray-800">
                  <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold">{Number(selectedQuotation.price).toLocaleString('en-IN')}</span>
                  <span className="text-gray-500 text-xs">{selectedQuotation.currency}</span>
                </span>
              )}
              {selectedQuotation.delivery_timeline && (
                <span className="flex items-center gap-1 text-gray-700">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {selectedQuotation.delivery_timeline}
                </span>
              )}
            </div>

            {/* Thread messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {isThreadLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading email thread…</span>
                </div>
              ) : threadMessages.length > 0 ? (
                threadMessages.map((msg) => {
                  const fromAddr = (msg.from ?? [])[0] ?? {};
                  const isVendor = fromAddr.email === selectedQuotation.sender_email;
                  const initials = (fromAddr.name || fromAddr.email || '??').substring(0, 2).toUpperCase();

                  return (
                    <div key={msg.id} className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${isVendor ? 'bg-gray-200 text-gray-700' : 'bg-[#3B82F6] text-white'}`}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Message header */}
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900">{fromAddr.name || fromAddr.email}</span>
                          <span className="text-xs text-gray-400 ml-4 flex-shrink-0">{formatUnixDate(msg.date)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          to {(msg.to ?? []).map((t: any) => t.email).join(', ')}
                        </p>

                        {/* Body */}
                        <div
                          className="text-sm text-gray-800 leading-relaxed border border-gray-100 rounded-lg p-4 bg-gray-50 overflow-auto max-h-[320px]"
                          dangerouslySetInnerHTML={{ __html: msg.body || '<em>No content</em>' }}
                        />

                        {/* Attachments */}
                        {msg.attachments?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.attachments.map((att: any) => (
                              <button
                                key={att.id}
                                onClick={() => handleDownloadAttachment(att, msg.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                              >
                                <FileIcon contentType={att.content_type} filename={att.filename} className="w-4 h-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{att.filename}</p>
                                  <p className="text-xs text-gray-400">{formatBytes(att.size)}</p>
                                </div>
                                <Download className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Fallback when no thread_id stored yet (pre-fix quotes) */
                <div className="space-y-4">
                  {selectedQuotation.notes && (
                    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed">
                      {selectedQuotation.notes}
                    </div>
                  )}
                  {!selectedQuotation.thread_id && (
                    <p className="text-xs text-gray-400 text-center py-4">
                      Full email thread not available for this quotation.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Reply area */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex-shrink-0">
              <textarea
                placeholder={`Reply to ${selectedQuotation.vendor_name || selectedQuotation.sender_email}…`}
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setEmailThreadOpen(false)} className="text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success(`Reply sent to ${selectedQuotation.vendor_name || selectedQuotation.sender_email}`);
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
        </div>,
        document.body
      )}
    </>
  );
}
