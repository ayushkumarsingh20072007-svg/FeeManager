import React, { useEffect, useState } from 'react';
import { FeeStructureRecord } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import {
  Layers,
  Coins,
  Calendar,
  GraduationCap,
  Tag,
  Route,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';

export const FeeStructuresPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'structures' | 'heads' | 'years' | 'programs' | 'categories' | 'routes'
  >('structures');
  const [structures, setStructures] = useState<FeeStructureRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedStructureId, setExpandedStructureId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('ALL');

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<FeeStructureRecord[]>('/ledger/fee-structures');
      setStructures(data);
      if (data.length > 0) {
        setExpandedStructureId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load fee structures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  const filteredStructures = structures.filter((fs) => {
    const matchesSearch =
      fs.program_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fs.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fs.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = selectedProgram === 'ALL' || fs.program_code === selectedProgram;
    return matchesSearch && matchesProgram;
  });

  const uniquePrograms = Array.from(new Set(structures.map((s) => s.program_code)));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Fee Structures & Master Catalogs"
        subtitle="Versioned institutional fee structures, head priorities, academic regulations, and tuition catalogs"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Student & Fees', href: '#' },
          { label: 'Fee Structures' },
        ]}
      />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-bold font-mono">
              MASTER CATALOGUE
            </span>
            <span className="text-xs text-blue-200 font-medium">UGC & AICTE Approved R23 Regulation</span>
          </div>
          <h2 className="text-lg font-bold">22 Versioned Program Fee Structures</h2>
          <p className="text-xs text-blue-200/80">
            Pre-defined itemized fee heads with deterministic priority rankings (P1 to P8) and clear refundability terms.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Priority Allocation Enforced</span>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs">
        {[
          { id: 'structures', label: `Fee Structures (${structures.length})`, icon: Layers },
          { id: 'heads', label: 'Priority Fee Heads (8 Heads)', icon: Coins },
          { id: 'years', label: 'Academic Years (3 Years)', icon: Calendar },
          { id: 'programs', label: 'Academic Programs (11)', icon: GraduationCap },
          { id: 'categories', label: 'Student Categories', icon: Tag },
          { id: 'routes', label: 'Admission Routes', icon: Route },
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

      {/* 3. Tab Content */}
      {loading ? (
        <LoadingState message="Loading fee structures and master configuration..." />
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Fee Structures */}
          {activeTab === 'structures' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by program, name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-brand-500"
                  >
                    <option value="ALL">All Academic Programs</option>
                    {uniquePrograms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    Showing {filteredStructures.length} / {structures.length}
                  </span>
                </div>
              </div>

              {filteredStructures.map((fs) => {
                const isExpanded = expandedStructureId === fs.id;
                return (
                  <div
                    key={fs.id}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-brand-300 transition-all"
                  >
                    {/* Structure Summary Header Bar */}
                    <div
                      onClick={() => setExpandedStructureId(isExpanded ? null : fs.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            {fs.program_code}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-900 text-sm">{fs.program_name}</span>
                          <span className="text-[10px] bg-slate-100 font-mono px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                            v{fs.version}.0
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>AY: <strong className="text-slate-700">{fs.academic_year}</strong></span>
                          <span>•</span>
                          <span>Reg: <strong className="text-slate-700">{fs.regulation}</strong></span>
                          <span>•</span>
                          <span>Category: <strong className="text-slate-700">{fs.category}</strong></span>
                          <span>•</span>
                          <span>Route: <strong className="text-slate-700">{fs.admission_route}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            Total Annual Fee
                          </div>
                          <div className="text-base font-bold font-mono text-slate-900">
                            ₹{fs.total_amount.toLocaleString()}
                          </div>
                        </div>

                        <StatusBadge status={fs.status} />

                        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Fee Head Items Breakdown */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Itemized Fee Heads Breakdown & Priority Allocation Chain</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Effective: {fs.effective_from} to {fs.effective_to || 'Ongoing'}
                          </span>
                        </div>

                        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Priority</th>
                                <th className="py-2.5 px-3">Head Code</th>
                                <th className="py-2.5 px-3">Fee Head Name</th>
                                <th className="py-2.5 px-3">Refundable</th>
                                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {fs.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/60">
                                  <td className="py-2 px-3">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold inline-flex items-center justify-center text-[10px]">
                                      P{item.priority}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold text-slate-800">{item.head_code}</td>
                                  <td className="py-2 px-3 font-medium text-slate-900">{item.head_name}</td>
                                  <td className="py-2 px-3">
                                    {item.is_refundable ? (
                                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                                        Yes (Caution/Hostel)
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">Non-Refundable</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    ₹{item.amount.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                              <tr>
                                <td colSpan={4} className="py-2.5 px-3 text-right">
                                  Total Gross Structure Amount:
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-sm text-brand-700">
                                  ₹{fs.total_amount.toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Fee Heads */}
          {activeTab === 'heads' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Standard 8 Institutional Fee Heads</h3>
                <p className="text-xs text-slate-500">
                  Defines the deterministic waterfall sequence (P1 through P8) for partial allocation and recovery.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { priority: 'P1', code: 'TUITION', name: 'Tuition Fee', desc: 'Core academic instruction; primary recipient of merit scholarships', refundable: false },
                  { priority: 'P2', code: 'DEV_FEE', name: 'Development Fee', desc: 'Infrastructure, computing lab expansion & campus facilities', refundable: false },
                  { priority: 'P3', code: 'EXAM_FEE', name: 'Examination Fee', desc: 'Continuous evaluation, semester exams, grade card printing', refundable: false },
                  { priority: 'P4', code: 'LAB_LIB', name: 'Lab & Library Fee', desc: 'High-tech lab consumables, journal subscriptions, digital portal', refundable: false },
                  { priority: 'P5', code: 'SPORTS_CULT', name: 'Sports & Cultural Fee', desc: 'Annual sports festival, intra-university clubs, gym facilities', refundable: false },
                  { priority: 'P6', code: 'HOSTEL_BUS', name: 'Hostel & Transport Fee', desc: 'Residential accommodation, meal plan, route transportation', refundable: false },
                  { priority: 'P7', code: 'MED_INS', name: 'Medical & Group Insurance', desc: 'Comprehensive student health coverage and campus clinic', refundable: false },
                  { priority: 'P8', code: 'CAUTION_DEP', name: 'Caution Deposit', desc: 'Mandatory security deposit; 100% refundable upon graduation/clearance', refundable: true },
                ].map((head) => (
                  <div key={head.code} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold inline-flex items-center justify-center text-xs">
                        {head.priority}
                      </span>
                      {head.refundable ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                          100% Refundable
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded">
                          Non-Refundable
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{head.name}</div>
                    <div className="font-mono text-xs text-brand-700 font-semibold">{head.code}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{head.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Academic Years */}
          {activeTab === 'years' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Academic Years & Active Windows</h3>
                <p className="text-xs text-slate-500">Configured financial fiscal cycles and regulation mappings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { code: '2026-27', start: '2026-07-01', end: '2027-06-30', isCurrent: true, reg: 'R23 Regulation' },
                  { code: '2025-26', start: '2025-07-01', end: '2026-06-30', isCurrent: false, reg: 'R23 Regulation' },
                  { code: '2024-25', start: '2024-07-01', end: '2025-06-30', isCurrent: false, reg: 'R20 Regulation' },
                ].map((ay) => (
                  <div
                    key={ay.code}
                    className={`border rounded-xl p-4 space-y-2 ${
                      ay.isCurrent ? 'bg-blue-50/60 border-brand-400 ring-1 ring-brand-400' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-lg text-slate-900">{ay.code}</span>
                      {ay.isCurrent && (
                        <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Current Active AY
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      Duration: <strong>{ay.start}</strong> to <strong>{ay.end}</strong>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">Applied: {ay.reg}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Programs */}
          {activeTab === 'programs' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900">11 University Degree Programs</h3>
                <p className="text-xs text-slate-500">Undergraduate & Postgraduate academic programs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  { code: 'BTECH-CSE', name: 'B.Tech Computer Science & Engineering', dur: '4 Years', dept: 'CSE' },
                  { code: 'BTECH-CSE-AI', name: 'B.Tech CSE (Artificial Intelligence & ML)', dur: '4 Years', dept: 'CSE-AI' },
                  { code: 'BTECH-ECE', name: 'B.Tech Electronics & Communication Engineering', dur: '4 Years', dept: 'ECE' },
                  { code: 'BTECH-EEE', name: 'B.Tech Electrical & Electronics Engineering', dur: '4 Years', dept: 'EEE' },
                  { code: 'BTECH-MECH', name: 'B.Tech Mechanical Engineering', dur: '4 Years', dept: 'Mechanical' },
                  { code: 'BTECH-CIVIL', name: 'B.Tech Civil Engineering', dur: '4 Years', dept: 'Civil' },
                  { code: 'BTECH-IT', name: 'B.Tech Information Technology', dur: '4 Years', dept: 'IT' },
                  { code: 'BCA', name: 'Bachelor of Computer Applications', dur: '3 Years', dept: 'Computer Applications' },
                  { code: 'MTECH-CSE', name: 'M.Tech Computer Science & Engineering', dur: '2 Years', dept: 'CSE' },
                  { code: 'MBA', name: 'Master of Business Administration', dur: '2 Years', dept: 'Management' },
                  { code: 'MCA', name: 'Master of Computer Applications', dur: '2 Years', dept: 'Computer Applications' },
                ].map((prog) => (
                  <div key={prog.code} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold text-brand-700">
                      <span>{prog.code}</span>
                      <span className="text-slate-400 font-normal">{prog.dur}</span>
                    </div>
                    <div className="font-semibold text-slate-900">{prog.name}</div>
                    <div className="text-slate-500 text-[11px]">Department of {prog.dept}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Categories */}
          {activeTab === 'categories' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Student Categories & Quotas</h3>
                <p className="text-xs text-slate-500">Government, Reserved, and Institutional Management categories.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-1">
                  <div className="font-bold text-slate-900">GEN (General Merit)</div>
                  <p className="text-slate-500 text-xs">Open competition merit quota based on national & state entrance exams.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-1">
                  <div className="font-bold text-slate-900">OBC / SC / ST (Social Welfare)</div>
                  <p className="text-slate-500 text-xs">Eligible for state post-matric scholarships & institutional concessions.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-amber-50/50 border-amber-200 space-y-1">
                  <div className="font-bold text-amber-900">MGMT (Management Category-B)</div>
                  <p className="text-amber-800 text-xs">Direct institutional admission with designated management fee structure.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Routes */}
          {activeTab === 'routes' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900">6 Authorized Modes of Admission</h3>
                <p className="text-xs text-slate-500">Entrance evaluation and scholarship allocation mechanisms.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {[
                  { code: 'JEE_MAINS', name: 'JEE Mains National Entrance', desc: 'Percentile-tiered automatic scholarships (up to 75% on Tuition).' },
                  { code: 'VSAT', name: 'Vignan Scholastic Aptitude Test', desc: 'University entrance exam with merit rank-based fee concessions.' },
                  { code: 'EAMCET', name: 'State CET Convener Quota', desc: 'State counseling allocated convener seats under regulated tariff.' },
                  { code: 'RESERVED_CATEGORY', name: 'Social Welfare Reserved', desc: 'SC/ST/OBC welfare fee reimbursement and special concessions.' },
                  { code: 'SPECIAL_STATE', name: 'Special State Status', desc: 'North-East states & J&K domicile special regional concessions.' },
                  { code: 'MANAGEMENT', name: 'Institutional Management', desc: 'Direct admission quota category under institutional governance.' },
                ].map((r) => (
                  <div key={r.code} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                    <div className="font-mono font-bold text-brand-700">{r.code}</div>
                    <div className="font-bold text-slate-900">{r.name}</div>
                    <p className="text-slate-500">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
