import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Users,
  Coins,
  FileSpreadsheet,
  Layers,
  CreditCard,
  RefreshCw,
  Clock,
  RotateCcw,
  ShieldCheck,
  Calculator,
  BarChart3,
  UserCog,
  Database,
  ScrollText,
  Settings as SettingsIcon,
  Cpu,
  GraduationCap,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Printer,
  Award,
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { RoleBadge } from './StatusBadge';

export interface NavItemDef {
  id: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const studentNavGroups: NavGroupDef[] = [
  {
    title: 'STUDENT PORTAL',
    items: [
      { id: 'student-dashboard', label: 'My Fee Dashboard', icon: LayoutDashboard },
      { id: 'student-ledger', label: 'My Fee Ledger', icon: FileSpreadsheet },
      { id: 'student-challan', label: 'Official Fee Challan', icon: Printer },
      { id: 'student-hall-ticket', label: 'Exam Hall Ticket & Clearances', icon: Award },
      { id: 'student-payments', label: 'Payments & Receipts', icon: CreditCard },
      { id: 'ai-assistant', label: 'AI Fee Assistant', icon: Bot },
    ],
  },
];

export const navGroups: NavGroupDef[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'ai-assistant', label: 'AI Fee Assistant', icon: Bot },
    ],
  },
  {
    title: 'STUDENT & FEES',
    items: [
      {
        id: 'programs',
        label: 'Academic Programs (11)',
        icon: GraduationCap,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'students',
        label: 'Students Registry',
        icon: Users,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'fee-management',
        label: 'Fee Management',
        icon: Coins,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'fee-demands',
        label: 'Fee Demands',
        icon: FileSpreadsheet,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'fee-structures',
        label: 'Fee Structures',
        icon: Layers,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'counsellor-desk',
        label: 'Counsellor / Exam Clearance',
        icon: Award,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'FINANCE_APPROVER', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
    ],
  },
  {
    title: 'PAYMENTS',
    items: [
      { id: 'payments', label: 'Payments', icon: CreditCard },
      {
        id: 'reconciliation',
        label: 'Reconciliation',
        icon: RefreshCw,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'FINANCE_APPROVER', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'aging',
        label: 'Aging & Outstanding',
        icon: Clock,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'FINANCE_APPROVER', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'refunds', label: 'Refunds', icon: RotateCcw },
      {
        id: 'approvals',
        label: 'Approvals',
        icon: ShieldCheck,
        roles: ['FINANCE_APPROVER', 'ADMIN', 'ACCOUNTS_OFFICER', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'accounting',
        label: 'Accounting',
        icon: Calculator,
        roles: ['FINANCE_APPROVER', 'ACCOUNTS_OFFICER', 'MANAGEMENT', 'ADMIN', 'SYSTEM_ADMIN'],
      },
      {
        id: 'reports',
        label: 'Reports & Analytics',
        icon: BarChart3,
        roles: ['ACCOUNTS_OFFICER', 'FINANCE_APPROVER', 'MANAGEMENT', 'ADMIN', 'SYSTEM_ADMIN'],
      },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      {
        id: 'users-roles',
        label: 'Users & Roles',
        icon: UserCog,
        roles: ['ADMIN', 'SYSTEM_ADMIN', 'MANAGEMENT'],
      },
      {
        id: 'database-ledger',
        label: 'Database Ledger',
        icon: Database,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'FINANCE_APPROVER', 'MANAGEMENT', 'SYSTEM_ADMIN'],
      },
      {
        id: 'integrations',
        label: 'Integrations & Webhooks',
        icon: Cpu,
        roles: ['ACCOUNTS_OFFICER', 'ADMIN', 'FINANCE_APPROVER', 'MANAGEMENT', 'SYSTEM_ADMIN', 'STUDENT'],
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: ScrollText,
        roles: ['ADMIN', 'MANAGEMENT', 'SYSTEM_ADMIN', 'FINANCE_APPROVER'],
      },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

interface SidebarProps {
  currentTab: string;
  onSelectTab: (id: string) => void;
  user: UserProfile;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const isItemVisible = (item: NavItemDef) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300 select-none border-r border-slate-800">
      {/* 1. Sidebar Header */}
      <div className="p-4 border-b border-slate-800 bg-[#1e293b]/60">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2.5 overflow-hidden transition-all ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 via-indigo-600 to-red-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
              40
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="text-[11px] font-extrabold text-red-400 tracking-tight leading-none">
                  VIGNAN'S UNIVERSITY
                </div>
                <div className="text-[12px] font-bold text-white tracking-tight mt-0.5">
                  AGENT 40 <span className="text-[10px] text-brand-400 font-normal">| FEE ERP</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card in Header */}
        {!isCollapsed && (
          <div className="mt-3.5 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white truncate max-w-[140px]">{user.full_name}</span>
              <RoleBadge role={user.role} />
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
              {user.roll_no ? `Roll: ${user.roll_no}` : user.email}
            </div>
          </div>
        )}
      </div>

      {/* 2. Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {(user?.role === 'STUDENT' ? studentNavGroups : navGroups).map((group, gIdx) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {group.title}
                </div>
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#1e293b]/40 space-y-2">
        {!isCollapsed && (
          <div className="px-2 py-1.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] space-y-0.5 font-mono">
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
              </span>
              <span className="text-slate-500">v0.1.0</span>
            </div>
            <div className="text-slate-400 text-[9px] flex justify-between">
              <span>Backend: Connected</span>
              <span>DB: SQLite</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onSelectTab('settings')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center space-x-1.5 transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
            {!isCollapsed && <span className="text-xs">Settings</span>}
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs flex items-center space-x-1.5 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="text-xs">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-300 sticky top-14 h-[calc(100vh-3.5rem)] z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
