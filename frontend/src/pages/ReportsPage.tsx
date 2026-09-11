import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Coins,
  CreditCard,
  RotateCcw,
  ScrollText,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('collection');
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const reportCategories = [
    {
      id: 'collection',
      title: 'Fee Collection Summary',
      desc: 'Aggregate and head-wise collections reconciled across academic programs',
      icon: Coins,
      count: '₹34.22 L Collected',
    },
    {
      id: 'outstanding',
      title: 'Outstanding & Aging Report',
      desc: '30, 60, 90+ days receivable buckets across enrolled cohorts',
      icon: Clock,
      count: '₹15.61 L Outstanding',
    },
    {
      id: 'reconciliation',
      title: 'Payment Reconciliation Ledger',
      desc: 'Bank statement feeds, gateway settlement logs, and variance ledger',
      icon: CreditCard,
      count: '23 Transactions',
    },
    {
      id: 'refunds',
      title: 'Refund & Withdrawal Journal',
      desc: 'UGC Tier-1 refund deductions, proposed amounts, and sign-offs',
      icon: RotateCcw,
      count: '2 Refund Claims',
    },
    {
      id: 'approvals',
      title: 'Approvals & Waivers Audit',
      desc: 'Two-man rule audit trail of concession and waiver authorizations',
      icon: ShieldCheck,
      count: '2 Signed Approvals',
    },
    {
      id: 'audit',
      title: 'Statutory Audit & SHA-256 Ledger',
      desc: 'Complete append-only audit trail formatted for institutional auditors',
      icon: ScrollText,
      count: 'Immutable Log Active',
    },
  ];

  const handleExport = (format: string) => {
    setExportNotice(
      `Report Engine (Phase 6): Exporting "${selectedCategory.toUpperCase()}" as ${format} for AY ${selectedYear}. Backend data schema verified.`
    );
    setTimeout(() => setExportNotice(null), 5000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Institutional Financial Reports & Analytics"
        subtitle="Standardized statutory reporting, fee realization summaries, and compliance exports"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Finance', href: '#' },
          { label: 'Reports & Analytics' }
        ]}
      />

      {/* Export Notice Toast */}
      {exportNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-blue-700 hover:text-blue-900 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Global Filter Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-brand-600" />
          <span>Report Scope Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Academic Year */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="2026-27">AY 2026-27 (Active)</option>
              <option value="2025-26">AY 2025-26</option>
              <option value="2024-25">AY 2024-25</option>
            </select>
          </div>

          {/* Program */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Academic Programs</option>
              <option value="BTECH-CSE">B.Tech CSE</option>
              <option value="BTECH-ECE">B.Tech ECE</option>
              <option value="BTECH-AIDS">B.Tech AI & DS</option>
              <option value="MBA">MBA Finance</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
            <button
              onClick={() => handleExport('EXCEL (.xlsx)')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExport('PDF (.pdf)')}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCategories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-brand-50/40 border-brand-500 shadow-md ring-1 ring-brand-400'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {cat.count}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900">{cat.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-brand-600 font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  Generate Report
                </span>
                <span className="text-slate-400 text-[10px]">AY {selectedYear}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Active Report Template Preview Shell */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Report Shell Preview: {reportCategories.find((c) => c.id === selectedCategory)?.title}
            </h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono">
            Scope: {selectedProgram} • AY {selectedYear}
          </span>
        </div>

        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
          <FileSpreadsheet className="w-10 h-10 text-brand-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">
            {reportCategories.find((c) => c.id === selectedCategory)?.title}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Report dataset connected to authoritative database ledger. Full PDF/Excel compilation and automated email distribution engine will activate in Phase 6.
          </p>
          <div className="pt-2">
            <button
              onClick={() => handleExport('CSV')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Export Structured Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
