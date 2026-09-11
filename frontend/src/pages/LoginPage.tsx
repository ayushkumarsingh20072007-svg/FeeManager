import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { UserProfile } from '../types';
import { ShieldCheck, Lock, Mail, ArrowRight, Info } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('accounts@university.edu');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await AuthService.login(email, password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#edf3fd] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header matching Vignan's Template */}
        <div className="text-center space-y-2">
          <div className="border border-blue-200 rounded-xl p-3 bg-white inline-block shadow-sm">
            <div className="text-xl font-extrabold text-[#d32f2f] tracking-tight leading-none">
              VIGNAN'S
            </div>
            <div className="text-[8px] font-semibold text-gray-700 uppercase tracking-tight mt-0.5">
              (Deemed to be University) • Estd. u/s 3 of UGC Act 1956
            </div>
            <div className="flex items-center justify-center space-x-2 mt-1.5 pt-1.5 border-t border-gray-100">
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-[9px] font-bold">
                NAAC A+
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300 text-[9px] font-bold">
                NIRF 70
              </span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">
              CSE PRESENTS
            </div>
            <h1 className="text-xl font-black text-[#1e3a8a] tracking-tight">
              AGENTIC AI DAY 2026
            </h1>
            <p className="text-xs text-brand-700 font-semibold">AGENT 40 • FEE MANAGEMENT AGENT</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-blue-200/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 text-xs text-brand-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
            <Info className="w-4 h-4 shrink-0 text-brand-600" />
            <span>Phase 1 Authentication & Ledger Gatekeeper</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                  placeholder="name@university.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 active:scale-98 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md shadow-brand-600/30 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Ledger'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              One-Click Demo Profiles (Password: <span className="font-mono text-brand-600">password123</span>)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('accounts@university.edu')}
                className="p-2 text-left bg-blue-50/60 hover:bg-blue-100 rounded-lg border border-blue-200 text-gray-800 transition-colors"
              >
                <div className="font-bold text-blue-700">Accounts Officer</div>
                <div className="text-[10px] text-gray-500 truncate">accounts@university.edu</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('finance.approver@university.edu')}
                className="p-2 text-left bg-purple-50/60 hover:bg-purple-100 rounded-lg border border-purple-200 text-gray-800 transition-colors"
              >
                <div className="font-bold text-purple-700">Finance Approver</div>
                <div className="text-[10px] text-gray-500 truncate">finance.approver@...</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('director@university.edu')}
                className="p-2 text-left bg-amber-50/60 hover:bg-amber-100 rounded-lg border border-amber-200 text-gray-800 transition-colors"
              >
                <div className="font-bold text-amber-700">Management</div>
                <div className="text-[10px] text-gray-500 truncate">director@university.edu</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('aravind.k@student.edu')}
                className="p-2 text-left bg-emerald-50/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-gray-800 transition-colors"
              >
                <div className="font-bold text-emerald-700">Student (Aravind)</div>
                <div className="text-[10px] text-gray-500 truncate">aravind.k@student.edu</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-gray-500 flex items-center justify-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Vignan University • Deterministic Rules • RBAC Enforced</span>
        </div>
      </div>
    </div>
  );
};
