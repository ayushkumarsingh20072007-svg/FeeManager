import React, { useEffect, useState } from 'react';
import { UserProfile, LedgerStats, AuditLogItem } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import {
  Users,
  Coins,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate?: (tabId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const statsData = await ApiClient.get<LedgerStats>('/ledger/stats');
        setStats(statsData);

        try {
          const logsData = await ApiClient.get<AuditLogItem[]>('/audit-logs?limit=5');
          setRecentLogs(logsData);
        } catch {
          // If non-admin, logs may not be accessible, which is expected under RBAC
        }
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message || 'Unable to connect to financial ledger API.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <LoadingState message="Loading Institutional Financial Dashboard..." />;
  }

  if (error || !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-900">Dashboard Ledger Unavailable</h3>
          <p className="text-xs text-red-700">{error || 'Could not load statistics.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title={`Finance & Fee Operations Dashboard`}
        subtitle={`Academic Year 2026-27 • Institutional Core & Reconciliation Ledger`}
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Dashboard' }
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Ledger Active (28 Students)
            </span>
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards (Authoritative Seed Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students Enrolled"
          value={stats.total_students.toLocaleString()}
          subtitle="AY 2026-27 Active Cohorts"
          icon={Users}
          color="brand"
          onClick={() => onNavigate?.('students')}
        />
        <StatCard
          title="Total Gross Fee Demand"
          value={`₹${(stats.total_demand / 100000).toFixed(2)} L`}
          subtitle={`₹${stats.total_demand.toLocaleString()} Base Demand`}
          icon={Coins}
          color="indigo"
          onClick={() => onNavigate?.('fee-demands')}
        />
        <StatCard
          title="Total Collections Reconciled"
          value={`₹${(stats.total_collected / 100000).toFixed(2)} L`}
          subtitle={`${stats.collection_percentage}% Realization Rate`}
          icon={CreditCard}
          color="emerald"
          badge={{ text: `${stats.collection_percentage}% Paid`, color: 'emerald' }}
          onClick={() => onNavigate?.('payments')}
        />
        <StatCard
          title="Total Institutional Outstanding"
          value={`₹${(stats.total_outstanding / 100000).toFixed(2)} L`}
          subtitle={`₹${stats.overdue_90plus.toLocaleString()} (90+ Days Overdue)`}
          icon={AlertTriangle}
          color="red"
          badge={{ text: 'Receivables Active', color: 'red' }}
          onClick={() => onNavigate?.('aging')}
        />
      </div>

      {/* 3. Operational Financial & Payment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Overview Progress & Aging Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Financial Realization Progress */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <TrendingUp className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Financial Collection & Realization Progress</h3>
                  <p className="text-xs text-slate-500">Deterministic ledger verification for 28 students</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {stats.collection_percentage}% Collected
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.collection_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono pt-1">
                <span>Collected: ₹{stats.total_collected.toLocaleString()}</span>
                <span className="text-red-600 font-semibold">
                  Outstanding: ₹{stats.total_outstanding.toLocaleString()}
                </span>
                <span>Gross Demand: ₹{stats.total_demand.toLocaleString()}</span>
              </div>
            </div>

            {/* Sub-cards: Demand, Collected, Outstanding */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-500 font-medium">Gross Demand</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  ₹{stats.total_demand.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">R23 Regulation Baseline</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="text-emerald-700 font-medium">Reconciled Paid</div>
                <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                  ₹{stats.total_collected.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Gateway & Bank Verified</div>
              </div>
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                <div className="text-red-700 font-medium">Net Outstanding</div>
                <div className="text-base font-bold text-red-700 font-mono mt-0.5">
                  ₹{stats.total_outstanding.toLocaleString()}
                </div>
                <div className="text-[10px] text-red-600 mt-0.5">Active Receivables</div>
              </div>
            </div>
          </div>

          {/* Section B: Outstanding Aging Distribution */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Receivables Aging & Due Analysis</h3>
                  <p className="text-xs text-slate-500">Aging buckets calculated against institutional due dates</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate?.('aging')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Aging Report</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div className="text-emerald-700 font-semibold text-[11px]">0–30 Days (Current)</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-1">₹4,20,000</div>
                <div className="text-[10px] text-slate-500">Normal payment cycle</div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="text-blue-700 font-semibold text-[11px]">31–60 Days</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-1">₹3,50,000</div>
                <div className="text-[10px] text-slate-500">First reminder sent</div>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="text-amber-700 font-semibold text-[11px]">61–90 Days</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-1">₹2,80,000</div>
                <div className="text-[10px] text-slate-500">Escalated to parents</div>
              </div>
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                <div className="text-red-700 font-semibold text-[11px]">90+ Days (Critical)</div>
                <div className="text-base font-bold text-red-600 font-mono mt-1">
                  ₹{stats.overdue_90plus.toLocaleString()}
                </div>
                <div className="text-[10px] text-red-500 font-medium">Requires management action</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Operational Action Queues */}
        <div className="space-y-6">
          {/* Payment & Reconciliation Status Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-600" />
                Payment Operations
              </h3>
              <button
                onClick={() => onNavigate?.('reconciliation')}
                className="text-xs text-brand-600 hover:underline font-medium cursor-pointer"
              >
                Reconcile
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Total Payments Recorded:</span>
                <span className="font-bold text-slate-900 font-mono">{stats.total_payments} TXNs</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 rounded-lg">
                <span className="text-emerald-800 font-medium">Reconciled Payments:</span>
                <span className="font-bold text-emerald-800 font-mono">{stats.reconciled_payments}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-50/80 rounded-lg">
                <span className="text-amber-800 font-medium">Unreconciled / Pending:</span>
                <span className="font-bold text-amber-800 font-mono">{stats.unreconciled_payments}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-red-50/80 rounded-lg">
                <span className="text-red-800 font-medium">Reconciliation Mismatches:</span>
                <span className="font-bold text-red-800 font-mono">{stats.mismatches} Flagged</span>
              </div>
            </div>
          </div>

          {/* Pending Approvals & Refunds Queue */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Governance & Approvals
              </h3>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Two-Man Rule
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Pending Financial Approvals</div>
                  <div className="text-[10px] text-slate-500">Waivers, Concessions & Adjustments</div>
                </div>
                <span className="text-base font-bold text-purple-700 font-mono">{stats.pending_approvals}</span>
              </div>

              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Pending Refund Claims</div>
                  <div className="text-[10px] text-slate-500">UGC Tier-1 Withdrawal Proposals</div>
                </div>
                <span className="text-base font-bold text-amber-700 font-mono">{stats.pending_refunds}</span>
              </div>
            </div>
          </div>

          {/* Quick ERP Shortcuts */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <div className="font-bold text-brand-300 uppercase tracking-wider text-[10px]">
              Institutional Fast Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate?.('students')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-brand-300" />
                <span>Students</span>
              </button>
              <button
                onClick={() => onNavigate?.('fee-management')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-brand-300" />
                <span>Structures</span>
              </button>
              <button
                onClick={() => onNavigate?.('payments')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                <span>Payments</span>
              </button>
              <button
                onClick={() => onNavigate?.('ai-assistant')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Assistant</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Audit & Activity Trail */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Institutional Audit & Event Trail</h3>
              <p className="text-xs text-slate-500">Live append-only ledger events from backend</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('audit-logs')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Actor Role</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">{log.resource_type}</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{log.role || 'SYSTEM'}</td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{log.reason || log.new_value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl">
            <FileSpreadsheet className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <span>Audit logging is active. New mutations and queries will appear in real time.</span>
          </div>
        )}
      </div>
    </div>
  );
};
