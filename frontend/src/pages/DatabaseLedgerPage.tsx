import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { AuditLogsPage } from './AuditLogsPage';
import {
  Database,
  Users,
  Coins,
  CreditCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ScrollText,
  Search,
  CheckCircle2,
} from 'lucide-react';

export const DatabaseLedgerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'students' | 'demands' | 'payments' | 'mismatches' | 'refunds' | 'approvals' | 'audit'
  >('students');
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [mismatches, setMismatches] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const loadLedgerData = async () => {
    setLoading(true);
    try {
      const [stData, payData, misData, refData, appData, structData] = await Promise.all([
        ApiClient.get<any[]>('/ledger/students?limit=100'),
        ApiClient.get<any[]>('/ledger/payments'),
        ApiClient.get<any[]>('/ledger/mismatches'),
        ApiClient.get<any[]>('/ledger/refunds'),
        ApiClient.get<any[]>('/ledger/approvals'),
        ApiClient.get<any[]>('/ledger/fee-structures'),
      ]);
      setStudents(stData);
      setPayments(payData);
      setMismatches(misData);
      setRefunds(refData);
      setApprovals(appData);
      setStructures(structData);
    } catch (err) {
      console.error('Failed to load database ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Institutional Financial Core & Database Ledger"
        subtitle="Authoritative inspector for all 33 relational entities stored in SQLite (agent40.db)"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Administration', href: '#' },
          { label: 'Database Ledger' }
        ]}
      />

      {/* 2. System Status Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-brand-600/30 border border-brand-500 text-brand-300">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">SQLite Core Ledger (agent40.db)</div>
            <div className="text-slate-400 font-mono text-[11px]">
              28 Students • 4 Fee Structures • 23 Payments • 3 Mismatches • 2 Refunds • 2 Approvals
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Append-Only Auditing Active
          </span>
          <button
            onClick={loadLedgerData}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Ledger Cache"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs">
        {[
          { id: 'students', label: `Students (${students.length})`, icon: Users },
          { id: 'demands', label: `Fee Structures (${structures.length})`, icon: Coins },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { id: 'mismatches', label: `Mismatches (${mismatches.length})`, icon: RefreshCw },
          { id: 'refunds', label: `Refunds (${refunds.length})`, icon: RotateCcw },
          { id: 'approvals', label: `Approvals (${approvals.length})`, icon: ShieldCheck },
          { id: 'audit', label: 'Audit Trail', icon: ScrollText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-700 bg-brand-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search for ledger tables (except audit) */}
      {activeTab !== 'audit' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search active entity records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      )}

      {/* 4. Tab Contents */}
      {loading ? (
        <LoadingState message="Querying SQLite database ledger..." />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          {/* TAB 1: Students */}
          {activeTab === 'students' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Gross Demand</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Outstanding</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {students
                    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_no.toLowerCase().includes(search.toLowerCase()))
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-700">{s.roll_no}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{s.name}</td>
                        <td className="py-2.5 px-4">{s.program_code}</td>
                        <td className="py-2.5 px-4">{s.category}</td>
                        <td className="py-2.5 px-4 font-mono">₹{s.gross_demand.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-600">₹{s.paid_amount.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-red-600">₹{s.outstanding_amount.toLocaleString()}</td>
                        <td className="py-2.5 px-4"><StatusBadge status={s.demand_status} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Fee Demands / Structures */}
          {activeTab === 'demands' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4">Regulation</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Fee Heads Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {structures.map((fs) => (
                    <tr key={fs.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-brand-700">{fs.program_code}</td>
                      <td className="py-2.5 px-4 font-mono">{fs.regulation}</td>
                      <td className="py-2.5 px-4">{fs.category}</td>
                      <td className="py-2.5 px-4">{fs.admission_route}</td>
                      <td className="py-2.5 px-4 font-mono">v{fs.version}.0</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">₹{fs.total_amount.toLocaleString()}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={fs.status} /></td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{fs.items.length} Heads (P1–P8)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Payments */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4">Student Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">UTR / TXN ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments
                    .filter((p) => p.payment_ref.toLowerCase().includes(search.toLowerCase()) || p.student_roll.toLowerCase().includes(search.toLowerCase()))
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-700">{p.payment_ref}</td>
                        <td className="py-2.5 px-4 font-mono font-bold">{p.student_roll}</td>
                        <td className="py-2.5 px-4">{p.student_name}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">₹{p.amount.toLocaleString()}</td>
                        <td className="py-2.5 px-4">{p.channel}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">{p.transaction_id}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{p.payment_date}</td>
                        <td className="py-2.5 px-4"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Mismatches */}
          {activeTab === 'mismatches' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Mismatch Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Expected</th>
                    <th className="py-3 px-4">Actual</th>
                    <th className="py-3 px-4">Variance</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {mismatches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-700">{m.mismatch_code}</td>
                      <td className="py-2.5 px-4">{m.category}</td>
                      <td className="py-2.5 px-4 font-mono">{m.transaction_ref}</td>
                      <td className="py-2.5 px-4 font-bold">{m.student_roll}</td>
                      <td className="py-2.5 px-4 font-mono">₹{m.expected_amount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-700">₹{m.actual_amount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-red-600">₹{m.variance.toLocaleString()}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: Refunds */}
          {activeTab === 'refunds' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Request Code</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Policy</th>
                    <th className="py-3 px-4">Total Paid</th>
                    <th className="py-3 px-4">Deduction</th>
                    <th className="py-3 px-4">Proposed Refund</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-purple-700">{r.request_code}</td>
                      <td className="py-2.5 px-4 font-bold">{r.student_roll} ({r.student_name})</td>
                      <td className="py-2.5 px-4">{r.policy_name}</td>
                      <td className="py-2.5 px-4 font-mono">₹{r.total_paid.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono text-amber-700">₹{r.policy_deduction.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">₹{r.proposed_refund.toLocaleString()}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: Approvals */}
          {activeTab === 'approvals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Approval Code</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {approvals.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-purple-700">{a.approval_code}</td>
                      <td className="py-2.5 px-4">{a.approval_type}</td>
                      <td className="py-2.5 px-4 font-mono">{a.entity_type}</td>
                      <td className="py-2.5 px-4">{a.requested_by}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">₹{a.requested_amount.toLocaleString()}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 7: Audit Logs */}
          {activeTab === 'audit' && <AuditLogsPage />}
        </div>
      )}
    </div>
  );
};
