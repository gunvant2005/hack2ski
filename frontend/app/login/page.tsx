'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginUser(email.trim(), password);
      router.push('/dashboard');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : typeof detail === 'string'
        ? detail
        : 'Invalid email or password. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl p-8 shadow-minimal space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In</h2>
          <p className="text-xs text-slate-500">Access your analyzed legal documents & Q&A assistant</p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200/80 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link href="/register" className="text-slate-900 hover:underline font-bold">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
