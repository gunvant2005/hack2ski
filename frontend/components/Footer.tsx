import React from 'react';
import { ShieldAlert, Scale } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/80 text-slate-500 text-xs py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6 flex items-start gap-3 text-slate-600">
          <ShieldAlert className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 block mb-0.5">Important Legal Disclaimer</span>
            <p className="text-slate-600 leading-relaxed text-[13px]">
              LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice from a qualified attorney. Always consult a licensed lawyer for contract execution or specific legal inquiries.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-slate-500">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Scale className="w-4 h-4 text-slate-900" />
            <span>LegalLens AI &copy; {new Date().getFullYear()} — GenAI Legal Document Intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-slate-500">
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#disclaimer" className="hover:text-slate-900 transition-colors">Legal Safety</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

