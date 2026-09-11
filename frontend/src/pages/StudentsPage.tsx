import React, { useEffect, useState } from 'react';
import { StudentRecord } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileCheck2,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<StudentRecord[]>('/ledger/students?limit=100');
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students based on search and select filters
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesProgram =
      selectedProgram === 'ALL' || s.program_code === selectedProgram;

    const matchesCategory =
      selectedCategory === 'ALL' || s.category === selectedCategory;

    return matchesSearch && matchesProgram && matchesCategory;
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
        title="Student Fee & Enrollment Registry"
        subtitle="Manage 28 institutional student cohorts, fee demands, and real-time ledger balances"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Student & Fees', href: '#' },
          { label: 'Students' }
        ]}
      />

      {/* 2. Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, roll no, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Program Filter */}
          <select
            value={selectedProgram}
            onChange={(e) => {
              setSelectedProgram(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            title="Filter by Program"
          >
            <option value="ALL">All Programs</option>
            <option value="BTECH-CSE">B.Tech CSE</option>
            <option value="BTECH-ECE">B.Tech ECE</option>
            <option value="BTECH-AIDS">B.Tech AI & DS</option>
            <option value="MBA">MBA Finance</option>
            <option value="MTECH-CSE">M.Tech CSE</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            title="Filter by Category"
          >
            <option value="ALL">All Categories</option>
            <option value="GEN">General</option>
            <option value="MERIT">Merit Scholar</option>
            <option value="SPORTS">Sports Quota</option>
            <option value="MGMT">Management</option>
          </select>
        </div>
      </div>

      {/* 3. Students Table */}
      {loading ? (
        <LoadingState message="Fetching student ledger records..." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No student records found"
          description="Try adjusting your search criteria or program filter."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Roll No / ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Gross Demand</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">{s.roll_no}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{s.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{s.program_code}</span>
                      <div className="text-[10px] text-slate-400">Sem {s.semester}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      ₹{s.gross_demand.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-600">
                      ₹{s.paid_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-red-600">
                      ₹{s.outstanding_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={s.demand_status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 transition-colors cursor-pointer font-medium text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, filteredStudents.length)}
              </span>{' '}
              of <span className="font-semibold">{filteredStudents.length}</span> students
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

      {/* 4. Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedStudent.roll_no.substring(0, 3)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Roll: {selectedStudent.roll_no} • {selectedStudent.program_name} ({selectedStudent.program_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] block">Academic Year</span>
                  <span className="font-semibold text-slate-800">{selectedStudent.academic_year}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedStudent.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Semester</span>
                  <span className="font-semibold text-slate-800">Sem {selectedStudent.semester}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Enrollment Status</span>
                  <span className="font-semibold text-emerald-600">{selectedStudent.enrollment_status}</span>
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-brand-600" />
                    Verified Fee Ledger Summary
                  </span>
                  <StatusBadge status={selectedStudent.demand_status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <div className="text-[10px] text-slate-500">Gross Demand</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5">
                      ₹{selectedStudent.gross_demand.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <div className="text-[10px] text-purple-700">Deductions</div>
                    <div className="text-xs sm:text-sm font-bold text-purple-700 font-mono mt-0.5">
                      ₹{((selectedStudent.scholarship_amount || 0) + (selectedStudent.concession_amount || 0) + (selectedStudent.waiver_amount || 0)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg">
                    <div className="text-[10px] text-emerald-700">Total Paid</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-700 font-mono mt-0.5">
                      ₹{selectedStudent.paid_amount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-lg">
                    <div className="text-[10px] text-red-700">Net Outstanding</div>
                    <div className="text-xs sm:text-sm font-bold text-red-700 font-mono mt-0.5">
                      ₹{selectedStudent.outstanding_amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {((selectedStudent.scholarship_amount || 0) > 0 || (selectedStudent.concession_amount || 0) > 0 || (selectedStudent.waiver_amount || 0) > 0) && (
                  <div className="p-2.5 bg-purple-50/50 rounded-lg border border-purple-100 flex flex-wrap gap-3 text-[11px]">
                    {(selectedStudent.scholarship_amount || 0) > 0 && (
                      <span className="text-purple-800">
                        <span className="font-semibold">Scholarship:</span> ₹{selectedStudent.scholarship_amount?.toLocaleString()}
                      </span>
                    )}
                    {(selectedStudent.concession_amount || 0) > 0 && (
                      <span className="text-purple-800">
                        <span className="font-semibold">Concession:</span> ₹{selectedStudent.concession_amount?.toLocaleString()}
                      </span>
                    )}
                    {(selectedStudent.waiver_amount || 0) > 0 && (
                      <span className="text-purple-800">
                        <span className="font-semibold">Waiver:</span> ₹{selectedStudent.waiver_amount?.toLocaleString()}
                      </span>
                    )}
                    <span className="text-slate-700 font-bold ml-auto">
                      Net Demand: ₹{(selectedStudent.net_demand ?? (selectedStudent.gross_demand - ((selectedStudent.scholarship_amount || 0) + (selectedStudent.concession_amount || 0) + (selectedStudent.waiver_amount || 0)))).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due Date: {selectedStudent.due_date}
                  </span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Authoritative Decimal Verification
                  </span>
                </div>
              </div>

              {/* Phase 1 Note */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-start space-x-2.5 text-blue-900">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold">Phase 1 Foundation Shell:</span> Student record and verified database balances loaded from authoritative seed database. Itemized fee demand adjustment engines activate in Phase 2.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Registry Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
