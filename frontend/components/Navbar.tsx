'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Scale, FileText, Layers, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { getStoredUser, removeAuthToken } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    setMobileMenuOpen(false);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shadow-subtle transition-minimal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-slate-900">
            LegalLens <span className="text-slate-400 font-medium">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation links */}
        <nav className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  pathname === '/dashboard' 
                    ? 'bg-slate-100 text-slate-900 font-bold border border-slate-200/80' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-700" />
                Dashboard
              </Link>
              <Link
                href="/compare"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  pathname === '/compare' 
                    ? 'bg-slate-100 text-slate-900 font-bold border border-slate-200/80' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-700" />
                Compare Documents
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/#features"
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#how-it-works"
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                How It Works
              </Link>
            </>
          )}
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5">

          {user ? (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline font-semibold text-slate-900">{user.name}</span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-[0.95]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-[0.97]"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors active:scale-[0.95]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-3">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{user.name}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${
                    pathname === '/dashboard'
                      ? 'bg-slate-100 text-slate-900 border border-slate-200/80'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-slate-700" />
                  Dashboard
                </Link>
                <Link
                  href="/compare"
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${
                    pathname === '/compare'
                      ? 'bg-slate-100 text-slate-900 border border-slate-200/80'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4 text-slate-700" />
                  Compare Documents
                </Link>


                <div className="border-t border-slate-100 pt-2 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/#how-it-works"
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  How It Works
                </Link>


                <div className="border-t border-slate-100 pt-2 mt-2 flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all text-center active:scale-[0.98]"
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
