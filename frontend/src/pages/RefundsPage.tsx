import React, { useEffect, useState } from 'react';
import { RefundRecord } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  RotateCcw,
  ShieldAlert,
  Search,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

export const RefundsPage: React.FC = () => {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<RefundRecord[]>('/ledger/refunds');
      setRefunds(data);
    } catch (err) {
      console.error('Failed to load refunds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filteredRefunds = refunds.filter(
    (r) =>
      r.request_code.toLowerCase().includes(search.toLowerCase()) ||
      r.student_roll.toLowerCase().includes(search.toLowerCase()) ||
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Student Refund Management & Claims"
        subtitle="UGC Tier-1 policy-governed withdrawal refunds with human authorization controls"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Finance', href: '#' },
          { label: 'Refunds' }
        ]}
      />

      {/* 2. UGC Policy & Security Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-1.5 text-xs text-blue-950">
          <div className="font-bold flex items-center gap-1.5 text-blue-900">
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
            UGC 2026 Refund Policy Matrix Active
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            • 15+ days before last date: 100% refund (less max ₹1,000 processing fee)<br />
            • Less than 15 days before: 90% refund<br />
            • Less than 15 days after: 80% refund | 15–30 days: 50% refund | &gt;30 days: 0%
          </p>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 space-y-1.5 text-xs text-purple-950">
          <div className="font-bold flex items-center gap-1.5 text-purple-900">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            Two-Man Rule Authorization Enforced
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            AI recommenders and accounts officers propose refund figures, but monetary disbursement strictly requires human approval from a designated <strong>Finance Approver</strong>.
          </p>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search refund code, student, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total Seeded Proposals: <strong className="text-slate-800">{refunds.length}</strong>
        </div>
      </div>

      {/* 4. Refunds Table */}
      {loading ? (
        <LoadingState message="Fetching refund proposals from ledger..." />
      ) : filteredRefunds.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No refund records found"
          description="No withdrawal refund claims are currently recorded."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Request Code</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Policy Applied</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Non-Refundable</th>
                  <th className="py-3 px-4 text-right">Policy Deduction</th>
                  <th className="py-3 px-4 text-right">Proposed Refund</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Withdrawal Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRefunds.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {r.request_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.student_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">Roll: {r.student_roll}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {r.policy_name}
                      <div className="text-[10px] font-mono text-slate-400">{r.withdrawal_date}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      ₹{r.total_paid.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      ₹{r.non_refundable.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700">
                      ₹{r.policy_deduction.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-xs">
                      ₹{r.proposed_refund.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase 1 Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <FileCheck2 className="w-4 h-4 text-brand-600" />
          <span>Full deterministic refund deduction engine activates in Phase 5.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">Phase 1 UI Shell Verified</span>
      </div>
    </div>
  );
};
