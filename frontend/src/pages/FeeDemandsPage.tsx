import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { Search, Filter, Eye, X, Copy, Check } from 'lucide-react';

interface FeeDemandItem {
  id: string;
  head_name: string;
  head_code: string;
  priority: number;
  gross_amount: number;
  scholarship: number;
  concession: number;
  waiver: number;
  net_amount: number;
  paid_amount: number;
  outstanding_amount: number;
}

interface InstallmentTranche {
  installment_number: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: string;
}

interface FeeDemandRecord {
  id: string;
  demand_code: string;
  student_id: string;
  roll_no: string;
  student_name: string;
  email: string;
  program_code: string;
  program_name: string;
  category: string;
  academic_year: string;
  semester: number;
  gross_demand: number;
  scholarship_amount: number;
  concession_amount: number;
  waiver_amount: number;
  net_demand: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  due_date: string;
  generation_date: string;
  items_count: number;
  items: FeeDemandItem[];
  installment_plan?: {
    id: string;
    plan_type: string;
    installments_count: number;
    status: string;
    installments: InstallmentTranche[];
  } | null;
}

export const FeeDemandsPage: React.FC = () => {
  const [demands, setDemands] = useState<FeeDemandRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDemand, setSelectedDemand] = useState<FeeDemandRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchDemands = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<FeeDemandRecord[]>('/ledger/fee-demands');
      setDemands(data);
    } catch (err) {
      console.error('Failed to load fee demands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter Demands
  const filteredDemands = demands.filter((d) => {
    const sl = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !sl ||
      d.roll_no.toLowerCase().includes(sl) ||
      d.student_name.toLowerCase().includes(sl) ||
      d.demand_code.toLowerCase().includes(sl) ||
      d.email.toLowerCase().includes(sl);

    const matchesProgram = selectedProgram === 'ALL' || d.program_code === selectedProgram;
    const matchesStatus = selectedStatus === 'ALL' || d.status === selectedStatus;

    return matchesSearch && matchesProgram && matchesStatus;
  });

  // Calculate Aggregates
  const totalGross = demands.reduce((acc, d) => acc + d.gross_demand, 0);
  const totalScholarships = demands.reduce(
    (acc, d) => acc + d.scholarship_amount + d.concession_amount + d.waiver_amount,
    0
  );
  const totalNet = demands.reduce((acc, d) => acc + d.net_demand, 0);
  const totalPaid = demands.reduce((acc, d) => acc + d.paid_amount, 0);
  const totalOutstanding = demands.reduce((acc, d) => acc + d.outstanding_amount, 0);

  const uniquePrograms = Array.from(new Set(demands.map((d) => d.program_code))).filter(Boolean);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Official Fee Demands & Ledger Notices"
        subtitle="Individual student fee demands, scholarship deductions, itemized priorities, and installment commitments"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Student & Fees', href: '#' },
          { label: 'Fee Demands' },
        ]}
      />

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Demands</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{demands.length}</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">2026-27 Academic Year</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Gross Value</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            ₹{(totalGross / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-slate-400">Pre-scholarship tariff</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-emerald-50/30">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Waivers & Grants</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
            ₹{(totalScholarships / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">Merit & Welfare Quota</div>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs bg-blue-50/30">
          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Collected Paid</div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono">
            ₹{(totalPaid / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-blue-600 font-semibold">
            {totalNet > 0 ? ((totalPaid / totalNet) * 100).toFixed(1) : 0}% Realization Rate
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs bg-amber-50/30">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Outstanding Dues</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1 font-mono">
            ₹{(totalOutstanding / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-amber-600 font-semibold">Pending Recovery</div>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Student ID (e.g. STU1001), Name, Demand Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Programs</option>
                {uniquePrograms.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="PENDING">PENDING</option>
            </select>

            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
              Showing {filteredDemands.length} of {demands.length} Demands
            </span>
          </div>
        </div>
      </div>

      {/* 4. Demands Table */}
      {loading ? (
        <LoadingState message="Loading official student fee demands..." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Demand Code</th>
                  <th className="py-3 px-4">Student ID / Name</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4 text-right">Gross Fee</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Net Demand</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDemands.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No fee demands matched the search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDemands.map((d) => {
                    const totalDeductions = d.scholarship_amount + d.concession_amount + d.waiver_amount;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Demand Code */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-800 text-[11px]">
                            <span>{d.demand_code}</span>
                            <button
                              onClick={() => handleCopy(d.demand_code)}
                              title="Copy demand code"
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {copiedCode === d.demand_code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Issued {d.generation_date}</span>
                        </td>

                        {/* Student ID & Name */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                              {d.roll_no}
                            </span>
                            <span className="font-semibold text-slate-900">{d.student_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{d.email}</span>
                        </td>

                        {/* Program */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{d.program_code}</div>
                          <span className="text-[10px] text-slate-400">Sem {d.semester} • {d.category}</span>
                        </td>

                        {/* Gross Fee */}
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{d.gross_demand.toLocaleString()}
                        </td>

                        {/* Deductions */}
                        <td className="py-3 px-4 text-right font-mono">
                          {totalDeductions > 0 ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                              -₹{totalDeductions.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">₹0</span>
                          )}
                        </td>

                        {/* Net Demand */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{d.net_demand.toLocaleString()}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          ₹{d.paid_amount.toLocaleString()}
                        </td>

                        {/* Outstanding Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {d.outstanding_amount > 0 ? (
                            <span className="text-amber-700">₹{d.outstanding_amount.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">₹0 (Paid)</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <StatusBadge status={d.status as any} />
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {d.due_date}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedDemand(d)}
                            className="px-2.5 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 rounded-lg flex items-center space-x-1 transition-all cursor-pointer mx-auto shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Breakdown</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Itemized Breakdown Modal */}
      {selectedDemand && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs border border-blue-200">
                    {selectedDemand.demand_code}
                  </span>
                  <StatusBadge status={selectedDemand.status as any} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDemand.student_name} ({selectedDemand.roll_no})
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDemand.program_name} • Sem {selectedDemand.semester} • Due {selectedDemand.due_date}
                </p>
              </div>

              <button
                onClick={() => setSelectedDemand(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Financial Quick Glance */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center font-mono">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Net Demand</div>
                  <div className="text-base font-bold text-slate-900">₹{selectedDemand.net_demand.toLocaleString()}</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Total Paid</div>
                  <div className="text-base font-bold text-blue-700">₹{selectedDemand.paid_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-sans">Balance Dues</div>
                  <div className={`text-base font-bold ${selectedDemand.outstanding_amount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                    ₹{selectedDemand.outstanding_amount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Itemized Fee Heads */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>8-Head Priority Waterfall Ledger</span>
                  <span className="text-[10px] text-slate-400 font-normal">P1 Priority Highest Recovery</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Head</th>
                        <th className="py-2.5 px-3 text-right">Gross</th>
                        <th className="py-2.5 px-3 text-right">Scholarship</th>
                        <th className="py-2.5 px-3 text-right">Net</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {selectedDemand.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-sans">
                            <div className="font-semibold text-slate-800">{it.head_name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">P{it.priority} • {it.head_code}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">₹{it.gross_amount.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-emerald-700">
                            {it.scholarship > 0 ? `-₹${it.scholarship.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">₹{it.net_amount.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-blue-700 font-bold">₹{it.paid_amount.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-amber-700">
                            {it.outstanding_amount > 0 ? `₹${it.outstanding_amount.toLocaleString()}` : '₹0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Installment Plan Tranches (if any) */}
              {selectedDemand.installment_plan && (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Approved Installment Schedule ({selectedDemand.installment_plan.installments_count} Tranches)</span>
                    <span className="text-xs font-mono font-bold text-brand-600">
                      Status: {selectedDemand.installment_plan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {selectedDemand.installment_plan.installments.map((tranche) => (
                      <div
                        key={tranche.installment_number}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>Tranche #{tranche.installment_number}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            tranche.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tranche.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tranche.status}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[10px]">Due: {tranche.due_date}</div>
                        <div className="font-mono font-bold text-sm text-slate-900">
                          ₹{tranche.amount_due.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">Student ID: {selectedDemand.roll_no}</span>
              <button
                onClick={() => setSelectedDemand(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
