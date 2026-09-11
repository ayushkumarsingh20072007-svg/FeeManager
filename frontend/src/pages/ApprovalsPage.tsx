import React, { useEffect, useState } from 'react';
import { ApprovalRecord } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  UserCheck,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<ApprovalRecord[]>('/ledger/approvals');
      setApprovals(data);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleActionClick = (action: string, code: string) => {
    setActionNotice(
      `Governance Guardrail: ${action} for ${code} requires Phase 5 multi-signature authorization endpoint. State preserved in Phase 1 shell.`
    );
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Institutional Financial Approvals Queue"
        subtitle="Multi-level authorization workflows for concessions, scholarships, waivers, and refund disbursements"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Finance', href: '#' },
          { label: 'Approvals' }
        ]}
      />

      {/* 2. Two-Man Rule Governance Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>INSTITUTIONAL TWO-MAN RULE GOVERNANCE</span>
        </div>
        <h3 className="text-base font-bold text-white">
          "AI RECOMMENDS. RULES CALCULATE. HUMANS AUTHORIZE. SYSTEM AUDITS."
        </h3>
        <p className="text-xs text-purple-200/80 leading-relaxed max-w-3xl">
          The autonomous system is forbidden from directly altering ledger balances or disbursing funds without explicit sign-off from a designated <strong>Finance Approver (e.g. Dr. Ramanathan)</strong> or <strong>Management Director</strong>.
        </p>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Approvals Table */}
      {loading ? (
        <LoadingState message="Loading financial approval queue..." />
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Approval queue is empty"
          description="All financial approval requests have been processed."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Pending Financial Requests</h3>
            </div>
            <span className="text-xs font-mono font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg">
              {approvals.length} Requests in DB
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Approval Code</th>
                  <th className="py-3 px-4">Request Type</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Justification Reason</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {approvals.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {a.approval_code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {a.approval_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{a.entity_type}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{a.requested_by}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{a.requested_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{a.created_at}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleActionClick('Approve', a.approval_code)}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
                          title="Authorize Request (Phase 5)"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleActionClick('Reject', a.approval_code)}
                          className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
                          title="Reject Request (Phase 5)"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
