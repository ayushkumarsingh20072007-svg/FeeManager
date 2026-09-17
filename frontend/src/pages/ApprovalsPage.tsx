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
  Clock,
  UserCheck,
  Award,
  FileCheck2,
  RefreshCw,
  X
} from 'lucide-react';

interface ExamPermissionItem {
  id: string;
  approval_code: string;
  student_id: string;
  student_roll: string;
  student_name: string;
  program: string;
  semester: number;
  outstanding_amount: number;
  reason_category: string;
  reason: string;
  commitment_date?: string | null;
  status: string;
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  valid_until?: string | null;
  counsellor_remarks?: string | null;
}

interface ApprovalsPageProps {
  initialTab?: 'counsellor-desk' | 'financial-approvals';
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({
  initialTab = 'counsellor-desk',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'counsellor-desk' | 'financial-approvals'>(initialTab);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [examPermissions, setExamPermissions] = useState<ExamPermissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState<ExamPermissionItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComments, setReviewComments] = useState<string>('');
  const [reviewValidity, setReviewValidity] = useState<string>('2026-06-30');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Financial Approvals
      try {
        const financialData = await ApiClient.get<ApprovalRecord[]>('/ledger/approvals');
        setApprovals(financialData || []);
      } catch (fErr) {
        console.warn('Could not load financial approvals:', fErr);
      }

      // 2. Fetch Counsellor Exam Permissions
      try {
        const examPermData = await ApiClient.get<ExamPermissionItem[]>('/integrations/exam-permissions');
        setExamPermissions(examPermData || []);
      } catch (eErr) {
        console.warn('Could not load exam permissions:', eErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  const openReviewModal = (item: ExamPermissionItem, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(item);
    setReviewAction(action);
    setReviewComments(
      action === 'APPROVED'
        ? 'Verified document proof & student undertaking. Granted special examination admission.'
        : 'Exemption cannot be granted. Please clear minimum 50% of outstanding fee to be considered.'
    );
    setReviewValidity('2026-06-30');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setReviewSubmitting(true);
    try {
      await ApiClient.post(`/integrations/exam-permissions/${selectedRequest.id}/review`, {
        action: reviewAction,
        comments: reviewComments,
        valid_until: reviewAction === 'APPROVED' ? reviewValidity : undefined,
      });

      setActionNotice(
        `Exam Permission Request ${selectedRequest.approval_code} for ${selectedRequest.student_name} (${selectedRequest.student_roll}) was successfully ${reviewAction.toLowerCase()}!`
      );
      setSelectedRequest(null);
      fetchAllData();
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: any) {
      alert(`Review action failed: ${err.message || 'Error occurred'}`);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Metrics for Counsellor Desk
  const pendingCount = examPermissions.filter((p) => p.status === 'PENDING').length;
  const approvedCount = examPermissions.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = examPermissions.filter((p) => p.status === 'REJECTED').length;
  const totalAtRisk = examPermissions.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Authorizations & Counsellor Permission Desk"
        subtitle="Autonomous governance, multi-level financial approvals, and Academic Counsellor Exam Clearances"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Finance', href: '#' },
          { label: 'Approvals & Counsellor Desk' }
        ]}
      />

      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('counsellor-desk')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'counsellor-desk'
              ? 'bg-gradient-to-r from-red-600 to-indigo-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>🎓 Counsellor Desk — Exam Clearances</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
              {pendingCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('financial-approvals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'financial-approvals'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>💼 Financial Waivers & Concessions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
            {approvals.length}
          </span>
        </button>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: COUNSELLOR / EXAM CLEARANCE DESK
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'counsellor-desk' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pending Counsellor Review
              </span>
              <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                {pendingCount}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Requires immediate clearance</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Special Permits Approved
              </span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                {approvedCount}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Hall Tickets Unlocked</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Overdue Under Undertaking
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {fmt(totalAtRisk)}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Guaranteed by commitments</span>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Rejected Appeals
              </span>
              <div className="text-2xl font-black text-red-600 font-mono mt-1">
                {rejectedCount}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Mandated for payment</span>
            </div>
          </div>

          {/* Counsellor Policy Guidance Banner */}
          <div className="bg-gradient-to-r from-red-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center space-x-2 text-red-300 font-bold text-xs">
              <Award className="w-4 h-4 text-red-400" />
              <span>OFFICIAL ACADEMIC COUNSELLOR & CONTROLLER OF EXAMINATIONS PROTOCOL</span>
            </div>
            <h3 className="text-base font-bold text-white">
              "NO GENUINE CANDIDATE DEBARRED — SPECIAL ENTRY WITH PAYMENT UNDERTAKING"
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Students facing temporary banking delays (e.g. <strong>SBI/Canara Education Loans</strong>), farmer crop proceeds, or family emergency can be issued a <strong>Counsellor Endorsed Hall Ticket</strong>. Outstanding dues must be settled prior to semester grade sheet issuance.
            </p>
          </div>

          {/* Requests Table */}
          {loading ? (
            <LoadingState message="Loading Counsellor exam permission queue..." />
          ) : examPermissions.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No exam permission requests pending"
              description="All students either have zero dues or have not submitted special appeals."
            />
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-bold text-slate-900">Student Exam Permission Appeals</h3>
                </div>
                <button
                  onClick={fetchAllData}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 text-slate-600 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Queue
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Ref Code</th>
                      <th className="py-3 px-4">Student & Roll No</th>
                      <th className="py-3 px-4">Program & Sem</th>
                      <th className="py-3 px-4 text-right">Overdue Dues</th>
                      <th className="py-3 px-4">Reason Category</th>
                      <th className="py-3 px-4">Commitment Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {examPermissions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-red-700">
                          {item.approval_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.student_name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.student_roll}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{item.program}</div>
                          <div className="text-[10px] text-slate-500">Semester {item.semester}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-600 text-xs">
                          {fmt(item.outstanding_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {item.reason_category.replace(/_/g, ' ')}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1 max-w-xs truncate" title={item.reason}>
                            "{item.reason}"
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                          {item.commitment_date || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {item.status}
                          </span>
                          {item.counsellor_remarks && (
                            <div className="text-[9px] text-slate-500 mt-1 max-w-[140px] truncate" title={item.counsellor_remarks}>
                              {item.counsellor_remarks}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.status === 'PENDING' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openReviewModal(item, 'APPROVED')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => openReviewModal(item, 'REJECTED')}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              {item.reviewed_by ? `By ${item.reviewed_by}` : 'Reviewed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: FINANCIAL APPROVALS (REFUNDS & WAIVERS)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'financial-approvals' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>INSTITUTIONAL TWO-MAN RULE GOVERNANCE</span>
            </div>
            <h3 className="text-base font-bold text-white">
              "AI RECOMMENDS. RULES CALCULATE. HUMANS AUTHORIZE. SYSTEM AUDITS."
            </h3>
            <p className="text-xs text-purple-200/80 leading-relaxed max-w-3xl">
              The autonomous system is forbidden from directly altering ledger balances or disbursing funds without explicit sign-off from a designated <strong>Finance Approver</strong> or <strong>Management Director</strong>.
            </p>
          </div>

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
                        <td className="py-3 px-4 max-w-xs truncate" title={a.reason}>
                          {a.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-5 text-white flex items-center justify-between ${
              reviewAction === 'APPROVED'
                ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
                : 'bg-gradient-to-r from-red-800 to-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                {reviewAction === 'APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-300" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {reviewAction === 'APPROVED' ? 'Grant Special Exam Permission' : 'Reject Permission Request'}
                  </h3>
                  <p className="text-[10px] text-white/80">
                    Ref: {selectedRequest.approval_code} • {selectedRequest.student_name} ({selectedRequest.student_roll})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/40 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4 text-xs">
              {/* Student Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Student Name:</span>
                  <strong className="text-slate-900">{selectedRequest.student_name}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Program / Branch:</span>
                  <strong className="text-slate-900">{selectedRequest.program} (Sem {selectedRequest.semester})</strong>
                </div>
                <div className="flex justify-between text-red-700 font-semibold pt-1 border-t border-slate-200">
                  <span>Outstanding Fee Amount:</span>
                  <strong className="font-mono text-sm">{fmt(selectedRequest.outstanding_amount)}</strong>
                </div>
                <div className="text-slate-600 pt-1">
                  <span>Student Stated Reason:</span>
                  <p className="italic text-slate-800 mt-0.5 font-medium">"{selectedRequest.reason}"</p>
                </div>
              </div>

              {/* Action Toggle */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Authorization Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVED')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      reviewAction === 'APPROVED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Grant Exam Permission
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECTED')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      reviewAction === 'REJECTED'
                        ? 'border-red-600 bg-red-50 text-red-800 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Reject Appeal
                  </button>
                </div>
              </div>

              {/* Validity Date (Only for Approval) */}
              {reviewAction === 'APPROVED' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Exemption Valid Until
                  </label>
                  <input
                    type="date"
                    required
                    value={reviewValidity}
                    onChange={(e) => setReviewValidity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Student's Hall Ticket will be active until this date.
                  </p>
                </div>
              )}

              {/* Counsellor Remarks */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Official Counsellor Remarks & Endorsement Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Enter endorsement details or rejection justification..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`px-5 py-2 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                    reviewAction === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {reviewSubmitting
                    ? 'Recording Authorization...'
                    : reviewAction === 'APPROVED'
                    ? 'Confirm & Authorize Special Entry'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
