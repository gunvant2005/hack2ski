'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Search,
  Layers,
  HelpCircle,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Brain,
  MessageSquare,
  Cpu,
  Database,
  Zap,
  Target,
  BookOpen,
  Scale,
  BarChart3,
  GitBranch
} from 'lucide-react';
import { getStoredUser } from '../lib/api';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="bg-[#FAFBFD] text-slate-900 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
                <span>Full-Stack Generative AI Legal Intelligence Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Understand Legal Documents <span className="text-slate-500 font-semibold">With Confidence.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
                LegalLens AI converts complex legal agreements into plain English, highlights critical attention areas, enables grounded RAG Q&A with exact page/clause citations, compares agreement revisions side-by-side, and prepares actionable checklists before you sign.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>Analyze a Document</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/compare"
                  className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-subtle active:scale-[0.98]"
                >
                  <Layers className="w-4 h-4 text-slate-700" />
                  <span>Compare Agreements</span>
                </Link>
              </div>

              {/* Safety banner chip */}
              <div className="flex items-center gap-2.5 text-xs text-slate-500 pt-3 border-t border-slate-200/70">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Provides document assistance. Always consult a licensed lawyer for official legal counsel.</span>
              </div>
            </div>

            {/* Right Graphic: Minimalist Legal Document Preview */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-white border border-slate-200/90 p-6 shadow-minimal transition-minimal">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">Employment_Agreement_v2.pdf</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Attention Needed
                  </span>
                </div>

                <div className="py-4 space-y-3 font-mono text-xs text-slate-600 leading-relaxed">
                  <p className="text-slate-800">
                    <span className="text-slate-950 font-bold">Clause 4 (Renewal):</span> This Agreement shall automatically renew for successive 1-year periods unless written notice is given 60 days prior...
                  </p>

                  <div className="bg-amber-50/80 border-l-[3px] border-amber-500 p-3 rounded-r-xl font-sans text-xs text-amber-900">
                    <span className="font-semibold text-amber-950 block mb-0.5">⚠ AI Attention Indicator: Automatic Renewal</span>
                    Requires notice 60 days prior to expiry. Missing this deadline locks you into another 12-month term.
                  </div>

                  <p className="text-slate-700">
                    <span className="text-slate-950 font-bold">Clause 6 (Restraint):</span> Employee agrees not to engage in competing business for 12 months post-termination...
                  </p>

                  <div className="bg-rose-50/80 border-l-[3px] border-rose-500 p-3 rounded-r-xl font-sans text-xs text-rose-900">
                    <span className="font-semibold text-rose-950 block mb-0.5">🔴 AI Attention Indicator: Non-Compete</span>
                    Broad geographical non-compete restraint. Consider discussing enforceability with a lawyer.
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                  <span>Page 2 of 4</span>
                  <span className="text-slate-800 font-semibold cursor-pointer hover:underline">Grounded Source Verified ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PROBLEM STATEMENT SECTION — Hackathon Alignment */}
      {/* ============================================================ */}
      <section id="problem-statement" className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Problem */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                <Target className="w-3.5 h-3.5" />
                <span>The Problem</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Legal Documents Are Inaccessible to Non-Lawyers
              </h2>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-900">80% of individuals and small businesses</strong> sign legal contracts without fully understanding their rights, obligations, or hidden risks. Dense legal language, buried renewal clauses, broad indemnification terms, and non-compete restrictions routinely catch signers off-guard.
                </p>
                <p>
                  Traditional legal review is expensive ($200–$500/hour), slow (days/weeks), and inaccessible. People need an <strong className="text-slate-900">intelligent, AI-powered tool</strong> that can instantly break down any legal document into plain English, flag attention areas, and enable interactive Q&A — all grounded in the actual document content.
                </p>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Key Challenges Addressed</h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" /><span>Complex legal jargon prevents understanding of critical contract terms</span></li>
                    <li className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" /><span>Hidden auto-renewal, liability, and non-compete clauses go unnoticed</span></li>
                    <li className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" /><span>No affordable way to compare contract revisions for meaningful changes</span></li>
                    <li className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" /><span>Lack of structured preparation before lawyer consultations wastes billable hours</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Our GenAI Solution</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                AI-Powered Legal Document Intelligence
              </h2>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  LegalLens AI is a <strong className="text-slate-900">full-stack Generative AI platform</strong> powered by <strong className="text-slate-900">Google Gemini</strong> that transforms how people interact with legal documents. It uses a <strong className="text-slate-900">RAG (Retrieval-Augmented Generation)</strong> pipeline to deliver grounded, citation-backed analysis.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Plain-Language Summarization</h5>
                      <p className="text-xs text-slate-600 mt-0.5">Converts dense legal text into clear, structured summaries with key terms extracted</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">AI Attention Radar Dashboard</h5>
                      <p className="text-xs text-slate-600 mt-0.5">Automatically flags unusual clauses with severity ratings and suggested lawyer questions</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Grounded RAG Document Q&A</h5>
                      <p className="text-xs text-slate-600 mt-0.5">Interactive chat with exact page/clause citations, strictly grounded in document content</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
                    <Layers className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Side-by-Side Contract Comparison</h5>
                      <p className="text-xs text-slate-600 mt-0.5">Upload two versions to see added, removed, and modified clauses with explanations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* GenAI ARCHITECTURE & RAG PIPELINE SECTION */}
      {/* ============================================================ */}
      <section id="genai-architecture" className="py-20 bg-[#FAFBFD] border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold mx-auto">
              <Brain className="w-3.5 h-3.5" />
              <span>GenAI Architecture</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              RAG-Powered Document Intelligence Pipeline
            </h2>
            <p className="text-slate-600 text-base">
              Every analysis is powered by a Retrieval-Augmented Generation pipeline with Google Gemini, ensuring answers are grounded in your actual document — never hallucinated.
            </p>
          </div>

          {/* RAG Pipeline Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">1</div>
              <h4 className="font-bold text-sm text-slate-900">Document Upload & Text Extraction</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                PDF files are processed with <strong>PyMuPDF (fitz)</strong> for page-by-page text extraction. DOCX files use <strong>python-docx</strong> with binary-safe extraction. Text is cleaned and normalized.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
                PyMuPDF → Page-level text → Clean paragraphs
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
              <h4 className="font-bold text-sm text-slate-900">Semantic Chunking & Embedding</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Document text is chunked into ~400-character semantic blocks with page numbers and clause headers. Each chunk is embedded using <strong>TF-IDF vectorization</strong> and stored in <strong>PostgreSQL (pgvector)</strong>.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
                Chunking → TF-IDF Embedding → pgvector Storage
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">3</div>
              <h4 className="font-bold text-sm text-slate-900">Cosine Similarity Retrieval</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                User questions are embedded and matched against stored chunks via <strong>cosine similarity</strong> with keyword overlap boosting. Top-3 most relevant chunks are retrieved as grounded context.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
                Query Embed → Cosine Search → Top-K Chunks
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">4</div>
              <h4 className="font-bold text-sm text-slate-900">Google Gemini Structured Analysis</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Retrieved context is sent to <strong>Google Gemini (gemini-2.0-flash)</strong> with strict JSON schema instructions. The AI produces structured summaries, risk assessments, clause categorization, and lawyer questions.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
                Context + Prompt → Gemini API → Structured JSON
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">5</div>
              <h4 className="font-bold text-sm text-slate-900">Grounded Q&A with Citations</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive chat uses the RAG pipeline to answer questions strictly from retrieved document chunks. Every answer includes <strong>exact page numbers and clause citations</strong>. If context is insufficient, the AI states this explicitly.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
                Question → RAG Retrieval → Cited Answer
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3 shadow-subtle">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">6</div>
              <h4 className="font-bold text-sm text-slate-900">Smart NLP Fallback Engine</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                A local <strong>heuristic NLP engine</strong> with regex-based clause detection, document type classification, and risk pattern matching ensures <strong>zero-failure reliability</strong> — even when the Gemini API is unavailable.
              </p>
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
                Gemini Fallback → NLP Heuristics → Guaranteed Output
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* GenAI SERVICES UTILIZED */}
      {/* ============================================================ */}
      <section id="genai-services" className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Generative AI Services Utilized
            </h2>
            <p className="text-slate-600 text-base">
              LegalLens AI leverages Google Gemini across every core feature for intelligent document processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Cpu className="w-6 h-6 text-slate-900" />
                <h4 className="font-bold text-sm text-slate-900">Google Gemini 2.0 Flash</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Primary GenAI model for structured document analysis, plain-language summarization, risk assessment, clause categorization, and grounded RAG Q&A generation. Used with multi-model cascade fallback (gemini-2.0-flash → gemini-1.5-flash → gemini-1.5-pro).
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Document Analysis</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">RAG Q&A</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Risk Detection</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Document Comparison</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-slate-900" />
                <h4 className="font-bold text-sm text-slate-900">Vector Embedding & RAG Pipeline</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Custom TF-IDF semantic embeddings stored in PostgreSQL with pgvector extension. Cosine similarity retrieval with keyword overlap boosting for accurate context extraction and citation-backed responses.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Semantic Search</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Cosine Similarity</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">pgvector</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-slate-900" />
                <h4 className="font-bold text-sm text-slate-900">Intelligent NLP Heuristic Engine</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Local regex-based NLP engine for document type classification, party extraction, risk pattern detection, and clause categorization. Provides zero-failure fallback when external AI services are unavailable.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Document Classification</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Clause Detection</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Risk Pattern Matching</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-slate-900" />
                <h4 className="font-bold text-sm text-slate-900">Prompt Security & Guardrails</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All GenAI prompts include injection defense with {'<untrusted_document_context>'} boundaries, preventing prompt injection from document content. Strict output schema validation and legal disclaimer enforcement.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Prompt Injection Defense</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Schema Validation</span>
                <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">Output Sanitization</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Four Core Feature Cards Section */}
      <section id="features" className="py-20 bg-[#FAFBFD] border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Four Pillars of Document Intelligence
            </h2>
            <p className="text-slate-600 text-base">
              LegalLens AI provides clear, structured insights across your legal documents without confusing legalese.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Understand */}
            <Link
              href="/register"
              className="minimal-card rounded-2xl p-6 transition-minimal hover:shadow-minimal group block text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mb-5 font-bold group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <FileText className="w-5 h-5 text-slate-800 group-hover:text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Understand</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Turn complex legal language into plain English summaries. Extract key responsibilities, payment terms, and duration.
              </p>
              <span className="text-xs text-slate-900 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Plain-Language Summaries →
              </span>
            </Link>

            {/* Card 2: Detect */}
            <Link
              href="/register"
              className="minimal-card rounded-2xl p-6 transition-minimal hover:shadow-minimal group block text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center mb-5 font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <AlertTriangle className="w-5 h-5 text-amber-700 group-hover:text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Detect</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Find important clauses and potential areas for review including auto-renewals, non-competes, and broad liability.
              </p>
              <span className="text-xs text-slate-900 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Attention Area Radar →
              </span>
            </Link>

            {/* Card 3: Compare */}
            <Link
              href="/compare"
              className="minimal-card rounded-2xl p-6 transition-minimal hover:shadow-minimal group block text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mb-5 font-bold group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Layers className="w-5 h-5 text-slate-800 group-hover:text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Compare</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                See what changed between two contract versions with side-by-side added, removed, and modified clause highlights.
              </p>
              <span className="text-xs text-slate-900 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Side-by-Side Diff →
              </span>
            </Link>

            {/* Card 4: Ask */}
            <Link
              href="/register"
              className="minimal-card rounded-2xl p-6 transition-minimal hover:shadow-minimal group block text-left active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mb-5 font-bold group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5 text-slate-800 group-hover:text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ask</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Ask questions and get answers grounded strictly in your document with exact page and clause citations.
              </p>
              <span className="text-xs text-slate-900 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Grounded Source Q&A →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TECHNOLOGY STACK SECTION */}
      {/* ============================================================ */}
      <section id="tech-stack" className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Full-Stack Technology Architecture
            </h2>
            <p className="text-slate-600 text-base">
              Production-grade architecture with automated testing, security hardening, and cloud deployment.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Frontend', tech: 'Next.js 14 + React 18 + TypeScript', icon: <Zap className="w-4 h-4" /> },
              { label: 'Backend', tech: 'Python FastAPI + SQLAlchemy ORM', icon: <Cpu className="w-4 h-4" /> },
              { label: 'AI Engine', tech: 'Google Gemini 2.0 Flash + RAG', icon: <Brain className="w-4 h-4" /> },
              { label: 'Database', tech: 'PostgreSQL + pgvector + SQLite', icon: <Database className="w-4 h-4" /> },
              { label: 'Auth', tech: 'JWT + Bcrypt + Rate Limiting', icon: <Lock className="w-4 h-4" /> },
              { label: 'Deployment', tech: 'Vercel + Docker Compose', icon: <GitBranch className="w-4 h-4" /> },
              { label: 'Testing', tech: 'Pytest + E2E Integration Suite', icon: <CheckCircle2 className="w-4 h-4" /> },
              { label: 'Security', tech: 'CORS + CSP + Prompt Injection Defense', icon: <ShieldCheck className="w-4 h-4" /> },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-900">
                  {item.icon}
                  <span className="font-bold text-xs uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{item.tech}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-[#FAFBFD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Simple 4-Step Document Journey</h2>
            <p className="text-slate-600 text-base mt-2">
              From upload to decision readiness in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                1
              </div>
              <h4 className="font-bold text-slate-900 mb-1 text-sm">Upload Document</h4>
              <p className="text-xs text-slate-500">PDF or DOCX legal file</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                2
              </div>
              <h4 className="font-bold text-slate-900 mb-1 text-sm">AI Processing</h4>
              <p className="text-xs text-slate-500">Chunking & RAG embedding</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                3
              </div>
              <h4 className="font-bold text-slate-900 mb-1 text-sm">Review Insights</h4>
              <p className="text-xs text-slate-500">Summary, clauses & risks</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                4
              </div>
              <h4 className="font-bold text-slate-900 mb-1 text-sm">Prepare & Act</h4>
              <p className="text-xs text-slate-500">Checklist & lawyer questions</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
