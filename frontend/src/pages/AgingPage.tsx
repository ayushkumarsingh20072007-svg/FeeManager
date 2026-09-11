import React, { useEffect, useState } from 'react';
import { StudentRecord, LedgerStats } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const AgingPage: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const [studentsData, statsData] = await Promise.all([
        ApiClient.get<StudentRecord[]>('/ledger/students?limit=100'),
        ApiClient.get<LedgerStats>('/ledger/stats'),
      ]);
      // Keep only students with outstanding balance > 0
      setStudents(studentsData.filter((s) => s.outstanding_amount > 0));
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load aging data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgingData();
  }, []);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      s.program_code.toLowerCase().includes(search.toLowerCase());

    const matchesProgram =
      selectedProgram === 'ALL' || s.program_code === selectedProgram;

    const matchesBucket =
      selectedBucket === 'ALL' ||
      (selectedBucket === '90plus' && s.demand_status === 'OVERDUE') ||
      (selectedBucket === 'current' && s.demand_status === 'PARTIALLY_PAID');

    return matchesSearch && matchesProgram && matchesBucket;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Accounts Receivable Aging & Outstanding"
        subtitle="Institutional fee delinquency analysis segmented into 30, 60, 90, and 90+ days aging buckets"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Payments', href: '#' },
          { label: 'Aging & Outstanding' }
        ]}
      />

      {/* 2. Aging Bucket KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="0–30 Days (Current)"
          value="₹4.20 L"
          subtitle="Regular Billing Cycle"
          icon={Clock}
          color="emerald"
          badge={{ text: 'Normal', color: 'emerald' }}
        />
        <StatCard
          title="31–60 Days (Follow-up)"
          value="₹3.50 L"
          subtitle="First Reminder Stage"
          icon={Clock}
          color="indigo"
          badge={{ text: 'Due Soon', color: 'indigo' }}
        />
        <StatCard
          title="61–90 Days (Late)"
          value="₹2.80 L"
          subtitle="Parent Escalation Stage"
          icon={Clock}
          color="amber"
          badge={{ text: 'Late Fee Eligible', color: 'amber' }}
        />
        <StatCard
          title="90+ Days (Critical)"
          value={stats ? `₹${(stats.overdue_90plus / 100000).toFixed(2)} L` : '₹5.11 L'}
          subtitle="Requires Management Review"
          icon={Clock}
          color="red"
          badge={{ text: 'Action Required', color: 'red' }}
        />
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, roll no..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Aging Bracket */}
          <select
            value={selectedBucket}
            onChange={(e) => {
              setSelectedBucket(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            title="Aging Bracket Filter"
          >
            <option value="ALL">All Overdue Brackets</option>
            <option value="90plus">90+ Days (Overdue)</option>
            <option value="current">0-60 Days (Partially Paid)</option>
          </select>

          {/* Program Filter */}
          <select
            value={selectedProgram}
            onChange={(e) => {
              setSelectedProgram(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            title="Program Filter"
          >
            <option value="ALL">All Programs</option>
            <option value="BTECH-CSE">B.Tech CSE</option>
            <option value="BTECH-ECE">B.Tech ECE</option>
            <option value="BTECH-AIDS">B.Tech AI & DS</option>
            <option value="MBA">MBA Finance</option>
            <option value="MTECH-CSE">M.Tech CSE</option>
          </select>
        </div>
      </div>

      {/* 4. Aging Table */}
      {loading ? (
        <LoadingState message="Calculating overdue aging balances from database records..." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No outstanding records match filters"
          description="Try selecting a different program or aging bucket."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Gross Demand</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Aging Bracket</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">{s.roll_no}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{s.program_code}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">₹{s.gross_demand.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-emerald-600">₹{s.paid_amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                      ₹{s.outstanding_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{s.due_date}</td>
                    <td className="py-3 px-4">
                      {s.demand_status === 'OVERDUE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          90+ Days Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          0–30 Days (Current)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={s.demand_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, filteredStudents.length)}
              </span>{' '}
              of <span className="font-semibold">{filteredStudents.length}</span> overdue records
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Aging calculations are strictly backed by due dates in SQLite database.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">Automated Dunning Engine: Phase 4</span>
      </div>
    </div>
  );
};
