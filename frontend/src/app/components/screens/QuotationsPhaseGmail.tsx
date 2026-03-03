import { Send, X, IndianRupee, Clock, FileText, FileSpreadsheet, Download, Loader2, Mail, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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
  const [replyText, setReplyText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [quotationAttachments, setQuotationAttachments] = useState<Record<string, { id: string; filename: string; content_type: string; size: number; messageId: string }[]>>({});

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

  // Fetch attachments for all quotes with a thread_id after list loads
  useEffect(() => {
    if (quotations.length === 0) return;
    const token = localStorage.getItem('auth_token');
    const fetchAll = async () => {
      const results: Record<string, any[]> = {};
      await Promise.all(
        quotations
          .filter(q => q.thread_id)
          .map(async (quote) => {
            try {
              const res = await fetch(`${API_BASE}/api/email/threads/${quote.thread_id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (res.ok) {
                const data = await res.json();
                const atts = (data.messages ?? []).flatMap((msg: any) =>
                  (msg.attachments ?? []).map((a: any) => ({ ...a, messageId: msg.id }))
                );
                if (atts.length > 0) results[quote.id] = atts;
              }
            } catch { /* ignore per-quote failures */ }
          })
      );
      setQuotationAttachments(results);
    };
    fetchAll();
  }, [quotations]);

  const filteredQuotations = quotations.filter(q =>
    searchQuery === '' ||
    (q.vendor_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.sender_email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedQuotations = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredQuotations.forEach((q: any) => {
      const key = q.sender_email || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });

    // Sort quotes within each group by date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Convert to sorted array of groups (based on newest quote in each group)
    return Object.entries(groups)
      .map(([email, quotes]) => ({
        email,
        vendor_name: quotes[0].vendor_name,
        quotes
      }))
      .sort((a, b) => new Date(b.quotes[0].created_at).getTime() - new Date(a.quotes[0].created_at).getTime());
  }, [filteredQuotations]);

  const handleGroupClick = async (group: any) => {
    setSelectedGroup(group);
    const mainQuote = group.quotes[0];
    setSelectedQuotation(mainQuote);
    setEmailThreadOpen(true);
    setThreadMessages([]);
    setReplyText('');

    // Collect all unique thread IDs for this group
    const threadIds = Array.from(new Set(group.quotes.map((q: any) => q.thread_id).filter(Boolean))) as string[];
    if (threadIds.length === 0) return;

    setIsThreadLoading(true);
    const token = localStorage.getItem('auth_token');

    try {
      // Fetch all threads in parallel
      const threadPromises = threadIds.map(tid =>
        fetch(`${API_BASE}/api/email/threads/${tid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(res => res.ok ? res.json() : { messages: [] })
      );

      const threadResults = await Promise.all(threadPromises);

      // Merge and sort all messages from all threads
      const allMessages = threadResults.flatMap(tr => tr.messages || []);
      const uniqueMessages = Array.from(new Map(allMessages.map(m => [m.id, m])).values());
      const sortedMessages = uniqueMessages.sort((a, b) => (b.date || 0) - (a.date || 0)); // Newest to oldest as requested

      setThreadMessages(sortedMessages);
    } catch (err) {
      console.error("Thread fetch error:", err);
    } finally {
      setIsThreadLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedQuotation?.thread_id || threadMessages.length === 0) return;

    // Find the latest message from the vendor we are replying to, so we can
    // extract its true subject to ensure proper threading.
    const lastVendorMsg = [...threadMessages].reverse().find((msg) => {
      const fromAddr = (msg.from ?? [])[0] ?? {};
      return fromAddr.email === selectedQuotation.sender_email;
    });

    const targetMsg = lastVendorMsg || threadMessages[0];
    const subject = targetMsg.subject || '';

    setIsSending(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/api/email/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          thread_id: selectedQuotation.thread_id,
          project_id: projectId,
          subject: subject,
          to_email: selectedQuotation.sender_email,
          to_name: selectedQuotation.vendor_name || '',
          body: replyText,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to send reply');
      }

      toast.success(`Reply sent to ${selectedQuotation.vendor_name || selectedQuotation.sender_email}`);
      setReplyText('');

      // Refresh thread to show the new message
      // Refresh thread
      handleGroupClick(selectedGroup);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setIsSending(false);
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
          ) : groupedQuotations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {groupedQuotations.map((group: any) => {
                const latestQuote = group.quotes[0];
                return (
                  <div
                    key={group.email}
                    onClick={() => handleGroupClick(group)}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          <span className="text-sm font-medium text-gray-700">
                            {(latestQuote.vendor_name || 'UN').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {latestQuote.vendor_name || latestQuote.sender_email}
                          </span>
                          <span className="text-xs text-gray-400 truncate">{latestQuote.sender_email}</span>
                        </div>

                        {latestQuote.email_subject && (
                          <p className="text-xs font-medium text-gray-700 mb-1 truncate">{latestQuote.email_subject}</p>
                        )}

                        {latestQuote.notes && (
                          <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">{latestQuote.notes}</p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          {latestQuote.price != null && (
                            <span className="flex items-center gap-1 font-medium text-gray-900">
                              <IndianRupee className="w-3.5 h-3.5" />
                              {Number(latestQuote.price).toLocaleString('en-IN')}
                            </span>
                          )}
                          {latestQuote.delivery_timeline && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {latestQuote.delivery_timeline}
                            </span>
                          )}
                          {group.quotes.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold text-[10px]">
                              {group.quotes.length} QUOTES
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex-shrink-0 text-right text-xs text-gray-400">
                        {formatDate(latestQuote.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
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
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-gray-50/30">
              {isThreadLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading email thread…</span>
                </div>
              ) : threadMessages.length > 0 ? (
                threadMessages.map((msg: any, idx: number) => {
                  const fromAddr = (msg.from ?? [])[0] ?? {};
                  const isVendor = fromAddr.email === selectedGroup?.email;
                  const initials = (fromAddr.name || fromAddr.email || '??').substring(0, 2).toUpperCase();

                  // Try to find a matching quote for this specific message to show extraction metadata
                  const matchingQuote = selectedGroup?.quotes.find((q: any) => q.message_id === msg.id || (idx === 0 && q.thread_id === msg.thread_id));

                  return (
                    <div key={msg.id} className="relative mb-6 last:mb-0">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-sm relative z-10 ${isVendor ? 'bg-white border border-gray-200 text-gray-700' : 'bg-blue-600 text-white'}`}>
                          {initials}
                        </div>

                        <div className={`flex-1 min-w-0 border rounded-xl p-5 shadow-sm ${isVendor ? 'bg-white border-gray-200' : 'bg-blue-50/50 border-blue-100'}`}>
                          {/* Header */}
                          <div className="flex items-baseline justify-between mb-4">
                            <div>
                              <span className="text-sm font-bold text-gray-900">{fromAddr.name || fromAddr.email}</span>
                              <span className="text-xs text-gray-400 ml-2">{fromAddr.email}</span>
                            </div>
                            <span className="text-xs text-gray-400">{formatUnixDate(msg.date)}</span>
                          </div>

                          <p className="text-[10px] text-gray-400 mb-3">
                            to {(msg.to ?? []).map((t: any) => t.email).join(', ')}
                          </p>

                          {/* Subject */}
                          {msg.subject && (
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">{msg.subject}</h4>
                          )}

                          {/* Matching Quote Metadata (Price/Timeline) */}
                          {matchingQuote && (matchingQuote.price != null || matchingQuote.delivery_timeline) && (
                            <div className="flex items-center gap-4 mb-4 py-2 border-y border-gray-100/50">
                              {matchingQuote.price != null && (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Extracted Price</span>
                                  <span className="text-sm font-bold text-blue-600">₹ {Number(matchingQuote.price).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {matchingQuote.delivery_timeline && (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Timeline</span>
                                  <span className="text-sm font-medium text-gray-900">{matchingQuote.delivery_timeline}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Body */}
                          <div
                            className="text-sm text-gray-700 leading-relaxed overflow-auto max-h-[400px] email-body-content"
                            dangerouslySetInnerHTML={{ __html: msg.body || '<em>No content</em>' }}
                          />

                          {/* Attachments */}
                          {msg.attachments?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                              {msg.attachments.map((att: any) => (
                                <button
                                  key={att.id}
                                  onClick={() => handleDownloadAttachment(att, msg.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                >
                                  <FileIcon contentType={att.content_type} filename={att.filename} className="w-4 h-4 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">{att.filename}</p>
                                    <p className="text-[10px] text-gray-400">{formatBytes(att.size)}</p>
                                  </div>
                                  <Download className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Mail className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No quotations found for this sender.</p>
                </div>
              )}
            </div>

            {/* Reply area */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex-shrink-0">
              <textarea
                placeholder={`Reply to ${selectedQuotation.vendor_name || selectedQuotation.sender_email}…`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={isSending || !selectedQuotation.thread_id}
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyText('');
                    setEmailThreadOpen(false);
                  }}
                  disabled={isSending}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={isSending || !replyText.trim() || !selectedQuotation.thread_id}
                  className="bg-[#3B82F6] text-white hover:bg-[#2563EB] text-sm"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isSending ? 'Sending…' : 'Send'}
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
