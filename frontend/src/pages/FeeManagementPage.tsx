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
} from 'lucide-react';

export const FeeManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'structures' | 'heads' | 'years' | 'programs' | 'categories' | 'routes'
  >('structures');
  const [structures, setStructures] = useState<FeeStructureRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedStructureId, setExpandedStructureId] = useState<string | null>(null);

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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="Fee Management & Master Configuration"
        subtitle="Versioned institutional fee structures, head priorities, academic years, and regulation rules"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Student & Fees', href: '#' },
          { label: 'Fee Management' }
        ]}
      />

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs">
        {[
          { id: 'structures', label: 'Fee Structures (4)', icon: Layers },
          { id: 'heads', label: 'Fee Heads (8 Priority Heads)', icon: Coins },
          { id: 'years', label: 'Academic Years', icon: Calendar },
          { id: 'programs', label: 'Programs (5)', icon: GraduationCap },
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
              <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>
                    <span className="font-bold">Versioned Structures:</span> All fee heads have deterministic priority allocation orders and refundability flags.
                  </span>
                </div>
                <span className="font-mono font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">
                  R23 Regulation Active
                </span>
              </div>

              {structures.map((fs) => {
                const isExpanded = expandedStructureId === fs.id;
                return (
                  <div
                    key={fs.id}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition-all"
                  >
                    {/* Structure Summary Header Bar */}
                    <div
                      onClick={() => setExpandedStructureId(isExpanded ? null : fs.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-brand-700">
                            {fs.program_code}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-slate-900 text-sm">{fs.program_name}</span>
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

                        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200">
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
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold inline-flex items-center justify-center text-[10px]">
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
                            <tfoot className="bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200">
                              <tr>
                                <td colSpan={4} className="py-2.5 px-3 text-right">
                                  Total Structure Fee Demand:
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-brand-700">
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
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Standard Institutional Fee Heads</h3>
              <p className="text-xs text-slate-500">
                Fee heads govern priority-based payment allocation order (P1 to P8) in compliance with university financial regulations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {[
                  { code: 'TUITION', name: 'Tuition Fee', priority: 'Priority 1', refundable: 'No', desc: 'Core academic instructional fee' },
                  { code: 'EXAM', name: 'Examination Fee', priority: 'Priority 2', refundable: 'No', desc: 'Mid-term and end-sem assessment charges' },
                  { code: 'LAB', name: 'Laboratory Fee', priority: 'Priority 3', refundable: 'No', desc: 'Equipment and consumable laboratory maintenance' },
                  { code: 'LIBRARY', name: 'Library & Digital Fee', priority: 'Priority 4', refundable: 'No', desc: 'Journals, IEEE digital access and book reserves' },
                  { code: 'HOSTEL', name: 'Hostel & Residence', priority: 'Priority 5', refundable: 'Partial', desc: 'Boarding, mess, and amenities' },
                  { code: 'TRANSPORT', name: 'Campus Transport', priority: 'Priority 6', refundable: 'No', desc: 'Bus route connectivity across Guntur & Vijayawada' },
                  { code: 'CAUTION', name: 'Caution Deposit', priority: 'Priority 7', refundable: '100% Refundable', desc: 'Returnable on program completion' },
                  { code: 'ONE_TIME', name: 'One-Time Charges', priority: 'Priority 8', refundable: 'No', desc: 'Admission kit, identity card, registration' },
                ].map((head, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-brand-700 text-[11px]">{head.code}</span>
                      <span className="text-[10px] bg-brand-100 text-brand-800 font-bold px-1.5 py-0.5 rounded">
                        {head.priority}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 text-xs">{head.name}</div>
                    <p className="text-[11px] text-slate-500 leading-snug">{head.desc}</p>
                    <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200 flex justify-between font-mono">
                      <span>Refund:</span>
                      <span className="font-semibold text-emerald-700">{head.refundable}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Academic Years */}
          {activeTab === 'years' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Academic Years & Calendar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-sm">AY 2026-27</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                      CURRENT ACTIVE
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">July 1, 2026 – June 30, 2027</p>
                  <div className="text-[11px] text-emerald-800 font-medium pt-2 border-t border-emerald-200">
                    28 Enrolled Students • Regulation R23
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">AY 2025-26</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium text-[10px]">
                      CONCLUDED
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">July 1, 2025 – June 30, 2026</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    Archived Ledger History
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">AY 2024-25</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium text-[10px]">
                      ARCHIVED
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">July 1, 2024 – June 30, 2025</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    Historical Financial Audits
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Programs */}
          {activeTab === 'programs' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Configured Academic Programs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  { code: 'BTECH-CSE', name: 'B.Tech Computer Science & Engineering', duration: '4 Years (8 Semesters)', fee: '₹1,78,000 / yr' },
                  { code: 'BTECH-ECE', name: 'B.Tech Electronics & Communication', duration: '4 Years (8 Semesters)', fee: '₹1,60,000 / yr' },
                  { code: 'BTECH-AIDS', name: 'B.Tech Artificial Intelligence & Data Science', duration: '4 Years (8 Semesters)', fee: '₹1,85,000 / yr' },
                  { code: 'MBA', name: 'Master of Business Administration (Finance)', duration: '2 Years (4 Semesters)', fee: '₹1,40,000 / yr' },
                  { code: 'MTECH-CSE', name: 'M.Tech Computer Science', duration: '2 Years (4 Semesters)', fee: '₹1,20,000 / yr' },
                ].map((prog, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-brand-700">{prog.code}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {prog.fee}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">{prog.name}</div>
                    <div className="text-[11px] text-slate-500">{prog.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Categories & Routes */}
          {(activeTab === 'categories' || activeTab === 'routes') && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                {activeTab === 'categories' ? 'Student Fee Categories' : 'Admission Channels & Quotas'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {activeTab === 'categories' ? (
                  <>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-brand-700">GEN</div>
                      <div className="font-semibold text-slate-900">General Merit Category</div>
                      <div className="text-[11px] text-slate-500">Standard tuition baseline</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-emerald-700">MERIT</div>
                      <div className="font-semibold text-slate-900">Merit Scholarship Category</div>
                      <div className="text-[11px] text-slate-500">Rank-based fee concessions</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-purple-700">SPORTS</div>
                      <div className="font-semibold text-slate-900">Sports & Cultural Quota</div>
                      <div className="text-[11px] text-slate-500">Athletic scholarship eligibility</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-amber-700">MGMT</div>
                      <div className="font-semibold text-slate-900">Management Category</div>
                      <div className="text-[11px] text-slate-500">Institutional quota structure</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-brand-700">EAMCET / V-SAT</div>
                      <div className="font-semibold text-slate-900">State / University Entrance</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-brand-700">JEE_MAINS</div>
                      <div className="font-semibold text-slate-900">National Entrance Merit</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-brand-700">MANAGEMENT</div>
                      <div className="font-semibold text-slate-900">Direct Institutional Admission</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-mono font-bold text-brand-700">LATERAL_ENTRY</div>
                      <div className="font-semibold text-slate-900">Polytechnic 2nd Year Diploma</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
