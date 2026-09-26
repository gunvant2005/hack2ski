'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Sparkles,
  AlertTriangle,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  BookOpen,
  ArrowLeft,
  Copy,
  Download,
  Search,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  getDocument,
  getDocumentContent,
  analyzeDocument,
  getDocumentSummary,
  getDocumentClauses,
  getDocumentRisks,
  getDocumentChecklist,
  getLawyerQuestions,
  askDocumentQuestion
} from '../../../lib/api';

export default function DocumentAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [documentMeta, setDocumentMeta] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'risks' | 'chat' | 'checklist' | 'lawyer'>('summary');
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Tab Data States
  const [summaryData, setSummaryData] = useState<any>(null);
  const [clausesData, setClausesData] = useState<any[]>([]);
  const [risksData, setRisksData] = useState<any>(null);
  const [checklistData, setChecklistData] = useState<any[]>([]);
  const [lawyerQuestionsData, setLawyerQuestionsData] = useState<string[]>([]);

  // Real Document Content States
  const [chunks, setChunks] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);

  // Q&A Chat States
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string; sources?: any[] }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your LegalLens AI Assistant. Ask me any question about this document, such as termination notice periods, payment terms, or renewal conditions.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Document Viewer Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState(1);
  const [copied, setCopied] = useState(false);

  // Refs for scroll-into-view on highlighted chunk
  const highlightedRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (documentId) {
      loadDocumentAnalysis();
    }
  }, [documentId]);

  const loadDocumentAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const meta = await getDocument(documentId);
      setDocumentMeta(meta);

      try {
        const content = await getDocumentContent(documentId);
        setChunks(content.chunks || []);
        setTotalPages(content.total_pages || 1);
      } catch (cErr) {
        console.warn('Could not load content chunks:', cErr);
      }

      const analysis = await analyzeDocument(documentId);
      setSummaryData(analysis.summary);
      setClausesData(analysis.key_clauses || []);
      setRisksData({ risk_level: analysis.risk_level, risks: analysis.risks || [] });
      setChecklistData(analysis.checklist || []);
      setLawyerQuestionsData(analysis.lawyer_questions || []);
    } catch (err: any) {
      console.error('Analysis load error:', err);
      setError(err.response?.data?.detail || 'Failed to complete document analysis. Please click Retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (msgText?: string) => {
    const query = msgText || chatInput;
    if (!query.trim() || chatLoading) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: query }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await askDocumentQuestion(documentId, query);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          sources: res.sources
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an error while processing your question. Please try again.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleCopyQuestions = () => {
    const text = lawyerQuestionsData.map((q, idx) => `${idx + 1}. ${q}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jumpToSourcePage = useCallback((pageNum: number, chunkId?: string) => {
    setSelectedPage(pageNum);
    if (chunkId) {
      setHighlightedChunkId(chunkId);
      setTimeout(() => setHighlightedChunkId(null), 3500);
    }
    // Scroll highlighted element into view after state update
    setTimeout(() => {
      highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#FAFBFD] text-slate-900 flex flex-col items-center justify-center p-6 space-y-4"
        role="status"
        aria-live="polite"
        aria-label="Analyzing document with AI engine"
      >
        <Loader2 className="w-9 h-9 animate-spin text-slate-800" aria-hidden="true" />
        <h2 className="text-lg font-bold">Analyzing Document with GenAI Engine...</h2>
        <p className="text-xs text-slate-500">Extracting text, chunking clauses, and generating risk insights.</p>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="min-h-screen bg-[#FAFBFD] text-slate-900 flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Analysis Encountered an Issue</h2>
        <p className="text-xs text-slate-500 max-w-md">{error}</p>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={loadDocumentAnalysis}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            Retry Analysis
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const completedChecklistCount = checklistData.filter((item) => item.completed).length;
  const checklistPercent = checklistData.length > 0 ? Math.round((completedChecklistCount / checklistData.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col">
      {/* Top Sticky Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 py-3 px-6 sticky top-16 z-40 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              {documentMeta?.filename || 'Legal_Document.pdf'}
            </h1>
            <p className="text-[11px] text-slate-500">GenAI Document Intelligence Workspace</p>
          </div>
        </div>

        {/* Minimalist Tab Selector Bar */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'summary' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Summary
          </button>
          <button
            onClick={() => setActiveTab('clauses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'clauses' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Clauses ({clausesData.length})
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'risks' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Attention Radar ({risksData?.risks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'chat' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ask AI
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'checklist' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Checklist
          </button>
          <button
            onClick={() => setActiveTab('lawyer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'lawyer' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Lawyer Questions
          </button>
        </div>
      </header>

      {/* Main Split Screen Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Interactive Document Viewer (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-subtle flex flex-col overflow-hidden h-[calc(100vh-180px)] sticky top-36">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-800" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">Document Viewer</span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">Page {selectedPage} of {totalPages}</span>
          </div>

          <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search in uploaded document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-slate-400 hover:text-slate-700 px-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 p-5 overflow-y-auto font-serif text-slate-800 text-xs leading-relaxed space-y-4 bg-slate-50/40">
            <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-subtle space-y-3">
              <div className="text-center font-sans font-bold text-xs text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span className="truncate max-w-[200px]">{documentMeta?.filename || 'Document'}</span>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-normal">Page {selectedPage}</span>
              </div>

              {(() => {
                const pageChunks = chunks.filter((c: any) => c.page_number === selectedPage);
                const displayChunks = searchQuery.trim()
                  ? chunks.filter((c: any) => c.chunk_text.toLowerCase().includes(searchQuery.toLowerCase()))
                  : (pageChunks.length > 0 ? pageChunks : chunks);

                if (displayChunks.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs font-sans">
                      {searchQuery
                        ? `No clauses matching "${searchQuery}" found.`
                        : 'No content found for this page.'}
                    </div>
                  );
                }

                return displayChunks.map((chunk: any, cIdx: number) => {
                  const isHighlighted = highlightedChunkId === chunk.id;
                  return (
                    <div
                      key={chunk.id || cIdx}
                      ref={isHighlighted ? highlightedRef : undefined}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isHighlighted
                          ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400 shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                      aria-current={isHighlighted ? 'true' : undefined}
                    >
                      {chunk.clause_number && (
                        <div className="flex items-center justify-between mb-1.5 font-sans">
                          <span className="font-bold text-xs text-slate-900">
                            {chunk.clause_number}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Page {chunk.page_number}
                          </span>
                        </div>
                      )}
                      <p className="font-serif text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {chunk.chunk_text}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="p-3 bg-white text-slate-600 text-[11px] border-t border-slate-200/80 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                disabled={selectedPage <= 1}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 font-medium transition-all"
              >
                Previous Page
              </button>
              <button
                onClick={() => setSelectedPage((p) => Math.min(totalPages, p + 1))}
                disabled={selectedPage >= totalPages}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 font-medium transition-all"
              >
                Next Page
              </button>
            </div>
            <span className="text-slate-800 font-semibold">
              Page {selectedPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Right Column: Dynamic AI Analysis Workspace (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && summaryData && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-slate-800" />
                  <span>Plain-Language Summary</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed font-normal bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                  {summaryData.plain_language_summary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Contract Purpose</span>
                    <p className="text-xs font-semibold text-slate-900">{summaryData.purpose}</p>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Contracting Parties</span>
                    <p className="text-xs font-semibold text-slate-900">{summaryData.parties}</p>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Duration & Term</span>
                    <p className="text-xs font-semibold text-slate-900">{summaryData.duration}</p>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payment & Salary</span>
                    <p className="text-xs font-semibold text-slate-900">{summaryData.payment_terms}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal space-y-3">
                <h4 className="font-bold text-sm text-slate-900">Key Responsibilities & Obligations</h4>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  {summaryData.important_responsibilities?.map((resp: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                      <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: KEY CLAUSES */}
          {activeTab === 'clauses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 border border-slate-200/80 rounded-2xl shadow-minimal">
                <h3 className="font-bold text-sm text-slate-900">Extracted Key Clauses ({clausesData.length})</h3>
                <span className="text-xs text-slate-500">Categorized by functional topic</span>
              </div>

              <div className="space-y-4">
                {clausesData.map((clause: any, idx: number) => (
                  <div key={idx} className="minimal-card rounded-2xl p-5 shadow-subtle space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                            {clause.category}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{clause.clause_number}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-base mt-1">{clause.title}</h4>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        clause.importance === 'High' ? 'bg-rose-50 text-rose-800 border border-rose-200/80' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {clause.importance} Importance
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                      {clause.explanation}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Source: Page {clause.page_number}</span>
                      <button
                        onClick={() => jumpToSourcePage(clause.page_number)}
                        className="text-slate-900 hover:text-slate-950 font-bold flex items-center gap-1"
                      >
                        View in Document Viewer &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ATTENTION DASHBOARD / RISK */}
          {activeTab === 'risks' && (
            <div className="space-y-6">
              {/* Radar Overview Banner */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Areas That May Need Attention</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">AI Attention Radar Dashboard</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Overall Attention Level</span>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-extrabold">
                      {risksData?.risk_level || 'High'} ATTENTION
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="font-semibold text-slate-900">Informational Document Indicator:</span> The clauses highlighted below contain unusual, strict, or non-standard provisions that deserve further review. This tool does not claim that any clause is illegal.
                </p>
              </div>

              {/* Risk Cards */}
              <div className="space-y-4">
                {risksData?.risks?.map((risk: any, idx: number) => (
                  <div key={idx} className="minimal-card rounded-2xl p-6 shadow-subtle space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          risk.severity === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200/80' : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{risk.title}</h4>
                          <span className="text-xs font-semibold text-slate-500">
                            {risk.clause_number} &bull; Page {risk.page_number}
                          </span>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        risk.severity === 'High' ? 'bg-rose-50 text-rose-800 border border-rose-200/80' : 'bg-amber-50 text-amber-800 border border-amber-200/80'
                      }`}>
                        {risk.severity} Severity
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">Explanation:</span>
                        <p className="text-slate-600 leading-relaxed mt-0.5">{risk.explanation}</p>
                      </div>

                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                        <span className="font-bold text-slate-900">Why it deserves attention:</span>
                        <p className="text-slate-600 leading-relaxed mt-0.5">{risk.why_attention}</p>
                      </div>

                      <div className="bg-slate-100/70 border border-slate-200/80 p-3 rounded-xl space-y-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-800" />
                          Suggested Question For a Lawyer:
                        </span>
                        <p className="text-slate-800 font-semibold italic">{risk.suggested_lawyer_question}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => jumpToSourcePage(risk.page_number)}
                        className="text-xs text-slate-900 hover:text-slate-950 font-bold flex items-center gap-1"
                      >
                        Jump to Source Clause (Page {risk.page_number}) &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ASK AI CHAT */}
          {activeTab === 'chat' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-minimal flex flex-col h-[calc(100vh-240px)]">
              <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-800" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-900">Grounded Document Q&A Assistant</span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">Grounded in document context</span>
              </div>

              {/* Sample Prompt Chips */}
              <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-slate-400 font-semibold shrink-0">Try asking:</span>
                <button
                  onClick={() => handleSendMessage('What are my termination conditions and notice period?')}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                >
                  Termination conditions?
                </button>
                <button
                  onClick={() => handleSendMessage('Is there an automatic renewal clause in this contract?')}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                >
                  Automatic renewal?
                </button>
                <button
                  onClick={() => handleSendMessage('What are my confidentiality and non-compete obligations?')}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                >
                  Non-compete details?
                </button>
              </div>

              {/* Chat Messages */}
              <div
                className="flex-1 p-4 overflow-y-auto space-y-4"
                aria-live="polite"
                aria-label="Chat conversation"
                role="log"
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed space-y-2 shadow-subtle ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-none font-medium'
                          : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-bl-none font-normal'
                      }`}
                    >
                      <p>{msg.text}</p>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1">
                          <span className="font-bold text-[10px] uppercase text-slate-700 block">Verified Source Citations:</span>
                          {msg.sources.map((s: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              onClick={() => jumpToSourcePage(s.page_number)}
                              className="bg-white p-2 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-400 transition-colors text-[11px] text-slate-800 flex items-center justify-between"
                            >
                              <span>{s.clause_number || 'Section'} &bull; Page {s.page_number}</span>
                              <span className="text-slate-900 font-bold">Jump &rarr;</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div
                    className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80 w-fit"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-slate-800" aria-hidden="true" />
                    <span>Retrieving grounded document context...</span>
                  </div>
                )}
                <div ref={chatEndRef} aria-hidden="true" />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
                <label htmlFor="chat-input" className="sr-only">Ask a question about this legal document</label>
                <input
                  id="chat-input"
                  type="text"
                  placeholder="Ask a question about this legal document..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleSendMessage()}
                  className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  aria-label="Chat question input"
                  disabled={chatLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500"
                  aria-label="Send message"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ACTION CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Before Signing Checklist</h3>
                  <p className="text-xs text-slate-500">Verify obligations and action items prior to contract execution</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">{completedChecklistCount} / {checklistData.length} Completed</span>
                  <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden mt-1 border border-slate-200">
                    <div className="bg-slate-900 h-full transition-all duration-300" style={{ width: `${checklistPercent}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {checklistData.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                      item.completed ? 'bg-slate-50 border-slate-200/80 opacity-70' : 'bg-white border-slate-200 hover:border-slate-400 shadow-subtle'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-0.5 w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className={`text-xs font-semibold block ${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {item.task}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase mt-0.5 block">{item.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: LAWYER QUESTIONS */}
          {activeTab === 'lawyer' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Questions to Discuss With a Legal Professional</h3>
                  <p className="text-xs text-slate-500">Prepared questions based on detected document attention areas</p>
                </div>

                <button
                  onClick={handleCopyQuestions}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.97]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Questions'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {lawyerQuestionsData.map((q: string, idx: number) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-900 font-semibold leading-relaxed pt-0.5">{q}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800 shrink-0" />
                <span>Tip: Print or copy these questions to lead an efficient consultation with your attorney.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

