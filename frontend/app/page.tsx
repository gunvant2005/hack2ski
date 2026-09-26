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
  Lock
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
                <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                <span>Generative AI Legal Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Understand Legal Documents <span className="text-slate-500 font-semibold">With Confidence.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
                LegalLens AI converts complex legal agreements into plain English, highlights critical attention areas, enables grounded RAG Q&A, and prepares actionable checklists before you sign.
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

      {/* Four Core Feature Cards Section */}
      <section id="features" className="py-20 bg-white border-b border-slate-200/60">
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

