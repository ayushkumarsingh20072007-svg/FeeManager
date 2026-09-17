import React, { useState } from 'react';
import { UserProfile } from '../types';
import { RoleBadge } from './StatusBadge';
import { LogOut, Menu, Bell, Calendar, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react';

interface VignanHeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onSwitchUser?: (email: string) => void;
  onToggleSidebar?: () => void;
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
  onResetDemo?: () => void;
}

export const VignanHeader: React.FC<VignanHeaderProps> = ({
  user,
  onLogout,
  onSwitchUser,
  onToggleSidebar,
  selectedYear = '2026-27',
  onSelectYear,
  onResetDemo,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-40">
      {/* Left: Sidebar Toggle & Vignan Branding */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Toggle Sidebar Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="border border-gray-200/90 rounded-lg p-1.5 bg-white flex items-center space-x-2.5 shadow-xs">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-indigo-600 to-red-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
              VU
            </div>
            <div>
              <div className="text-[13.5px] font-black text-[#d32f2f] tracking-tight leading-none">
                VIGNAN'S
              </div>
              <div className="text-[7.5px] font-semibold text-gray-600 uppercase tracking-tight leading-tight mt-0.5">
                (Deemed to be University) • UGC 1956
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-gray-200">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300/80 text-[9px] font-bold">
              NAAC A+
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300/80 text-[9px] font-bold">
              NIRF 70
            </span>
          </div>
        </div>
      </div>

      {/* Center: Agent Title */}
      <div className="hidden md:flex flex-col items-center text-center">
        <div className="text-[9px] font-extrabold text-gray-500 tracking-widest uppercase">
          CSE PRESENTS AGENTIC AI DAY 2026
        </div>
        <div className="text-sm font-black text-[#1e3a8a] tracking-tight">
          AGENT 40 <span className="text-xs font-semibold text-brand-600">— FEE MANAGEMENT AGENT</span>
        </div>
      </div>

      {/* Right Controls: Academic Year, Notifications, Role, User */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Academic Year Selector */}
        <div className="hidden sm:flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear && onSelectYear(e.target.value)}
            className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
            title="Select Academic Year"
          >
            <option value="2026-27">AY 2026-27 (Current)</option>
            <option value="2025-26">AY 2025-26</option>
            <option value="2024-25">AY 2024-25</option>
          </select>
        </div>

        {/* Notifications Icon with Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-2">
                <span>System Notifications</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">3 New</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 space-y-0.5">
                  <div className="font-semibold text-[11px]">Reconciliation Mismatch Flagged</div>
                  <div className="text-[10px] text-amber-800">MIS-2026-001: Bank variance ₹5,000 in STU1001</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-900 space-y-0.5">
                  <div className="font-semibold text-[11px]">Fee Demand Cycle AY 2026-27</div>
                  <div className="text-[10px] text-blue-800">28 student profiles verified against R23 regulation</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 space-y-0.5">
                  <div className="font-semibold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Audit Trail Integrity Verified
                  </div>
                  <div className="text-[10px] text-emerald-800">SHA-256 hash chains intact and immutable</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Info & Switcher */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
            <RoleBadge role={user.role} />

            {/* Role fast-switcher for reviewing all 7 roles */}
            {onSwitchUser && (
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Switch Role User"
                  value={user.email}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 hover:border-brand-500 focus:outline-none cursor-pointer font-medium appearance-none pr-6"
                >
                  <option value="accounts@university.edu">Accounts Officer (Finance Operations)</option>
                  <option value="finance.approver@university.edu">Finance Approver (Approvals & Refunds)</option>
                  <option value="director@university.edu">Management (Executive Dashboard)</option>
                  <option value="admin@university.edu">System Admin (Master Config)</option>
                  <option value="aravind.k@student.edu">Student: Aravind Kumar (Cleared / Approved)</option>
                  <option value="priya.s@student.edu">Student: Priya Sharma (Fees Due: ₹1,18,000)</option>
                  <option value="meera.i@student.edu">Student: Meera Iyer (Attendance: 68% Shortage)</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
              </div>
            )}

            {/* Evaluator Live Demo Reset Button */}
            {onResetDemo && (
              <button
                onClick={onResetDemo}
                title="Reset Demo: Re-locks Priya & Meera to fresh state for repeat evaluator presentations"
                className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-amber-700" />
                <span className="hidden sm:inline">Reset Demo</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
