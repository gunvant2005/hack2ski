'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  Sparkles,
  Layers,
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  X
} from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument, getStoredUser } from '../../lib/api';
import { User, DocumentItem } from '../../lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Enhanced search, filter & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Attention'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'risk'>('newest');

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.push('/login');
      return;
    }
    setUser(u);
    fetchDocuments();
  }, [router]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc' && ext !== 'txt') {
      setErrorMsg('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File size exceeds maximum 20 MB limit.');
      return;
    }

    setErrorMsg('');
    setUploading(true);
    setUploadProgress(['✓ Upload starting']);

    try {
      setTimeout(() => setUploadProgress((prev) => [...prev, '✓ Extracting text & page structures']), 400);
      setTimeout(() => setUploadProgress((prev) => [...prev, '✓ Chunking & building vector embeddings']), 800);
      setTimeout(() => setUploadProgress((prev) => [...prev, '● Running GenAI clause & risk analysis']), 1200);

      const newDoc = await uploadDocument(file);

      setUploadProgress((prev) => [...prev, '✓ Analysis complete!']);
      setTimeout(() => {
        setUploading(false);
        router.push(`/documents/${newDoc.id}`);
      }, 500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to upload and analyze document. Please try again.');
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(id);
        fetchDocuments();
      } catch (err) {
        alert('Failed to delete document');
      }
    }
  };

  const totalDocs = documents.length;
  const analyzedDocs = documents.filter((d) => d.status === 'Analyzed').length;
  const highRiskDocs = documents.filter((d) => d.risk_level === 'High').length;
  const mediumRiskDocs = documents.filter((d) => d.risk_level === 'Medium').length;
  const lowRiskDocs = documents.filter((d) => d.risk_level === 'Low').length;
  const attentionDocs = highRiskDocs + mediumRiskDocs;

  const filteredDocuments = documents
    .filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || d.filename.toLowerCase().includes(q) || d.document_type.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (riskFilter === 'All') return true;
      if (riskFilter === 'Attention') return d.risk_level === 'High' || d.risk_level === 'Medium';
      return d.risk_level === riskFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'risk') {
        const weight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        return (weight[b.risk_level] || 0) - (weight[a.risk_level] || 0);
      }
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal transition-minimal">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-600 text-sm">
            Understand, compare, and analyze your legal agreements with plain-language GenAI intelligence.
          </p>
        </div>

        <Link
          href="/compare"
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all shrink-0 active:scale-[0.97]"
        >
          <Layers className="w-3.5 h-3.5 text-white" />
          <span>Compare Documents</span>
        </Link>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="bg-white border-2 border-dashed border-slate-200/90 rounded-2xl p-8 hover:border-slate-400 transition-minimal text-center relative overflow-hidden shadow-subtle">
        {uploading ? (
          <div className="py-8 space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Analyzing Your Legal Document...</h3>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left space-y-2 text-xs font-mono text-slate-700">
              {uploadProgress.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-900 font-bold">{step.charAt(0)}</span>
                  <span>{step.substring(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`space-y-4 ${dragActive ? 'bg-slate-50/70' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center mx-auto shadow-subtle">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Your Legal Document</h3>
              <p className="text-xs text-slate-500 mt-1">
                Drag & drop your PDF or DOCX file here, or click to browse
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer shadow-sm transition-all inline-flex items-center gap-2 active:scale-[0.98]">
                <FileText className="w-4 h-4 text-white" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const sampleText = `CONSULTING SERVICES AGREEMENT
This Consulting Agreement is entered into by and between Apex Global Solutions LLC ("Client") and Quantum Legal Advisors Inc. ("Consultant").

SECTION 1. SCOPE OF SERVICES
Consultant shall provide specialized technical, business management, and regulatory compliance consulting services as mutually agreed upon in writing.

SECTION 2. COMPENSATION AND PAYMENT TERMS
Client shall pay Consultant a monthly retainer fee of $7,500 USD, payable within 15 days of invoice date. Late payments shall accrue interest at 1.5% per month.

SECTION 3. TERM AND AUTOMATIC RENEWAL
The initial term shall be one (1) year. This Agreement shall automatically renew for additional one-year periods unless either party delivers written notice of non-renewal at least 60 days prior to the expiration of the current term.

SECTION 4. TERMINATION
Either party may terminate this Agreement without cause upon ninety (90) days prior written notice. Either party may terminate immediately for material breach if not cured within thirty (30) days of notice.

SECTION 5. CONFIDENTIALITY AND NON-DISCLOSURE
Consultant and Client agree to protect all proprietary, financial, and confidential information from unauthorized disclosure for a period of five (5) years following termination.

SECTION 6. INDEMNIFICATION AND LIABILITY
Consultant agrees to indemnify, defend, and hold harmless Client against any third-party claims arising from Consultant's gross negligence. Total aggregate liability under this Agreement shall not exceed the total fees paid by Client in the preceding six (6) months.

SECTION 7. POST-TERMINATION NON-COMPETE
For a period of twelve (12) months following termination of this Agreement, Consultant shall not directly or indirectly provide identical consulting services to any direct competitor of Client within a 50-mile radius.

SECTION 8. GOVERNING LAW AND ARBITRATION
This Agreement shall be governed by the laws of the State of Delaware. Any dispute arising out of this Agreement shall be resolved through binding arbitration before the American Arbitration Association.`;

                  const sampleFile = new File([sampleText], "Consulting_Services_Agreement.txt", { type: "text/plain" });
                  handleFileUpload(sampleFile);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all inline-flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                <span>Try Sample Agreement</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              Supported Formats: PDF, DOCX, or TXT &bull; Maximum File Size: 20 MB
            </p>

            {errorMsg && (
              <div className="max-w-md mx-auto bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Overview Stats Cards - Clickable to Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => setRiskFilter('All')}
          className={`minimal-card rounded-2xl p-5 shadow-subtle flex items-center gap-4 text-left transition-all hover:border-slate-400 ${
            riskFilter === 'All' ? 'ring-2 ring-slate-900 bg-slate-50/60' : 'bg-white'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</p>
            <h4 className="text-2xl font-extrabold text-slate-900">{totalDocs}</h4>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('All')}
          className="minimal-card rounded-2xl p-5 shadow-subtle flex items-center gap-4 text-left transition-all hover:border-slate-400 bg-white"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analyzed</p>
            <h4 className="text-2xl font-extrabold text-slate-900">{analyzedDocs}</h4>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter(riskFilter === 'Attention' ? 'All' : 'Attention')}
          className={`minimal-card rounded-2xl p-5 shadow-subtle flex items-center gap-4 text-left transition-all hover:border-amber-400 ${
            riskFilter === 'Attention' ? 'ring-2 ring-amber-500 bg-amber-50/50' : 'bg-white'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attention Needed</p>
            <h4 className="text-2xl font-extrabold text-slate-900">{attentionDocs}</h4>
          </div>
        </button>
      </div>

      {/* Recent Documents Section with Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-minimal overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Legal Documents</h3>
            <p className="text-xs text-slate-500">Access plain-language summaries, attention areas, and document Q&A</p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700">
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'risk')}
                className="bg-transparent text-xs text-slate-800 focus:outline-none font-semibold cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="risk">Highest Risk</option>
              </select>
            </div>

            <button
              onClick={fetchDocuments}
              className="text-xs font-bold text-slate-700 hover:text-slate-950 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Risk Filter Pills Bar */}
        {documents.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setRiskFilter('All')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
                riskFilter === 'All' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              All ({totalDocs})
            </button>
            <button
              onClick={() => setRiskFilter('High')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                riskFilter === 'High' ? 'bg-rose-700 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              High Risk ({highRiskDocs})
            </button>
            <button
              onClick={() => setRiskFilter('Medium')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                riskFilter === 'Medium' ? 'bg-amber-700 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Medium Risk ({mediumRiskDocs})
            </button>
            <button
              onClick={() => setRiskFilter('Low')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 ${
                riskFilter === 'Low' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Low Risk ({lowRiskDocs})
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-700" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-9 h-9 text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-800 text-sm">No documents uploaded yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your PDF or DOCX agreement above to begin analysis.
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-800 text-sm">No matching documents found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No documents match your search "{searchQuery}" and current filters.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setRiskFilter('All'); }}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Document Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Date Uploaded</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Attention Level</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{doc.filename}</span>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-500">{doc.document_type}</td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {doc.risk_level === 'High' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          High
                        </span>
                      ) : doc.risk_level === 'Medium' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Medium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                          Low
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/documents/${doc.id}`);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.97]"
                      >
                        Open Analysis
                      </button>
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

