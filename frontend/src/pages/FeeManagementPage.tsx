import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import {
  Calculator,
  FileSpreadsheet,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';

interface StudentBrief {
  id: string;
  roll_no: string;
  name: string;
  email: string;
  program_code: string;
  category: string;
  admission_route: string;
}

interface FeeItemPreview {
  head_id: string;
  head_code: string;
  head_name: string;
  priority: number;
  gross_amount: number;
  scholarship_deduction: number;
  concession_deduction: number;
  waiver_deduction: number;
  net_amount: number;
  is_refundable: boolean;
}

interface CalculationPreviewResult {
  student_id: string;
  student_roll: string;
  student_name: string;
  program_code: string;
  academic_year: string;
  regulation: string;
  category: string;
  gross_demand: number;
  total_scholarship: number;
  total_concession: number;
  total_waiver: number;
  net_demand: number;
  items: FeeItemPreview[];
  applied_rules: string[];
}

interface FeeManagementPageProps {
  onNavigate?: (tab: string) => void;
}

export const FeeManagementPage: React.FC<FeeManagementPageProps> = ({ onNavigate }) => {
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Simulator inputs
  const [scholarshipPct, setScholarshipPct] = useState<string>('75');
  const [concessionFlat, setConcessionFlat] = useState<string>('0');
  const [waiverFlat, setWaiverFlat] = useState<string>('0');
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  // Simulation state
  const [calculating, setCalculating] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<CalculationPreviewResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Generation state
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const data = await ApiClient.get<any[]>('/ledger/students?limit=100');
      const briefList: StudentBrief[] = data.map((s) => ({
        id: s.id,
        roll_no: s.roll_no,
        name: s.name,
        email: s.email,
        program_code: s.program_code,
        category: s.category || 'General',
        admission_route: s.admission_route || 'EAMCET',
      }));
      setStudents(briefList);
      if (briefList.length > 0) {
        setSelectedStudentId(briefList[0].id);
      }
    } catch (err) {
      console.error('Failed to load students for calculator:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Run calculation simulation
  const handleCalculate = async () => {
    if (!selectedStudentId) return;
    setCalculating(true);
    setCalcError(null);
    setGenerationSuccess(null);
    try {
      const payload = {
        student_id: selectedStudentId,
        scholarship_percentage: parseFloat(scholarshipPct) || 0,
        concession_flat: parseFloat(concessionFlat) || 0,
        waiver_flat: parseFloat(waiverFlat) || 0,
      };
      const result = await ApiClient.post<CalculationPreviewResult>('/fee-demands/calculate', payload);
      setPreviewResult(result);
    } catch (err: any) {
      setCalcError(err.message || 'Fee calculation simulation failed.');
    } finally {
      setCalculating(false);
    }
  };

  // Run initial calculation when students load
  useEffect(() => {
    if (selectedStudentId) {
      handleCalculate();
    }
  }, [selectedStudentId]);

  // Generate Official Demand
  const handleGenerateOfficialDemand = async () => {
    if (!selectedStudentId || !previewResult) return;
    setGenerating(true);
    setCalcError(null);
    setGenerationSuccess(null);
    try {
      const payload = {
        student_id: selectedStudentId,
        scholarship_amount: previewResult.total_scholarship,
        scholarship_name: previewResult.total_scholarship > 0 ? 'Merit Entrance Scholarship' : undefined,
        concession_amount: previewResult.total_concession,
        concession_reason: previewResult.total_concession > 0 ? 'Special Concession' : undefined,
        waiver_amount: previewResult.total_waiver,
        waiver_reason: previewResult.total_waiver > 0 ? 'Special Fee Waiver' : undefined,
      };
      const resp = await ApiClient.post<any>('/fee-demands/generate', payload);
      setGenerationSuccess(
        `Official Fee Demand ${resp.demand_code || 'FEE-DEMAND'} committed to ledger with Net Amount ₹${resp.net_demand?.toLocaleString()}!`
      );
    } catch (err: any) {
      setCalcError(err.message || 'Demand generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Fee Management & Calculation Engine"
        subtitle="Operational fee assessment, deterministic scholarship deduction simulator, and official demand generation"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Student & Fees', href: '#' },
          { label: 'Fee Management' },
        ]}
      />

      {/* 2. Segregated Navigation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-4 rounded-2xl shadow-md space-y-2 border border-blue-600">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <Calculator className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/40 px-2 py-0.5 rounded text-blue-100">
              Active View
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm">Fee Management Hub</h3>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              Real-time fee simulator, scholarship rules, and official demand generation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('fee-demands')}
          className="bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs space-y-2 text-left transition-all hover:border-brand-400 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <span className="text-xs text-slate-400 group-hover:text-brand-600 flex items-center gap-1 font-semibold">
              Go to View <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Fee Demands (200)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspect all generated student ledger demand notices, status, and installment plans.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('fee-structures')}
          className="bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs space-y-2 text-left transition-all hover:border-brand-400 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-xs text-slate-400 group-hover:text-brand-600 flex items-center gap-1 font-semibold">
              Go to View <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Fee Structures (22)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Master catalog of versioned degree fee structures, 8 fee heads, and admission quotas.
            </p>
          </div>
        </button>
      </div>

      {/* 3. Interactive Calculation & Assessment Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Parameters Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-brand-600" />
                  Fee Assessment Simulator
                </h3>
                <p className="text-xs text-slate-500">
                  Select student to simulate priority head deductions and installments.
                </p>
              </div>
            </div>

            {/* Student Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Student Profile
              </label>
              {loadingStudents ? (
                <div className="text-xs text-slate-400 py-2">Loading students registry...</div>
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.roll_no} - {s.name} ({s.program_code})
                    </option>
                  ))}
                </select>
              )}

              {selectedStudent && (
                <div className="mt-2 bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-900 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold">{selectedStudent.name}</span>
                    <span className="font-mono font-bold text-blue-700">{selectedStudent.roll_no}</span>
                  </div>
                  <div className="text-[11px] text-blue-700 flex items-center gap-2">
                    <span>Program: <strong>{selectedStudent.program_code}</strong></span>
                    <span>•</span>
                    <span>Quota: <strong>{selectedStudent.category}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Deduction Sliders & Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Tuition Scholarship (%):</span>
                <span className="font-mono font-bold text-sm text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {scholarshipPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={scholarshipPct}
                onChange={(e) => setScholarshipPct(e.target.value)}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (No Grant)</span>
                <span>25% (Tier 3)</span>
                <span>50% (Tier 2)</span>
                <span>75% (JEE Merit)</span>
                <span>100% (Full)</span>
              </div>
            </div>

            {/* Flat Concession & Flat Waiver Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Concession (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={concessionFlat}
                  onChange={(e) => setConcessionFlat(e.target.value)}
                  placeholder="0"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Special Waiver (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={waiverFlat}
                  onChange={(e) => setWaiverFlat(e.target.value)}
                  placeholder="0"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Tranche Count */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Installment Tranches Partition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setInstallmentCount(count)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      installmentCount === count
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {count} {count === 1 ? 'Full Pay' : 'Tranches'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleCalculate}
                disabled={calculating}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Deterministic Rules...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-Calculate Fee Assessment</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGenerateOfficialDemand}
                disabled={generating || !previewResult}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing Demand to Ledger...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Generate & Commit Official Demand</span>
                  </>
                )}
              </button>
            </div>

            {calcError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{calcError}</span>
              </div>
            )}

            {generationSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{generationSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Calculation Breakdown (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {previewResult ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              {/* Result Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      {previewResult.student_roll}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{previewResult.student_name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {previewResult.program_code} • AY {previewResult.academic_year} • Reg {previewResult.regulation}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-sans">
                    Net Payable Demand
                  </div>
                  <div className="text-2xl font-black text-brand-700">
                    ₹{previewResult.net_demand.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Financial Aggregate Metric Cards */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Gross</div>
                  <div className="text-sm font-bold text-slate-800">₹{previewResult.gross_demand.toLocaleString()}</div>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 uppercase font-sans font-semibold">Scholarship</div>
                  <div className="text-sm font-bold text-emerald-700">-₹{previewResult.total_scholarship.toLocaleString()}</div>
                </div>
                <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                  <div className="text-[10px] text-blue-800 uppercase font-sans font-semibold">Concession</div>
                  <div className="text-sm font-bold text-blue-700">-₹{previewResult.total_concession.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200">
                  <div className="text-[10px] text-purple-800 uppercase font-sans font-semibold">Waivers</div>
                  <div className="text-sm font-bold text-purple-700">-₹{previewResult.total_waiver.toLocaleString()}</div>
                </div>
              </div>

              {/* Head-by-Head Priority Waterfall Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>8-Head Priority Deductions Breakdown</span>
                  <span className="text-[10px] text-slate-400 font-normal">Deterministic Rule Application</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Head</th>
                        <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                        <th className="py-2.5 px-3 text-right">Deductions</th>
                        <th className="py-2.5 px-3 text-right">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {previewResult.items.map((it) => {
                        const totalDeduction =
                          it.scholarship_deduction + it.concession_deduction + it.waiver_deduction;
                        return (
                          <tr key={it.head_id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-sans">
                              <div className="font-semibold text-slate-800">{it.head_name}</div>
                              <span className="text-[10px] text-slate-400 font-mono">P{it.priority} • {it.head_code}</span>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">₹{it.gross_amount.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                              {totalDeduction > 0 ? `-₹${totalDeduction.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ₹{it.net_amount.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-mono">
                      <tr>
                        <td className="py-2.5 px-3 font-sans">Total Net Demand:</td>
                        <td className="py-2.5 px-3 text-right">₹{previewResult.gross_demand.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">
                          -₹{(previewResult.total_scholarship + previewResult.total_concession + previewResult.total_waiver).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-brand-700 text-sm">
                          ₹{previewResult.net_demand.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Installment Tranches Partition Preview */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Simulated {installmentCount}-Tranche Installment Schedule</span>
                  <span className="text-[10px] text-slate-400 font-mono">Exact penny partition</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {Array.from({ length: installmentCount }).map((_, idx) => {
                    const baseAmount = Math.floor(previewResult.net_demand / installmentCount);
                    const remainder = previewResult.net_demand - baseAmount * installmentCount;
                    const trancheAmount = idx === 0 ? baseAmount + remainder : baseAmount;
                    const dueDates = ['2026-08-15', '2026-11-15', '2027-02-15'];

                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>Tranche #{idx + 1}</span>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {idx === 0 ? 'Due at Registration' : 'Term Installment'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Due: {dueDates[idx]}</div>
                        <div className="font-mono font-bold text-base text-slate-900">
                          ₹{trancheAmount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              Select student parameters and click "Calculate Fee Assessment" to generate live simulation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
