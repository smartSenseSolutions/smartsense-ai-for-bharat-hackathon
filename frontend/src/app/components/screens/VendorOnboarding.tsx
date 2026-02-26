import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { Screen } from '@/app/App';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadError {
  row: number;
  error: string;
}

interface UploadResult {
  total: number;
  created: number;
  failed: number;
  errors: UploadError[];
}



// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VendorOnboardingProps {
  onNavigate: (screen: Screen) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VendorOnboarding({ onNavigate: _onNavigate }: VendorOnboardingProps) {
  // -- Upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // ---------------------------------------------------------------------------
  // Template download
  // ---------------------------------------------------------------------------

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vendors/bulk-upload/template`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vendor_upload_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Surface error inline — no toast dependency needed
      alert('Failed to download template. Please ensure the server is running.');
    }
  };

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    // Reset so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const acceptFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadError('Only .csv files are accepted.');
      setSelectedFile(null);
      return;
    }
    setUploadError(null);
    setUploadResult(null);
    setSelectedFile(file);
    setErrorsExpanded(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setErrorsExpanded(false);
  };

  // ---------------------------------------------------------------------------
  // CSV upload
  // ---------------------------------------------------------------------------

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setErrorsExpanded(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_BASE}/api/vendors/bulk-upload`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Upload failed with HTTP ${res.status}`);
      }

      const result: UploadResult = await res.json();
      setUploadResult(result);


    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };



  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-[#eeeff1]">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Vendor Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add vendors individually or upload multiple vendors at once using a CSV file.
          </p>
        </div>
      </div>

      <div className="px-8 py-6 overflow-y-auto h-[calc(100vh-73px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="max-w-5xl space-y-6 pb-6">

          {/* ---------------------------------------------------------------- */}
          {/* Section 1: Bulk Upload via CSV                                   */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white border border-[#eeeff1] rounded-lg overflow-hidden">
            {/* Section header */}
            <div className="px-6 py-4 border-b border-[#eeeff1] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Bulk Upload via CSV</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload a CSV file to onboard multiple vendors at once.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#3B82F6] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* CSV column hint */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <span className="font-semibold">Expected columns: </span>
                  vendor_name, location, estd, mobile, email, certificates (semicolon-separated),
                  products (semicolon-separated), website
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg px-6 py-10 transition-all',
                  dragActive
                    ? 'border-[#3B82F6] bg-blue-50'
                    : selectedFile
                      ? 'border-green-300 bg-green-50'
                      : 'border-[#d1d5db] bg-[#f9fafb] hover:bg-gray-100 cursor-pointer',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors mt-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className={cn('w-5 h-5', dragActive ? 'text-[#3B82F6]' : 'text-gray-400')} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {dragActive ? 'Drop your CSV here' : 'Drag & drop a CSV file here'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">or click to browse — .csv files only</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inline file validation error */}
              {uploadError && !uploadResult && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}

              {/* Upload button */}
              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#3B82F6] rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload CSV
                    </>
                  )}
                </button>
              </div>

              {/* Upload result summary */}
              {uploadResult && (
                <div className="space-y-3">
                  {/* Summary row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Total processed */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      Total rows: {uploadResult.total}
                    </span>
                    {/* Created */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {uploadResult.created} vendor{uploadResult.created !== 1 ? 's' : ''} created
                    </span>
                    {/* Failed */}
                    {uploadResult.failed > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {uploadResult.failed} failed
                      </span>
                    )}
                  </div>

                  {/* Success-only message */}
                  {uploadResult.failed === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-100 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-700 font-medium">
                        All vendors were imported successfully.
                      </p>
                    </div>
                  )}

                  {/* Partial / full failure message + collapsible errors */}
                  {uploadResult.failed > 0 && (
                    <div className="border border-red-100 rounded-lg overflow-hidden">
                      {/* Header — toggle */}
                      <button
                        type="button"
                        onClick={() => setErrorsExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-red-700">
                          {uploadResult.failed} row{uploadResult.failed !== 1 ? 's' : ''} failed — click to view
                        </span>
                        {errorsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </button>

                      {/* Error list */}
                      {errorsExpanded && (
                        <div className="divide-y divide-red-50 max-h-56 overflow-y-auto">
                          {uploadResult.errors.map((err, idx) => (
                            <div key={idx} className="flex items-start gap-3 px-4 py-2.5 bg-white">
                              <span className="text-xs font-mono text-gray-400 flex-shrink-0 mt-0.5 w-14">
                                Row {err.row}
                              </span>
                              <span className="text-xs text-gray-700">{err.error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
