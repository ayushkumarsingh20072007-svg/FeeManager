import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/StatusBadge';
import {
  UserCog,
  CheckCircle2,
  Search,
  Key,
} from 'lucide-react';
import { UserRole } from '../types';

export const UsersRolesPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');

  const rolesMatrix: { role: UserRole; title: string; permissions: string[]; desc: string }[] = [
    {
      role: 'ACCOUNTS_OFFICER',
      title: 'Accounts Officer (e.g. Rajesh Sharma)',
      desc: 'Day-to-day fee operations, payment logging, demand verification, and variance triage',
      permissions: ['View Students', 'Manage Fee Demands', 'Log Payments', 'Reconcile Transactions', 'Triage Mismatches', 'Draft Refunds'],
    },
    {
      role: 'FINANCE_APPROVER',
      title: 'Finance Approver (e.g. Dr. Ramanathan)',
      desc: 'Two-man rule authorized signatory for refund disbursements, waivers, and adjustments',
      permissions: ['Authorize Refunds', 'Sign Waivers', 'Approve Concessions', 'View Financial Ledgers', 'Access Audit Trail'],
    },
    {
      role: 'MANAGEMENT',
      title: 'Management & Directors (e.g. Director Finance)',
      desc: 'High-level financial analytics, collection KPIs, aging forecasts, and policy reviews',
      permissions: ['Executive Dashboard', 'Collection Reports', 'Aging Analytics', 'Audit Trail Oversight', 'Policy Configuration'],
    },
    {
      role: 'ADMIN',
      title: 'Financial Administrator',
      desc: 'Master configuration of fee structures, regulation heads, and user management',
      permissions: ['Fee Structure Master', 'Fee Head Configuration', 'User Management', 'RBAC Administration', 'System Ledger'],
    },
    {
      role: 'SYSTEM_ADMIN',
      title: 'System Administrator',
      desc: 'Infrastructure maintenance, SQLite database migrations, and security settings',
      permissions: ['Full System Access', 'Database Maintenance', 'Audit Integrity Check', 'API Key Management', 'Security Config'],
    },
    {
      role: 'STUDENT',
      title: 'Enrolled Student (e.g. Aravind Kumar)',
      desc: 'Personal fee demand breakdown, online payment gateway access, and receipts',
      permissions: ['View Personal Ledger', 'Pay Fees Online', 'Track Payments', 'Submit Refund Claim', 'AI Fee Assistant'],
    },
    {
      role: 'PARENT',
      title: 'Student Parent / Guardian (e.g. S. Kumar)',
      desc: 'Ward fee summary, payment history, installment tracking, and receipt downloads',
      permissions: ['View Ward Fees', 'Make Ward Payment', 'Track Installments', 'View Fee Structure', 'AI Fee Assistant'],
    },
  ];

  const demoAccounts = [
    { email: 'accounts@university.edu', name: 'Rajesh Sharma', role: 'ACCOUNTS_OFFICER' as UserRole, status: 'Active' },
    { email: 'finance.approver@university.edu', name: 'Dr. Ramanathan (Finance Approver)', role: 'FINANCE_APPROVER' as UserRole, status: 'Active' },
    { email: 'director@university.edu', name: 'Director of Finance', role: 'MANAGEMENT' as UserRole, status: 'Active' },
    { email: 'admin@university.edu', name: 'Institutional Finance Admin', role: 'ADMIN' as UserRole, status: 'Active' },
    { email: 'sysadmin@university.edu', name: 'System Administrator', role: 'SYSTEM_ADMIN' as UserRole, status: 'Active' },
    { email: 'aravind.k@student.edu', name: 'Aravind Kumar (Roll: STU1001)', role: 'STUDENT' as UserRole, status: 'Active' },
    { email: 'priya.s@student.edu', name: 'Priya Sharma (Merit Scholar)', role: 'STUDENT' as UserRole, status: 'Active' },
    { email: 'parent.aravind@gmail.com', name: 'S. Kumar (Parent of STU1001)', role: 'PARENT' as UserRole, status: 'Active' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Role-Based Access Control (RBAC) & Users"
        subtitle="Authoritative role hierarchy, security policies, and 35 institutional user accounts"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Administration', href: '#' },
          { label: 'Users & Roles' }
        ]}
      />

      {/* 2. Security Principle Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-2">
        <div className="flex items-center space-x-2 text-brand-300 font-bold text-xs">
          <Key className="w-4 h-4 text-brand-400" />
          <span>AUTHORITATIVE BACKEND RBAC ENFORCEMENT</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Role-Based Access Control is cryptographically validated on the FastAPI backend on every request using JWT bearer tokens and claims. Frontend navigation is role-aware, but the backend is the authoritative security boundary.
        </p>
      </div>

      {/* 3. 7-Role Permissions Matrix */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-brand-600" />
          7 Institutional Roles & Capabilities Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {rolesMatrix.map((r, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <RoleBadge role={r.role} />
                <span className="text-[10px] font-mono text-slate-400">Level {i + 1}</span>
              </div>
              <div className="font-bold text-slate-900 text-xs">{r.title}</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{r.desc}</p>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-700 uppercase">Authorized Operations:</div>
                <div className="space-y-0.5">
                  {r.permissions.map((p, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-slate-600 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Seeded Accounts Directory */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Institutional Seeded Accounts Directory</h3>
            <p className="text-xs text-slate-500">35 institutional user accounts configured in `agent40.db`</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, email, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Institutional Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Fast Login Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {demoAccounts
                .filter(
                  (u) =>
                    u.name.toLowerCase().includes(search.toLowerCase()) ||
                    u.email.toLowerCase().includes(search.toLowerCase()) ||
                    u.role.toLowerCase().includes(search.toLowerCase())
                )
                .map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-mono text-slate-400">Password: password123</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
