'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, FileText, UploadCloud, AlertTriangle, ArrowRight, CheckCircle2, Plus, Minus, Edit3, Loader2 } from 'lucide-react';
import { getDocuments, compareDocuments, getStoredUser } from '../../lib/api';

export default function ComparePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [docAId, setDocAId] = useState<string>('');
  const [docBId, setDocBId] = useState<string>('');
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-minimal transition-minimal space-y-2">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <Layers className="w-4 h-4 text-slate-900" />
          <span>Side-by-Side Revision Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Compare Legal Documents</h1>
        <p className="text-slate-600 text-sm">
          Select or upload two versions of an agreement to highlight added, removed, and modified clauses with plain-English AI explanations.
        </p>
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
              <select
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
            )}

            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-white hover:border-slate-400 transition-minimal">
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileA(e.target.files[0]);
                    setDocAId('');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-700 block">
                {fileA ? fileA.name : 'Or Upload File A (PDF/DOCX)'}
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
              <select
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
            )}

            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-white hover:border-slate-400 transition-minimal">
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileB(e.target.files[0]);
                    setDocBId('');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-700 block">
                {fileB ? fileB.name : 'Or Upload File B (PDF/DOCX)'}
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
          <div className="bg-rose-50 border border-rose-200/80 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 mt-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Workspace */}
      {result && (
        <div className="space-y-6">
          {/* Change Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="minimal-card rounded-xl p-4 shadow-subtle text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Changes</span>
              <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{result.total_changes}</h4>
            </div>

            <div className="minimal-card rounded-xl p-4 shadow-subtle text-center">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Added Clauses</span>
              <h4 className="text-2xl font-extrabold text-emerald-700 mt-1">{result.added_count}</h4>
            </div>

            <div className="minimal-card rounded-xl p-4 shadow-subtle text-center">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Modified Clauses</span>
              <h4 className="text-2xl font-extrabold text-amber-700 mt-1">{result.modified_count}</h4>
            </div>

            <div className="minimal-card rounded-xl p-4 shadow-subtle text-center">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Removed Clauses</span>
              <h4 className="text-2xl font-extrabold text-rose-700 mt-1">{result.removed_count}</h4>
            </div>
          </div>

          {/* Clause Diff Cards */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">Detailed Clause Revision Breakdown</h3>

            {result.changes?.map((change: any, idx: number) => (
              <div key={idx} className="minimal-card rounded-2xl p-6 shadow-subtle space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {change.status === 'Added' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold flex items-center gap-1">
                        <Plus className="w-3 h-3 text-emerald-600" /> Added
                      </span>
                    ) : change.status === 'Removed' ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-bold flex items-center gap-1">
                        <Minus className="w-3 h-3 text-rose-600" /> Removed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-amber-600" /> Modified
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
                    <p className="text-slate-800 leading-relaxed">{change.doc_a_text || 'Clause not present.'}</p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                    <span className="font-sans font-bold text-emerald-900 text-[11px] block">VERSION B (REVISED)</span>
                    <p className="text-slate-800 leading-relaxed">{change.doc_b_text || 'Clause not present.'}</p>
                  </div>
                </div>

                {/* Plain English AI Explanation */}
                <div className="bg-slate-100/80 border border-slate-200/80 p-3.5 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-900 font-sans block">AI Explanation of Impact:</span>
                  <p className="text-slate-800 font-medium font-sans leading-relaxed">{change.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

