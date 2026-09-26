'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, FileText, UploadCloud, AlertTriangle, ArrowRight, CheckCircle2, Plus, Minus, Edit3, Loader2, Sparkles, Copy, Download, Check } from 'lucide-react';
import { getDocuments, compareDocuments, getStoredUser } from '../../lib/api';
import { DocumentItem, ComparisonResult } from '../../lib/types';

export default function ComparePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docAId, setDocAId] = useState<string>('');
  const [docBId, setDocBId] = useState<string>('');
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [changeFilter, setChangeFilter] = useState<'All' | 'Added' | 'Modified' | 'Removed' | 'Inconsistent'>('All');
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.push('/login');
      return;
    }
    fetchUserDocs();
  }, [router]);

  const fetchUserDocs = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (docs.length >= 2) {
        setDocAId(docs[0].id);
        setDocBId(docs[1].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunComparison = async () => {
    if (!docAId && !fileA) {
      setError('Please select or upload Document A.');
      return;
    }
    if (!docBId && !fileB) {
      setError('Please select or upload Document B.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await compareDocuments(fileA || undefined, fileB || undefined, docAId || undefined, docBId || undefined);
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error comparing documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleComparison = async () => {
    setError('');
    setLoading(true);
    try {
      const sampleTextA = `MASTER CONSULTING AGREEMENT (VERSION 1.0)
Clause 1. Scope: Contractor provides web architecture and engineering services.
Clause 2. Payment & Compensation: Client pays $12,000 monthly within 15 days of invoice date.
Clause 3. Termination & Notice: Either party may terminate with 30 days prior written notice.
Clause 4. Liability & Indemnification: Contractor liability is capped at the total fees paid under this agreement.
Clause 5. Confidentiality & NDA: Both parties agree to protect proprietary information for 2 years.
Clause 6. Dispute Resolution: State of California.`;

      const sampleTextB = `MASTER CONSULTING AGREEMENT (REVISED VERSION 2.0)
Clause 1. Scope: Contractor provides web architecture and full-stack development services.
Clause 2. Payment & Compensation: Client pays $12,000 monthly within 45 days of invoice approval.
Clause 3. Termination & Notice: Client may terminate with 15 days notice; Contractor must provide 90 days notice.
Clause 4. Liability & Indemnification: Contractor accepts unlimited indemnification liability for any third-party claim.
Clause 5. Non-Compete: Contractor agrees not to provide software services to competitors for 24 months post-termination.
Clause 6. Confidentiality & NDA: Both parties agree to protect proprietary information indefinitely.
Clause 7. Dispute Resolution: State of New York.`;

      const fA = new File([sampleTextA], 'Consulting_Agreement_v1_Original.txt', { type: 'text/plain' });
      const fB = new File([sampleTextB], 'Consulting_Agreement_v2_Revised.txt', { type: 'text/plain' });

      setFileA(fA);
      setFileB(fB);
      setDocAId('');
      setDocBId('');

      const res = await compareDocuments(fA, fB);
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error running sample comparison.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    const r = result as any;
    const lines = [
      `================================================================================`,
      `LEGALLENS AI — REVISION COMPARISON REPORT`,
      `================================================================================`,
      `Document A (Original): ${r.doc_a_name || r.doc_a_filename || 'Version A'}`,
      `Document B (Revised):  ${r.doc_b_name || r.doc_b_filename || 'Version B'}`,
      `Total Changes Identified: ${r.total_changes}`,
      `Breakdown: Added (${r.added_count || 0}) | Modified (${r.modified_count || 0}) | Removed (${r.removed_count || 0})`,
      `Date: ${new Date().toLocaleDateString()}`,
      `================================================================================\n`,
      `CLAUSE-BY-CLAUSE REVISION ANALYSIS:\n`,
      ...(r.changes || []).map((c: any, i: number) => (
        `[${c.status.toUpperCase()}] ${c.clause_title} (${c.importance} Importance)\n` +
        `• AI Explanation: ${c.explanation}\n` +
        `• Version A: ${c.doc_a_text ? c.doc_a_text.replace(/\n+/g, ' ') : 'Not present in Version A'}\n` +
        `• Version B: ${c.doc_b_text ? c.doc_b_text.replace(/\n+/g, ' ') : 'Not present in Version B'}\n`
      )),
      `\nDISCLAIMER: LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice.`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!result) return;
    const r = result as any;
    const lines = [
      `# LegalLens AI — Revision Comparison Report\n`,
      `- **Document A (Original):** ${r.doc_a_name || r.doc_a_filename || 'Version A'}`,
      `- **Document B (Revised):** ${r.doc_b_name || r.doc_b_filename || 'Version B'}`,
      `- **Total Changes:** ${r.total_changes}`,
      `- **Date:** ${new Date().toLocaleDateString()}\n`,
      `## Summary Breakdown`,
      `- Added Clauses: **${r.added_count || 0}**`,
      `- Modified Clauses: **${r.modified_count || 0}**`,
      `- Removed Clauses: **${r.removed_count || 0}**\n`,
      `## Detailed Clause Comparison\n`,
      ...(r.changes || []).map((c: any, i: number) => (
        `### ${i + 1}. [${c.status}] ${c.clause_title} (${c.importance} Importance)\n\n` +
        `**AI Impact Explanation:** ${c.explanation}\n\n` +
        `| Version A (Original) | Version B (Revised) |\n` +
        `| :--- | :--- |\n` +
        `| ${c.doc_a_text ? c.doc_a_text.replace(/\n+/g, ' ') : '*Not present*'} | ${c.doc_b_text ? c.doc_b_text.replace(/\n+/g, ' ') : '*Not present*'} |\n`
      )),
      `\n> **Disclaimer:** LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice.`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LegalLens_Comparison_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const displayedChanges = result
    ? ((result as any).changes || []).filter((c: any) => {
        if (changeFilter === 'All') return true;
        return c.status === changeFilter;
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal transition-minimal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4 text-slate-900" />
            <span>Side-by-Side Revision Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Compare Legal Documents</h1>
          <p className="text-slate-600 text-sm">
            Select or upload two versions of an agreement to highlight added, removed, and modified clauses with plain-English AI explanations.
          </p>
        </div>

        <button
          onClick={handleLoadSampleComparison}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all shrink-0 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Comparing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Try Sample Comparison (1-Click)</span>
            </>
          )}
        </button>
      </div>

      {/* Selectors Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document A Selector */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">A</span>
              Document Version A (Original)
            </h3>

            {documents.length > 0 && (
              <>
                <label htmlFor="compare-select-a" className="sr-only">Select existing Document A</label>
                <select
                  id="compare-select-a"
                  value={docAId}
                  onChange={(e) => {
                    setDocAId(e.target.value);
                    setFileA(null);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-400"
                >
                  <option value="">-- Choose Existing Document A --</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-white hover:border-slate-400 transition-minimal">
              <label htmlFor="compare-upload-a" className="sr-only">Upload Document A file</label>
              <input
                id="compare-upload-a"
                type="file"
                accept=".pdf,.docx,.doc,.txt,.rtf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileA(e.target.files[0]);
                    setDocAId('');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-700 block">
                {fileA ? fileA.name : 'Or Upload File A (PDF, DOCX, DOC, TXT, RTF)'}
              </span>
            </div>
          </div>

          {/* Document B Selector */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">B</span>
              Document Version B (Revised)
            </h3>

            {documents.length > 0 && (
              <>
                <label htmlFor="compare-select-b" className="sr-only">Select existing Document B</label>
                <select
                  id="compare-select-b"
                  value={docBId}
                  onChange={(e) => {
                    setDocBId(e.target.value);
                    setFileB(null);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-400"
                >
                  <option value="">-- Choose Existing Document B --</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-white hover:border-slate-400 transition-minimal">
              <label htmlFor="compare-upload-b" className="sr-only">Upload Document B file</label>
              <input
                id="compare-upload-b"
                type="file"
                accept=".pdf,.docx,.doc,.txt,.rtf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileB(e.target.files[0]);
                    setDocBId('');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-700 block">
                {fileB ? fileB.name : 'Or Upload File B (PDF, DOCX, DOC, TXT, RTF)'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Document Differences...</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 text-white" />
              <span>Compare Documents Side-by-Side</span>
            </>
          )}
        </button>

        {error && (
          <div role="alert" aria-live="assertive" className="bg-rose-50 border border-rose-200/80 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 mt-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Workspace */}
      {result && (
        <div className="space-y-6">
          {/* Header & Export Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Comparison Results</span>
              <h3 className="text-base font-extrabold text-slate-900">
                {(result as any).doc_a_name || (result as any).doc_a_filename || 'Version A'} <span className="text-slate-400 font-normal">vs</span> {(result as any).doc_b_name || (result as any).doc_b_filename || 'Version B'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Copy comparison summary to clipboard"
                aria-label={copiedReport ? "Comparison summary copied to clipboard" : "Copy comparison summary to clipboard"}
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{copiedReport ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handleDownloadReport}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Download report as Markdown file"
                aria-label="Download comparison report as Markdown"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download Report</span>
              </button>
            </div>
          </div>

          {/* Change Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              type="button"
              onClick={() => setChangeFilter('All')}
              aria-pressed={changeFilter === 'All'}
              className={`minimal-card rounded-xl p-4 shadow-subtle text-center transition-all ${
                changeFilter === 'All' ? 'ring-2 ring-slate-900 bg-slate-50/80' : 'bg-white'
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Changes</span>
              <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{result.total_changes}</h4>
            </button>

            <button
              type="button"
              onClick={() => setChangeFilter('Added')}
              aria-pressed={changeFilter === 'Added'}
              className={`minimal-card rounded-xl p-4 shadow-subtle text-center transition-all ${
                changeFilter === 'Added' ? 'ring-2 ring-emerald-600 bg-emerald-50/50' : 'bg-white'
              }`}
            >
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Added Clauses</span>
              <h4 className="text-2xl font-extrabold text-emerald-700 mt-1">{(result as any).added_count || 0}</h4>
            </button>

            <button
              type="button"
              onClick={() => setChangeFilter('Modified')}
              aria-pressed={changeFilter === 'Modified'}
              className={`minimal-card rounded-xl p-4 shadow-subtle text-center transition-all ${
                changeFilter === 'Modified' ? 'ring-2 ring-amber-600 bg-amber-50/50' : 'bg-white'
              }`}
            >
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Modified Clauses</span>
              <h4 className="text-2xl font-extrabold text-amber-700 mt-1">{(result as any).modified_count || 0}</h4>
            </button>

            <button
              type="button"
              onClick={() => setChangeFilter('Removed')}
              aria-pressed={changeFilter === 'Removed'}
              className={`minimal-card rounded-xl p-4 shadow-subtle text-center transition-all ${
                changeFilter === 'Removed' ? 'ring-2 ring-rose-600 bg-rose-50/50' : 'bg-white'
              }`}
            >
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Removed Clauses</span>
              <h4 className="text-2xl font-extrabold text-rose-700 mt-1">{(result as any).removed_count || 0}</h4>
            </button>

            <button
              type="button"
              onClick={() => setChangeFilter('Inconsistent')}
              aria-pressed={changeFilter === 'Inconsistent'}
              className={`minimal-card rounded-xl p-4 shadow-subtle text-center transition-all ${
                changeFilter === 'Inconsistent' ? 'ring-2 ring-violet-600 bg-violet-50/50' : 'bg-white'
              }`}
            >
              <span className="text-xs font-bold text-violet-800 uppercase tracking-wider">Inconsistencies</span>
              <h4 className="text-2xl font-extrabold text-violet-700 mt-1">{(result as any).inconsistent_count || 0}</h4>
            </button>
          </div>

          {/* Filter Pills Bar */}
          <div role="group" aria-label="Comparison change status filter" className="flex items-center gap-2 overflow-x-auto text-xs py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter View:</span>
            {(['All', 'Added', 'Modified', 'Removed', 'Inconsistent'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setChangeFilter(filter)}
                aria-pressed={changeFilter === filter}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  changeFilter === filter
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter === 'Inconsistent' ? 'Inconsistencies' : `${filter} Clauses`}
              </button>
            ))}
          </div>

          {/* Clause Diff Cards */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
              Detailed Clause Revision Breakdown ({displayedChanges.length} shown)
            </h3>

            {displayedChanges.length === 0 ? (
              <div className="minimal-card rounded-2xl p-8 text-center text-slate-500 text-xs">
                No clauses match the "{changeFilter}" filter.
              </div>
            ) : (
              displayedChanges.map((change: any, idx: number) => (
                <div key={idx} className="minimal-card rounded-2xl p-6 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {change.status === 'Added' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold flex items-center gap-1">
                          <Plus className="w-3 h-3 text-emerald-600" aria-hidden="true" /> Added
                        </span>
                      ) : change.status === 'Removed' ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-bold flex items-center gap-1">
                          <Minus className="w-3 h-3 text-rose-600" aria-hidden="true" /> Removed
                        </span>
                      ) : change.status === 'Inconsistent' ? (
                        <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-800 border border-violet-200/80 text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-violet-600" aria-hidden="true" /> Inconsistency Detected
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold flex items-center gap-1">
                          <Edit3 className="w-3 h-3 text-amber-600" aria-hidden="true" /> Modified
                        </span>
                      )}

                      <h4 className="font-bold text-slate-900 text-base">{change.clause_title}</h4>
                    </div>

                    <span className="text-xs font-bold text-slate-500">{change.importance} Importance</span>
                  </div>

                  {/* Side-by-side text diff box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-1">
                      <span className="font-sans font-bold text-rose-900 text-[11px] block">VERSION A (ORIGINAL)</span>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{change.doc_a_text || 'Clause not present.'}</p>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                      <span className="font-sans font-bold text-emerald-900 text-[11px] block">VERSION B (REVISED)</span>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{change.doc_b_text || 'Clause not present.'}</p>
                    </div>
                  </div>

                  {/* Plain English AI Explanation */}
                  <div className="bg-slate-100/80 border border-slate-200/80 p-3.5 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-900 font-sans block">AI Explanation of Impact:</span>
                    <p className="text-slate-800 font-medium font-sans leading-relaxed">{change.explanation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

