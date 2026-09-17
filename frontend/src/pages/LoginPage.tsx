import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { UserProfile } from '../types';
import {
  ShieldCheck, Lock, Mail, ArrowRight, GraduationCap,
  Building2, CheckCircle2, Eye, EyeOff, KeyRound, Sparkles,
  UserCheck, AlertCircle
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [portalMode, setPortalMode] = useState<'STUDENT' | 'FINANCE'>('STUDENT');
  const [identifier, setIdentifier] = useState('STU1001');
  const [password, setPassword] = useState('STU1001');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch between Student and Finance Department portals
  const handleSelectPortal = (mode: 'STUDENT' | 'FINANCE') => {
    setPortalMode(mode);
    setError(null);
    if (mode === 'STUDENT') {
      setIdentifier('STU1001');
      setPassword('STU1001');
    } else {
      setIdentifier('accounts@university.edu');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await AuthService.login(identifier, password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      if (portalMode === 'STUDENT') {
        setError(
          err.message ||
          'Authentication failed. For students, your password MUST be your exact Student ID (e.g. STU1001).'
        );
      } else {
        setError(err.message || 'Login failed. Please verify institutional credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0b1b3d] to-[#0f172a] flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full space-y-6 z-10 py-6">
        {/* Brand Header matching Vignan's Official Identity */}
        <div className="text-center space-y-3">
          <div className="inline-flex flex-col items-center justify-center border border-white/20 rounded-2xl px-5 py-3 bg-white/95 backdrop-blur-md shadow-xl transition-transform hover:scale-[1.02] duration-300">
            <div className="text-2xl font-black text-[#d32f2f] tracking-tight leading-none drop-shadow-xs">
              VIGNAN'S
            </div>
            <div className="text-[9px] font-bold text-slate-700 uppercase tracking-tight mt-1">
              (Deemed to be University) • Estd. u/s 3 of UGC Act 1956
            </div>
            <div className="flex items-center justify-center space-x-2.5 mt-2 pt-1.5 border-t border-slate-100 w-full">
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-extrabold tracking-wide shadow-2xs">
                ★ NAAC A+
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-300 text-[10px] font-extrabold tracking-wide shadow-2xs">
                NIRF #70
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-black text-blue-300/90 tracking-widest uppercase flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>DIRECTORATE OF FINANCE & STUDENT ACCOUNTS</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
              AGENT 40 • FEE MANAGEMENT
            </h1>
            <p className="text-xs text-blue-200/80 font-medium">
              Enterprise Institutional Financial Intelligence & Student Portal
            </p>
          </div>
        </div>

        {/* Dual Portal Selection Tabs: Student & Finance Department */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => handleSelectPortal('STUDENT')}
            className={`relative py-3.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer ${
              portalMode === 'STUDENT'
                ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className={`w-5 h-5 ${portalMode === 'STUDENT' ? 'text-white' : 'text-slate-400'}`} />
            <span className="tracking-wide">Student Portal</span>
            <span className={`text-[9px] font-normal ${portalMode === 'STUDENT' ? 'text-blue-100' : 'text-slate-400'}`}>
              Login with Student ID
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPortal('FINANCE')}
            className={`relative py-3.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer ${
              portalMode === 'FINANCE'
                ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className={`w-5 h-5 ${portalMode === 'FINANCE' ? 'text-white' : 'text-slate-400'}`} />
            <span className="tracking-wide">Finance Dept</span>
            <span className={`text-[9px] font-normal ${portalMode === 'FINANCE' ? 'text-indigo-100' : 'text-slate-400'}`}>
              Institutional ERP
            </span>
          </button>
        </div>

        {/* Main Glassmorphic Login Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 space-y-5">
          {/* Dynamic Context Notice */}
          <div className={`flex items-start space-x-2.5 text-xs px-3.5 py-2.5 rounded-xl border transition-all ${
            portalMode === 'STUDENT'
              ? 'bg-blue-50/80 border-blue-200 text-blue-900'
              : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
          }`}>
            {portalMode === 'STUDENT' ? (
              <GraduationCap className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            ) : (
              <Building2 className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
            )}
            <div className="leading-relaxed">
              {portalMode === 'STUDENT' ? (
                <>
                  <span className="font-bold">Student Secure Access:</span> Enter your <strong>Student ID</strong> (e.g. <code>STU1001</code>) or email. Your password is <strong>strictly your Student ID</strong>.
                </>
              ) : (
                <>
                  <span className="font-bold">Finance Department Access:</span> Authorized university accounts officer ERP ledger and reconciliation console.
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3.5 py-3 rounded-xl flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  {portalMode === 'STUDENT' ? 'Student ID / Email' : 'Institutional Email'}
                </label>
                {portalMode === 'STUDENT' && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Student ID e.g. STU1001
                  </span>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {portalMode === 'STUDENT' ? (
                    <UserCheck className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  ) : (
                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  )}
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full bg-slate-50/80 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-inner placeholder:text-slate-400 font-mono"
                  placeholder={portalMode === 'STUDENT' ? 'STU1001 or student@student.edu' : 'accounts@university.edu'}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <KeyRound className="w-3 h-3 text-amber-600" />
                  {portalMode === 'STUDENT' ? (
                    <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                      Password = Student ID
                    </span>
                  ) : (
                    <span className="text-slate-600 font-mono">Staff Password</span>
                  )}
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-50/80 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-inner placeholder:text-slate-400 font-mono"
                  placeholder={portalMode === 'STUDENT' ? 'STU1001' : '••••••••••••'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {portalMode === 'STUDENT' && (
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Your Student ID (e.g. <strong>STU1001</strong>) is your exclusive login password.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md cursor-pointer disabled:opacity-50 tracking-wide text-sm ${
                portalMode === 'STUDENT'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.01]'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01]'
              }`}
            >
              <span>
                {loading
                  ? 'Authenticating Identity...'
                  : portalMode === 'STUDENT'
                  ? 'Sign In to Student Portal'
                  : 'Sign In to Finance ERP'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick One-Click Switcher Strictly Between Student & Finance Department */}
          <div className="border-t border-slate-200/80 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                Instant Quick-Fill Demo
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to populate</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPortalMode('STUDENT');
                  setIdentifier('STU1001');
                  setPassword('STU1001');
                  setError(null);
                }}
                className={`p-3 text-left rounded-xl border transition-all duration-200 cursor-pointer ${
                  portalMode === 'STUDENT' && identifier === 'STU1001'
                    ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="font-bold text-blue-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    Student Profile
                  </span>
                  {portalMode === 'STUDENT' && identifier === 'STU1001' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-800 font-bold mt-1">ID: STU1001</div>
                <div className="text-[9px] text-slate-500 font-mono">PW: STU1001</div>
                <div className="text-[9px] text-blue-600 font-semibold mt-0.5">Aravind Kumar (B.Tech CSE)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPortalMode('FINANCE');
                  setIdentifier('accounts@university.edu');
                  setPassword('password123');
                  setError(null);
                }}
                className={`p-3 text-left rounded-xl border transition-all duration-200 cursor-pointer ${
                  portalMode === 'FINANCE' && identifier === 'accounts@university.edu'
                    ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="font-bold text-indigo-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Finance Officer
                  </span>
                  {portalMode === 'FINANCE' && identifier === 'accounts@university.edu' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-800 font-bold mt-1 truncate">accounts@university.edu</div>
                <div className="text-[9px] text-slate-500 font-mono">PW: password123</div>
                <div className="text-[9px] text-indigo-600 font-semibold mt-0.5">Rajesh Sharma (Officer)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Vignan University • Strict Student Data Isolation • RBAC Enforced</span>
        </div>
      </div>
    </div>
  );
};
