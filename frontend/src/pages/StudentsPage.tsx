import React, { useEffect, useState, useMemo } from 'react';
import { StudentRecord, FeeStructureRecord } from '../types';
import { ApiClient } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import {
  Users, Search, ChevronRight, Eye, X, FileCheck2,
  Calendar, CheckCircle2, AlertCircle, GraduationCap,
  BookOpen, Cpu, Zap, Wrench, Building2, Laptop,
  BarChart3, Code2, BrainCircuit, ArrowLeft,
  BadgeCheck, Layers, LayoutGrid, List, Printer, Phone, Mail,
  ShieldCheck, ShieldAlert, ArrowUpRight, Award, Target, MapPin, Sparkles,
  ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { PrintableFeeChallan } from '../components/PrintableFeeChallan';


// ─── Program metadata for all 11 programs ──────────────────────────────────────
export interface ProgramMeta {
  code: string;
  label: string;
  shortLabel: string;
  dept: string;
  level: 'UG' | 'PG';
  duration: string;
  semesters: number;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  lightBg: string;
  borderAccent: string;
  approxFeeGen: number;
  approxFeeMgmt: number;
}

export const PROGRAM_META: Record<string, ProgramMeta> = {
  'BTECH-CSE': {
    code: 'BTECH-CSE',
    label: 'B.Tech Computer Science & Engineering',
    shortLabel: 'B.Tech CSE',
    dept: 'Computer Science & Engineering',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <Code2 className="w-6 h-6" />,
    gradient: 'from-violet-600 to-indigo-600',
    accent: 'text-violet-700',
    lightBg: 'bg-violet-50 border-violet-200',
    borderAccent: 'border-violet-500',
    approxFeeGen: 178000,
    approxFeeMgmt: 248000,
  },
  'BTECH-CSE-AI': {
    code: 'BTECH-CSE-AI',
    label: 'B.Tech CSE (Artificial Intelligence & ML)',
    shortLabel: 'B.Tech CSE (AI/ML)',
    dept: 'AI & Machine Learning',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <BrainCircuit className="w-6 h-6" />,
    gradient: 'from-fuchsia-600 to-pink-600',
    accent: 'text-fuchsia-700',
    lightBg: 'bg-fuchsia-50 border-fuchsia-200',
    borderAccent: 'border-fuchsia-500',
    approxFeeGen: 189000,
    approxFeeMgmt: 259000,
  },
  'BTECH-ECE': {
    code: 'BTECH-ECE',
    label: 'B.Tech Electronics & Communication Engg',
    shortLabel: 'B.Tech ECE',
    dept: 'Electronics & Communication Engg',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <Cpu className="w-6 h-6" />,
    gradient: 'from-blue-600 to-cyan-500',
    accent: 'text-blue-700',
    lightBg: 'bg-blue-50 border-blue-200',
    borderAccent: 'border-blue-500',
    approxFeeGen: 168000,
    approxFeeMgmt: 233000,
  },
  'BTECH-EEE': {
    code: 'BTECH-EEE',
    label: 'B.Tech Electrical & Electronics Engg',
    shortLabel: 'B.Tech EEE',
    dept: 'Electrical & Electronics Engg',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-500',
    accent: 'text-amber-700',
    lightBg: 'bg-amber-50 border-amber-200',
    borderAccent: 'border-amber-500',
    approxFeeGen: 165000,
    approxFeeMgmt: 228000,
  },
  'BTECH-MECH': {
    code: 'BTECH-MECH',
    label: 'B.Tech Mechanical Engineering',
    shortLabel: 'B.Tech Mech',
    dept: 'Mechanical Engineering',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <Wrench className="w-6 h-6" />,
    gradient: 'from-slate-700 to-zinc-600',
    accent: 'text-slate-700',
    lightBg: 'bg-slate-100 border-slate-300',
    borderAccent: 'border-slate-500',
    approxFeeGen: 171000,
    approxFeeMgmt: 236000,
  },
  'BTECH-CIVIL': {
    code: 'BTECH-CIVIL',
    label: 'B.Tech Civil Engineering',
    shortLabel: 'B.Tech Civil',
    dept: 'Civil Engineering',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <Building2 className="w-6 h-6" />,
    gradient: 'from-teal-600 to-emerald-600',
    accent: 'text-teal-700',
    lightBg: 'bg-teal-50 border-teal-200',
    borderAccent: 'border-teal-500',
    approxFeeGen: 157000,
    approxFeeMgmt: 219000,
  },
  'BTECH-IT': {
    code: 'BTECH-IT',
    label: 'B.Tech Information Technology',
    shortLabel: 'B.Tech IT',
    dept: 'Information Technology',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <Laptop className="w-6 h-6" />,
    gradient: 'from-sky-600 to-blue-600',
    accent: 'text-sky-700',
    lightBg: 'bg-sky-50 border-sky-200',
    borderAccent: 'border-sky-500',
    approxFeeGen: 174000,
    approxFeeMgmt: 241000,
  },
  'BCA': {
    code: 'BCA',
    label: 'Bachelor of Computer Applications',
    shortLabel: 'BCA',
    dept: 'Computer Applications & Data Science',
    level: 'UG',
    duration: '3 Years',
    semesters: 6,
    icon: <BookOpen className="w-6 h-6" />,
    gradient: 'from-rose-500 to-pink-500',
    accent: 'text-rose-700',
    lightBg: 'bg-rose-50 border-rose-200',
    borderAccent: 'border-rose-500',
    approxFeeGen: 89500,
    approxFeeMgmt: 119500,
  },
  'MTECH-CSE': {
    code: 'MTECH-CSE',
    label: 'M.Tech Computer Science & Engineering',
    shortLabel: 'M.Tech CSE',
    dept: 'Advanced Computing & Cloud Systems',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    icon: <GraduationCap className="w-6 h-6" />,
    gradient: 'from-purple-700 to-violet-700',
    accent: 'text-purple-700',
    lightBg: 'bg-purple-50 border-purple-200',
    borderAccent: 'border-purple-500',
    approxFeeGen: 108000,
    approxFeeMgmt: 143000,
  },
  'MBA': {
    code: 'MBA',
    label: 'Master of Business Administration',
    shortLabel: 'MBA',
    dept: 'School of Management & Finance',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    icon: <BarChart3 className="w-6 h-6" />,
    gradient: 'from-emerald-600 to-teal-700',
    accent: 'text-emerald-700',
    lightBg: 'bg-emerald-50 border-emerald-200',
    borderAccent: 'border-emerald-500',
    approxFeeGen: 112000,
    approxFeeMgmt: 147000,
  },
  'MCA': {
    code: 'MCA',
    label: 'Master of Computer Applications',
    shortLabel: 'MCA',
    dept: 'Computer Applications & Software Engg',
    level: 'PG',
    duration: '2 Years',
    semesters: 4,
    icon: <Cpu className="w-6 h-6" />,
    gradient: 'from-indigo-600 to-cyan-600',
    accent: 'text-indigo-700',
    lightBg: 'bg-indigo-50 border-indigo-200',
    borderAccent: 'border-indigo-500',
    approxFeeGen: 95000,
    approxFeeMgmt: 127000,
  },
};

export const PROGRAM_ORDER = [
  'BTECH-CSE',
  'BTECH-CSE-AI',
  'BTECH-ECE',
  'BTECH-EEE',
  'BTECH-MECH',
  'BTECH-CIVIL',
  'BTECH-IT',
  'BCA',
  'MTECH-CSE',
  'MBA',
  'MCA',
];

// ─── Admission Modes Definition & Policies ────────────────────────────────────
export interface AdmissionRouteDef {
  code: string;
  name: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  policySummary: string;
  icon: React.ElementType;
}

export const ADMISSION_MODES: Record<string, AdmissionRouteDef> = {
  'JEE_MAINS': {
    code: 'JEE_MAINS',
    name: 'JEE Mains (National Entrance)',
    shortLabel: 'JEE Mains',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-700',
    policySummary: 'Percentile-Tiered Scholarship: ≥98%ile (100% waiver), ≥95%ile (75% waiver), ≥90%ile (50% waiver), ≥85%ile (25% waiver)',
    icon: Award,
  },
  'VSAT': {
    code: 'VSAT',
    name: 'V-SAT (University Aptitude Test)',
    shortLabel: 'V-SAT',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
    policySummary: 'University Merit Ranks: Rank 1–100 (50% Tuition Scholarship), Rank 101–500 (25% Tuition Scholarship)',
    icon: Target,
  },
  'RESERVED_CATEGORY': {
    code: 'RESERVED_CATEGORY',
    name: 'Lower Caste / Reserved Category',
    shortLabel: 'Reserved Welfare',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    policySummary: 'Government Post-Matric Fee Reimbursement: 75% for SC/ST, 35% for OBC students by Social Welfare Directorate',
    icon: ShieldCheck,
  },
  'SPECIAL_STATE': {
    code: 'SPECIAL_STATE',
    name: 'Special State Status Quota',
    shortLabel: 'Special State',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    policySummary: 'North-East States & J&K / Ladakh Domicile affirmative quota: 40% Institutional Tuition Concession',
    icon: MapPin,
  },
  'EAMCET': {
    code: 'EAMCET',
    name: 'State CET / EAMCET Convener',
    shortLabel: 'EAMCET',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-700',
    policySummary: 'State Government Regulated Convener Quota baseline fee schedule approved by State Higher Education Council',
    icon: CheckCircle2,
  },
  'MANAGEMENT': {
    code: 'MANAGEMENT',
    name: 'Management Category B',
    shortLabel: 'Management',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-700',
    policySummary: 'Direct Institutional Management quota standard fee schedule',
    icon: Building2,
  },
};

const CAT_COLORS: Record<string, string> = {
  GEN:  'bg-blue-100 text-blue-800 border-blue-200',
  OBC:  'bg-amber-100 text-amber-800 border-amber-200',
  SC:   'bg-rose-100 text-rose-800 border-rose-200',
  ST:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  MGMT: 'bg-purple-100 text-purple-800 border-purple-200',
};

const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// ─── Main Component ───────────────────────────────────────────────────────────
export const StudentsPage: React.FC = () => {
  const [students, setStudents]                 = useState<StudentRecord[]>([]);
  const [feeStructures, setFeeStructures]       = useState<FeeStructureRecord[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [activeProgram, setActiveProgram]       = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent]   = useState<StudentRecord | null>(null);
  const [programFilter, setProgramFilter]       = useState<'ALL' | 'UG' | 'PG'>('ALL');
  const [programSearch, setProgramSearch]       = useState('');
  const [studentSearch, setStudentSearch]       = useState('');
  const [routeFilter, setRouteFilter]           = useState('ALL');
  const [catFilter, setCatFilter]               = useState('ALL');
  const [statusFilter, setStatusFilter]         = useState('ALL');
  const [viewMode, setViewMode]                 = useState<'grid' | 'table'>('grid');
  const [page, setPage]                         = useState(1);
  const [feeCatTab, setFeeCatTab]               = useState<'GEN' | 'MGMT' | 'SC'>('GEN');
  const [showPolicyGuide, setShowPolicyGuide]   = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    Promise.all([
      ApiClient.get<StudentRecord[]>('/ledger/students?limit=300'),
      ApiClient.get<FeeStructureRecord[]>('/ledger/fee-structures').catch(() => [] as FeeStructureRecord[]),
    ])
      .then(([studentsData, structuresData]) => {
        setStudents(studentsData || []);
        setFeeStructures(structuresData || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group students by program code
  const byProgram = useMemo(() => {
    const map: Record<string, StudentRecord[]> = {};
    PROGRAM_ORDER.forEach((c) => {
      map[c] = [];
    });
    students.forEach((s) => {
      const code = s.program_code || 'UNKNOWN';
      if (!map[code]) map[code] = [];
      map[code].push(s);
    });
    return map;
  }, [students]);

  // Fee structures grouped by program code
  const structuresByProgram = useMemo(() => {
    const map: Record<string, FeeStructureRecord[]> = {};
    feeStructures.forEach((fs) => {
      if (!map[fs.program_code]) map[fs.program_code] = [];
      map[fs.program_code].push(fs);
    });
    return map;
  }, [feeStructures]);

  // Statistics per program
  const programStats = useMemo(() => {
    const stats: Record<string, { total: number; paid: number; partial: number; overdue: number; totalDemand: number; totalPaid: number }> = {};
    PROGRAM_ORDER.forEach((code) => {
      const list = byProgram[code] || [];
      stats[code] = {
        total:       list.length,
        paid:        list.filter((s) => s.demand_status === 'PAID').length,
        partial:     list.filter((s) => s.demand_status === 'PARTIALLY_PAID').length,
        overdue:     list.filter((s) => s.demand_status === 'OVERDUE').length,
        totalDemand: list.reduce((sum, s) => sum + (s.gross_demand || 0), 0),
        totalPaid:   list.reduce((sum, s) => sum + (s.paid_amount || 0), 0),
      };
    });
    return stats;
  }, [byProgram]);

  // Filtered programs for main grid
  const displayedPrograms = useMemo(() => {
    return PROGRAM_ORDER.filter((code) => {
      const meta = PROGRAM_META[code];
      if (!meta) return false;
      const matchLevel = programFilter === 'ALL' || meta.level === programFilter;
      const q = programSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        meta.label.toLowerCase().includes(q) ||
        meta.code.toLowerCase().includes(q) ||
        meta.dept.toLowerCase().includes(q);
      return matchLevel && matchSearch;
    });
  }, [programFilter, programSearch]);

  // Filtered student list for active program with Admission Route filter
  const filteredStudents = useMemo(() => {
    if (!activeProgram) return [];
    return (byProgram[activeProgram] || []).filter((s) => {
      const q = studentSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.roll_no.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.quota_details && s.quota_details.toLowerCase().includes(q));
      const matchCat = catFilter === 'ALL' || s.category === catFilter;
      const matchStatus = statusFilter === 'ALL' || s.demand_status === statusFilter;
      const matchRoute =
        routeFilter === 'ALL' ||
        s.admission_route === routeFilter ||
        s.entrance_exam === routeFilter;
      return matchSearch && matchCat && matchStatus && matchRoute;
    });
  }, [activeProgram, byProgram, studentSearch, catFilter, statusFilter, routeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginated  = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSelectProgram = (code: string) => {
    setActiveProgram(code);
    setStudentSearch('');
    setRouteFilter('ALL');
    setCatFilter('ALL');
    setStatusFilter('ALL');
    setFeeCatTab('GEN');
    setPage(1);
  };

  const handleBack = () => {
    setActiveProgram(null);
    setSelectedStudent(null);
  };

  if (loading) return <LoadingState message="Connecting to Student & Academic Program Database..." />;

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: All 11 Programs Grid
  // ─────────────────────────────────────────────────────────────────────────────
  if (!activeProgram) {
    const totalDemanded   = students.reduce((sum, s) => sum + (s.gross_demand || 0), 0);
    const totalCollected  = students.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    const totalDue        = students.reduce((sum, s) => sum + (s.outstanding_amount || 0), 0);
    const totalScholarships = students.reduce((sum, s) => sum + (s.scholarship_amount || 0) + (s.concession_amount || 0), 0);

    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>ERP Shell</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-600 font-medium">Academic Programs</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span>11 Academic Degree Programs</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {students.length} students segregated into 11 UG & PG programs across 5 distinct admission modes with percentile & welfare fee policies.
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setProgramFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                programFilter === 'ALL'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All (11)
            </button>
            <button
              onClick={() => setProgramFilter('UG')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                programFilter === 'UG'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Undergraduate (7)
            </button>
            <button
              onClick={() => setProgramFilter('PG')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                programFilter === 'PG'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Postgraduate (4)
            </button>
          </div>
        </div>

        {/* Global Financial Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Cohort</span>
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{students.length} Students</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across 11 degree programs</div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500" />
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Gross Demand</span>
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{fmt(totalDemanded)}</div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Prescribed gross demand</div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Scholarships & Waivers</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700 mt-2 font-mono">{fmt(totalScholarships)}</div>
            <div className="text-[11px] text-purple-600 font-medium mt-0.5">JEE / VSAT / Welfare / Domicile</div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Collections</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">{fmt(totalCollected)}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Outstanding: {fmt(totalDue)}</div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
          </div>
        </div>

        {/* Admission Modes Policy Guide Banner (Collapsible) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800">
          <div
            onClick={() => setShowPolicyGuide(!showPolicyGuide)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>Admission Modes & Fee Segregation Policies</span>
                  <span className="text-[10px] bg-purple-500/30 text-purple-200 font-bold px-2 py-0.5 rounded-full border border-purple-400/30">
                    5 Distinct Modes
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  JEE Mains Percentile Tiers, V-SAT Merit Ranks, Lower Caste Welfare Reimbursement, and Special State Domicile
                </p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              {showPolicyGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showPolicyGuide && (
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <Award className="w-4 h-4" />
                  <span>JEE Mains Mode</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-white">Percentile-Based Fee:</span>
                  <ul className="list-disc ml-3.5 mt-1 space-y-0.5 text-[10px]">
                    <li><span className="text-emerald-300 font-semibold">≥98%ile</span>: 100% Tuition Waiver</li>
                    <li><span className="text-purple-300 font-semibold">≥95%ile</span>: 75% Scholarship</li>
                    <li><span className="text-blue-300 font-semibold">≥90%ile</span>: 50% Scholarship</li>
                    <li><span className="text-amber-300 font-semibold">≥85%ile</span>: 25% Scholarship</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                  <Target className="w-4 h-4" />
                  <span>V-SAT Mode</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-white">University Aptitude Rank:</span>
                  <ul className="list-disc ml-3.5 mt-1 space-y-0.5 text-[10px]">
                    <li><span className="text-emerald-300 font-semibold">Rank 1–100</span>: 50% Tuition Waiver</li>
                    <li><span className="text-indigo-300 font-semibold">Rank 101–500</span>: 25% Tuition Waiver</li>
                    <li>Rank &gt; 500: Standard University Fee</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Lower Caste / Reserved</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-white">Social Welfare Quota:</span>
                  <ul className="list-disc ml-3.5 mt-1 space-y-0.5 text-[10px]">
                    <li><span className="text-amber-300 font-semibold">SC / ST</span>: 75% Govt Post-Matric Fee Reimbursement</li>
                    <li><span className="text-amber-200 font-semibold">OBC</span>: 35% BC Welfare Scholarship</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-teal-300 font-bold">
                  <MapPin className="w-4 h-4" />
                  <span>Special State Status</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-white">Domicile Concession:</span>
                  <p className="text-[10px] mt-1 leading-snug">
                    Students from North-East states (Assam, Manipur, etc.) & J&K / Ladakh receive flat <span className="text-teal-300 font-bold">40% Tuition Concession</span>.
                  </p>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>EAMCET Convener</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-white">State Quota:</span>
                  <p className="text-[10px] mt-1 leading-snug">
                    Standard state-regulated tuition approved by Higher Education Council through state counseling.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Programs Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search program by name, branch code, or department..."
              value={programSearch}
              onChange={(e) => setProgramSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all shadow-xs"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="text-brand-700 font-bold">{displayedPrograms.length}</span> of 11 programs
          </div>
        </div>

        {/* 11 Program Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedPrograms.map((code) => {
            const meta = PROGRAM_META[code];
            const stats = programStats[code] || { total: 0, paid: 0, partial: 0, overdue: 0, totalDemand: 0, totalPaid: 0 };
            const structures = structuresByProgram[code] || [];
            return (
              <ProgramCard
                key={code}
                meta={meta}
                stats={stats}
                structures={structures}
                onClick={() => handleSelectProgram(code)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: Program Cohort & Fee Structure Detail
  // ─────────────────────────────────────────────────────────────────────────────
  const meta = PROGRAM_META[activeProgram] || {
    code: activeProgram,
    label: activeProgram,
    shortLabel: activeProgram,
    dept: 'Engineering & Technology',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <GraduationCap className="w-6 h-6" />,
    gradient: 'from-brand-600 to-indigo-700',
    accent: 'text-brand-700',
    lightBg: 'bg-brand-50 border-brand-200',
    borderAccent: 'border-brand-500',
    approxFeeGen: 178000,
    approxFeeMgmt: 248000,
  };

  const currentProgramStats = programStats[activeProgram] || {
    total: 0,
    paid: 0,
    partial: 0,
    overdue: 0,
    totalDemand: 0,
    totalPaid: 0,
  };

  const programStructures = structuresByProgram[activeProgram] || [];
  const currentStructure =
    programStructures.find((fs) => {
      if (feeCatTab === 'GEN') return fs.category.toLowerCase().includes('gen') || fs.category.toLowerCase().includes('open');
      if (feeCatTab === 'MGMT') return fs.category.toLowerCase().includes('mgmt') || fs.category.toLowerCase().includes('management');
      return fs.category.toLowerCase().includes('sc') || fs.category.toLowerCase().includes('st');
    }) || programStructures[0];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all font-semibold text-slate-700 shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All 11 Programs
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">{meta.shortLabel}</span>
      </div>

      {/* Program Hero Banner */}
      <div className={`rounded-3xl bg-gradient-to-r ${meta.gradient} p-6 sm:p-7 text-white shadow-xl relative overflow-hidden`}>
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
              {meta.icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/25 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {meta.level} Degree
                </span>
                <span className="bg-white/20 text-white font-medium text-[10px] px-2.5 py-0.5 rounded-full">
                  {meta.duration} ({meta.semesters} Semesters)
                </span>
                <span className="bg-white/20 font-mono text-white text-[10px] px-2 py-0.5 rounded-full">
                  Code: {meta.code}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">{meta.label}</h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium">{meta.dept}</p>
            </div>
          </div>

          {/* Key Metrics Counters */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-20 border border-white/10">
              <div className="text-xl sm:text-2xl font-black">{currentProgramStats.total}</div>
              <div className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Students</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-20 border border-white/10">
              <div className="text-xl sm:text-2xl font-black text-emerald-300">{currentProgramStats.paid}</div>
              <div className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Full Paid</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-20 border border-white/10">
              <div className="text-xl sm:text-2xl font-black text-amber-300">{currentProgramStats.partial}</div>
              <div className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Partial</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center min-w-20 border border-white/10 col-span-3 sm:col-span-1">
              <div className="text-xl sm:text-2xl font-black text-rose-300">{currentProgramStats.overdue}</div>
              <div className="text-[10px] text-white/80 font-medium uppercase tracking-wider">Overdue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Fee Structure Card with Category Switcher */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${meta.lightBg}`}>
              <Layers className={`w-4 h-4 ${meta.accent}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Official Fee Structure Master — AY 2026-27
              </h2>
              <p className="text-[11px] text-slate-500">
                Priority-ordered institutional fee heads and refundable caution deposits for {meta.shortLabel}
              </p>
            </div>
          </div>

          {/* Category Tabs for Fee Structure */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFeeCatTab('GEN')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                feeCatTab === 'GEN' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              General Merit
            </button>
            <button
              onClick={() => setFeeCatTab('MGMT')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                feeCatTab === 'MGMT' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Management Quota
            </button>
            <button
              onClick={() => setFeeCatTab('SC')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                feeCatTab === 'SC' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SC / ST Reserved
            </button>
          </div>
        </div>

        {/* Fee Heads Breakdown Grid */}
        {currentStructure ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {currentStructure.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 text-center space-y-1 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="text-[10px] font-bold text-slate-400 font-mono">P{item.priority}</div>
                  <div className="text-[11px] font-semibold text-slate-700 truncate" title={item.head_name}>
                    {item.head_name.replace(' Fee', '').replace(' Charges', '')}
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono">{fmt(item.amount)}</div>
                  <div className="text-[9px] font-medium text-slate-400">
                    {item.is_refundable ? (
                      <span className="text-emerald-600 font-semibold">Refundable</span>
                    ) : (
                      <span>Non-refundable</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Annual Fee Highlight */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">
                    Prescribed Annual Fee ({currentStructure.category || feeCatTab}):
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Regulation R23 • Version {currentStructure.version || 'v1.0'} • Scholarships applied based on Admission Mode below
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black font-mono text-emerald-400">
                  {fmt(currentStructure.total_amount)}
                </div>
                <div className="text-[10px] text-slate-400">Annual Baseline</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
            Estimated Annual Fee: <span className="font-bold text-slate-800 font-mono">{fmt(meta.approxFeeGen)}</span> (General) / <span className="font-bold text-purple-700 font-mono">{fmt(meta.approxFeeMgmt)}</span> (Management)
          </div>
        )}
      </div>

      {/* Student Registry Section with Admission Route Filter */}
      <div className="space-y-4">
        {/* Filter & Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, roll no, or admission details..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all shadow-2xs"
              />
            </div>

            {/* Category, Status & View Mode */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {/* Category select */}
              <select
                value={catFilter}
                onChange={(e) => {
                  setCatFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="GEN">GEN (General)</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="MGMT">Management</option>
              </select>

              {/* Status select */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Full Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OVERDUE">Overdue / Defaulter</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                    viewMode === 'grid' ? 'bg-white text-brand-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                    viewMode === 'table' ? 'bg-white text-brand-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
                {filteredStudents.length} Students
              </div>
            </div>
          </div>

          {/* Admission Route Mode Pills Filter (Addressing user requirement) */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Award className="w-3 h-3 text-purple-600" /> Mode of Admission:
            </span>
            {[
              { id: 'ALL', label: 'All Modes' },
              { id: 'JEE_MAINS', label: 'JEE Mains (Percentile)' },
              { id: 'VSAT', label: 'V-SAT (Rank Merit)' },
              { id: 'RESERVED_CATEGORY', label: 'Reserved Welfare Quota' },
              { id: 'SPECIAL_STATE', label: 'Special State Status' },
              { id: 'EAMCET', label: 'EAMCET Convener' },
              { id: 'MANAGEMENT', label: 'Management' },
            ].map((route) => {
              const active = routeFilter === route.id;
              return (
                <button
                  key={route.id}
                  onClick={() => {
                    setRouteFilter(route.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {route.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Student List Render */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="font-bold text-slate-700 text-sm">No students match current search or filters</div>
            <p className="text-xs text-slate-400 mt-1">Try resetting the admission route filter or searching with another keyword.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Cards Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                meta={meta}
                onClick={() => setSelectedStudent(student)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Admission Mode & Score</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Gross Fee</th>
                    <th className="py-3 px-4 text-right">Scholarship/Waiver</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginated.map((s) => {
                    const adm = ADMISSION_MODES[s.admission_route || ''] || ADMISSION_MODES['EAMCET'];
                    const deductions = (s.scholarship_amount || 0) + (s.concession_amount || 0) + (s.waiver_amount || 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.roll_no}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{s.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${adm.badgeBg} ${adm.badgeText} ${adm.badgeBorder}`}>
                            <adm.icon className="w-3 h-3" />
                            {adm.shortLabel}
                            {s.entrance_score != null && (
                              <span className="font-mono ml-0.5">({s.entrance_score}%ile)</span>
                            )}
                            {s.entrance_rank != null && (
                              <span className="font-mono ml-0.5">(Rank #{s.entrance_rank})</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[s.category] || 'bg-slate-100 text-slate-700'}`}>
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{fmt(s.gross_demand)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                          {deductions > 0 ? `-${fmt(deductions)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{fmt(s.net_demand || (s.gross_demand - deductions))}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{fmt(s.paid_amount)}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={s.demand_status} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredStudents.length > PAGE_SIZE && (
          <div className="flex items-center justify-between text-xs text-slate-600 pt-2 px-1">
            <span>
              Showing Page <span className="font-bold text-slate-900">{page}</span> of {totalPages} &nbsp;•&nbsp; {filteredStudents.length} Students
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-semibold text-slate-700 shadow-2xs transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-semibold text-slate-700 shadow-2xs transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          meta={meta}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};

// ─── Subcomponent: 11 Program Card ─────────────────────────────────────────────
const ProgramCard: React.FC<{
  meta: ProgramMeta;
  stats: { total: number; paid: number; partial: number; overdue: number; totalDemand: number; totalPaid: number };
  structures: FeeStructureRecord[];
  onClick: () => void;
}> = ({ meta, stats, structures, onClick }) => {
  const paidPct = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;
  const genStructure = structures.find(s => s.category.toLowerCase().includes('gen')) || structures[0];
  const annualFee = genStructure ? genStructure.total_amount : meta.approxFeeGen;

  return (
    <div
      onClick={onClick}
      className="group text-left rounded-2xl bg-white border border-slate-200/90 hover:border-transparent hover:shadow-xl shadow-xs transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-1 flex flex-col justify-between"
    >
      {/* Top Colorful Accent Line */}
      <div className={`h-1.5 bg-gradient-to-r ${meta.gradient}`} />

      <div className="p-5 space-y-4 flex-1">
        {/* Header: Icon + Level Badge */}
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
          >
            {meta.icon}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.lightBg} ${meta.accent}`}>
              {meta.level} • {meta.duration}
            </span>
          </div>
        </div>

        {/* Program Title & Department */}
        <div>
          <div className="font-mono text-[11px] font-bold text-slate-400">{meta.code}</div>
          <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-brand-700 transition-colors">
            {meta.label}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{meta.dept}</p>
        </div>

        {/* Fee Structure Highlight Pill */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>PRESCRIBED ANNUAL FEE</span>
            <span className="text-emerald-700 font-mono font-bold">{fmt(annualFee)} / yr</span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between font-medium">
            <span>5 Modes of Admission Supported</span>
            <span className="text-purple-700 font-bold text-[10px]">Merit Waivers</span>
          </div>
        </div>

        {/* Cohort Stats (Students, Paid, Overdue) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
            <div className="text-sm font-black text-slate-900">{stats.total}</div>
            <div className="text-[10px] text-slate-500 font-medium">Enrolled</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
            <div className="text-sm font-black text-emerald-700">{stats.paid}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Paid</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-2 border border-rose-100">
            <div className="text-sm font-black text-rose-700">{stats.overdue}</div>
            <div className="text-[10px] text-rose-600 font-medium">Overdue</div>
          </div>
        </div>

        {/* Payment Collection Progress Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Collection Realization</span>
            <span className="font-bold text-slate-700">{paidPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-500`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
        <span className={meta.accent}>Click to explore students & fee structure</span>
        <div className={`flex items-center gap-1 ${meta.accent} group-hover:translate-x-1 transition-transform`}>
          <span>Cohort ({stats.total})</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

// ─── Subcomponent: Student Card ────────────────────────────────────────────────
const StudentCard: React.FC<{
  student: StudentRecord;
  meta: ProgramMeta;
  onClick: () => void;
}> = ({ student: s, meta, onClick }) => {
  const initials = s.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const gross = s.gross_demand || 1;
  const deductions = (s.scholarship_amount || 0) + (s.concession_amount || 0) + (s.waiver_amount || 0);
  const net = s.net_demand ?? (gross - deductions);
  const paidPct = net > 0 ? Math.round(((s.paid_amount || 0) / net) * 100) : 100;

  const adm = ADMISSION_MODES[s.admission_route || ''] || ADMISSION_MODES['EAMCET'];
  const AdmIcon = adm.icon;

  return (
    <div
      onClick={onClick}
      className="group text-left rounded-2xl bg-white border border-slate-200/90 hover:border-transparent hover:shadow-xl shadow-2xs p-4 space-y-3.5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Avatar + Name + Roll */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center font-black text-xs shadow-md shrink-0`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900 text-xs truncate group-hover:text-brand-700 transition-colors">
              {s.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {s.roll_no} • Sem {s.semester}
            </div>
          </div>
        </div>

        {/* Admission Mode Pill */}
        <div className="flex items-center justify-between gap-1">
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border ${adm.badgeBg} ${adm.badgeText} ${adm.badgeBorder} truncate`}
          >
            <AdmIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{adm.shortLabel}</span>
            {s.entrance_score != null && (
              <span className="font-mono text-purple-900 bg-purple-100/80 px-1 rounded">
                {s.entrance_score}%ile
              </span>
            )}
            {s.entrance_rank != null && (
              <span className="font-mono text-indigo-900 bg-indigo-100/80 px-1 rounded">
                #{s.entrance_rank}
              </span>
            )}
          </span>
          <StatusBadge status={s.demand_status} />
        </div>

        {/* Deductions banner if scholarship applied */}
        {deductions > 0 && (
          <div className="bg-purple-50/80 border border-purple-200/70 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px]">
            <span className="text-purple-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
              <span>Scholarship/Concession:</span>
            </span>
            <span className="font-mono font-bold text-purple-800">-{fmt(deductions)}</span>
          </div>
        )}

        {/* Fee Numbers (Paid vs Due) */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2">
            <div className="text-[9px] text-emerald-600 font-medium">Paid</div>
            <div className="text-xs font-bold text-emerald-800 font-mono">{fmt(s.paid_amount)}</div>
          </div>
          <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2">
            <div className="text-[9px] text-rose-500 font-medium">Due</div>
            <div className="text-xs font-bold text-rose-700 font-mono">{fmt(s.outstanding_amount)}</div>
          </div>
        </div>

        {/* Fee Payment Progress Bar */}
        <div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
            <span>Net: {fmt(net)}</span>
            <span>{paidPct}%</span>
          </div>
        </div>
      </div>

      {/* Card Action */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-brand-700">
        <span className="text-[10px] text-slate-500 font-normal">Category: <span className="font-bold text-slate-700">{s.category}</span></span>
        <span className="flex items-center gap-1">
          <span>Details</span>
          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </span>
      </div>
    </div>
  );
};

// ─── Subcomponent: Student Detail Modal ────────────────────────────────────────
const StudentDetailModal: React.FC<{
  student: StudentRecord;
  meta: ProgramMeta;
  onClose: () => void;
}> = ({ student: s, meta, onClose }) => {
  const [activeModalTab, setActiveModalTab] = useState<'LEDGER' | 'RISK'>('LEDGER');
  const [riskData, setRiskData] = useState<any | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [showChallanPreview, setShowChallanPreview] = useState(false);
  const initials = s.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const deductions = (s.scholarship_amount || 0) + (s.concession_amount || 0) + (s.waiver_amount || 0);

  const adm = ADMISSION_MODES[s.admission_route || ''] || ADMISSION_MODES['EAMCET'];
  const AdmIcon = adm.icon;

  useEffect(() => {
    if (activeModalTab === 'RISK' && !riskData) {
      setRiskLoading(true);
      ApiClient.get(`/risk/student/${s.roll_no}`)
        .then((data) => setRiskData(data))
        .catch(console.error)
        .finally(() => setRiskLoading(false));
    }
  }, [activeModalTab, s.roll_no, riskData]);

  const handlePrint = () => {
    setPrintSuccess(true);
    setTimeout(() => setPrintSuccess(false), 3000);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${meta.gradient} p-5 text-white flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg shadow-md shrink-0">
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{s.name}</h3>
              <p className="text-xs text-white/80 font-mono">
                {s.roll_no} • {meta.shortLabel} • Semester {s.semester}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveModalTab('LEDGER')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer ${
              activeModalTab === 'LEDGER'
                ? 'bg-white text-slate-900 border-t-2 border-brand-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Ledger & Profile
          </button>
          <button
            onClick={() => setActiveModalTab('RISK')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeModalTab === 'RISK'
                ? 'bg-white text-slate-900 border-t-2 border-red-500 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Risk Breakdown</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
          {activeModalTab === 'RISK' ? (
            <div className="space-y-4">
              {riskLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-500">Calculating default risk breakdown...</p>
                </div>
              ) : riskData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div>
                      <div className="font-bold text-sm text-slate-900">Risk Score (Rule-Based Forecast)</div>
                      <div className="text-xs text-slate-500">Deterministically computed formula</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        riskData.risk_tier === 'HIGH'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : riskData.risk_tier === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {riskData.risk_tier} RISK ({riskData.risk_score}/100)
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                    <span className="font-bold">Explainability Guarantee:</span> Score is calculated from 5 named, capped points: Past Delays, Aging Bucket, Partial Payment Ratio, Installments, and Scholarship Dependency.
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                      Factor Breakdown & Points
                    </h5>
                    {riskData.contributing_factors.map((f: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span>{f.factor}</span>
                          <span className="font-mono text-slate-700">
                            +{f.points} / {f.max_points} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{f.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">Risk data unavailable</div>
              )}
            </div>
          ) : (
            <>
          {/* Admission Mode & Scorecard Banner (Addressing user requirement) */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                  <AdmIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Admission Mode: {adm.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {s.quota_details || adm.policySummary}
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${adm.badgeBg} ${adm.badgeText} ${adm.badgeBorder}`}>
                {adm.shortLabel}
              </span>
            </div>

            {/* If JEE Mains: Show explicit Percentile & Scholarship Gauge */}
            {s.admission_route === 'JEE_MAINS' && (
              <div className="pt-2 mt-2 border-t border-purple-200/60 flex items-center justify-between bg-white/80 rounded-xl p-2.5">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">JEE Mains Scorecard</div>
                  <div className="text-base font-black text-purple-700 font-mono">
                    {s.entrance_score != null ? `${s.entrance_score} Percentile` : 'Qualified'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block">
                    {s.scholarship_amount && s.scholarship_amount > 0 ? (
                      s.entrance_score && s.entrance_score >= 98.0 ? '100% Tuition Waiver' :
                      s.entrance_score && s.entrance_score >= 95.0 ? '75% Tuition Scholarship' :
                      s.entrance_score && s.entrance_score >= 90.0 ? '50% Tuition Scholarship' :
                      '25% Tuition Scholarship'
                    ) : 'Standard Merit'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Saved: {fmt(s.scholarship_amount || 0)}
                  </div>
                </div>
              </div>
            )}

            {/* If V-SAT: Show Rank details */}
            {s.admission_route === 'VSAT' && s.entrance_rank && (
              <div className="pt-2 mt-2 border-t border-indigo-200/60 flex items-center justify-between bg-white/80 rounded-xl p-2.5">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">V-SAT Entrance Merit</div>
                  <div className="text-base font-black text-indigo-700 font-mono">
                    All-India Rank #{s.entrance_rank}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block">
                    {s.entrance_rank <= 100 ? '50% Merit Scholarship' : s.entrance_rank <= 500 ? '25% Merit Scholarship' : 'Merit Admission'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Saved: {fmt(s.scholarship_amount || 0)}
                  </div>
                </div>
              </div>
            )}

            {/* If Reserved Category: Show Welfare detail */}
            {s.admission_route === 'RESERVED_CATEGORY' && (
              <div className="pt-2 mt-2 border-t border-amber-200/60 flex items-center justify-between bg-white/80 rounded-xl p-2.5">
                <div>
                  <div className="text-[10px] text-amber-800 font-semibold uppercase">Welfare Reimbursement</div>
                  <div className="text-xs font-black text-amber-900">
                    Govt. Social Welfare Post-Matric Scheme ({s.category})
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-700">
                  {fmt(s.scholarship_amount || 0)} Reimbursed
                </div>
              </div>
            )}
          </div>

          {/* Student Profile Quick Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 font-medium">Academic Year</div>
              <div className="font-bold text-slate-800 text-xs mt-0.5">{s.academic_year || 'AY 2026-27'}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 font-medium">Student Category</div>
              <div className="font-bold text-slate-800 text-xs mt-0.5">{s.category}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 font-medium">Admission Route</div>
              <div className="font-bold text-purple-700 text-xs mt-0.5">{adm.shortLabel}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 font-medium">Enrollment Status</div>
              <div className="font-bold text-emerald-600 text-xs mt-0.5">{s.enrollment_status || 'ACTIVE'}</div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap gap-4 text-slate-600">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">Email:</span> {s.email}
            </span>
            {s.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">Phone:</span> {s.phone}
              </span>
            )}
          </div>

          {/* Verified Institutional Fee Ledger */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className={`bg-gradient-to-r ${meta.gradient} px-4 py-3 flex items-center justify-between text-white`}>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                <span className="font-bold text-xs">Deterministic Student Ledger (Audit Verified)</span>
              </div>
              <StatusBadge status={s.demand_status} />
            </div>

            <div className="p-4 space-y-4 bg-white">
              {/* 4 Financial Key Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Gross Demand</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-1">{fmt(s.gross_demand)}</div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <div className="text-[10px] text-purple-600 font-semibold uppercase">Scholarships / Waivers</div>
                  <div className="text-sm font-bold text-purple-700 font-mono mt-1">{fmt(deductions)}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <div className="text-[10px] text-emerald-600 font-semibold uppercase">Paid to Date</div>
                  <div className="text-sm font-bold text-emerald-700 font-mono mt-1">{fmt(s.paid_amount)}</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <div className="text-[10px] text-rose-500 font-semibold uppercase">Balance Due</div>
                  <div className="text-sm font-bold text-rose-700 font-mono mt-1">{fmt(s.outstanding_amount)}</div>
                </div>
              </div>

              {/* Deductions Breakdown */}
              {deductions > 0 && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Applied Concessions & Scholarships Breakdown:</span>
                  </div>
                  <div className="space-y-1">
                    {s.scholarships?.map((sch, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-purple-900 bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div>
                          <div className="font-semibold">{sch.name}</div>
                          <div className="text-[10px] text-purple-600 font-mono">{sch.authority}</div>
                        </div>
                        <span className="font-bold font-mono text-purple-800">-{fmt(sch.amount)}</span>
                      </div>
                    ))}
                    {s.concessions?.map((cn, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-purple-900 bg-white/70 p-2 rounded-lg border border-purple-100">
                        <div>
                          <div className="font-semibold">{cn.reason}</div>
                          <div className="text-[10px] text-purple-600 font-mono">Approved: {cn.approved_by}</div>
                        </div>
                        <span className="font-bold font-mono text-purple-800">-{fmt(cn.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 pt-1 border-t border-purple-200">
                    <span>Net Prescribed Tuition & Fees:</span>
                    <span className="font-mono text-purple-950">{fmt(s.net_demand ?? (s.gross_demand - deductions))}</span>
                  </div>
                </div>
              )}

              {/* Progress & Due Date */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Payment Realization Progress</span>
                  <span className="font-bold text-slate-700">
                    {s.gross_demand > 0 ? Math.round((s.paid_amount / (s.net_demand || s.gross_demand)) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                    style={{
                      width: `${s.gross_demand > 0 ? Math.round((s.paid_amount / (s.net_demand || s.gross_demand)) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date: <span className="font-bold text-slate-700">{s.due_date || 'June 30, 2026'}</span>
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" /> Python Decimal Engine Verified
                </span>
              </div>
            </div>
          </div>

          {/* Academic Integrity Compliance Note */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-blue-900 text-xs">
            <AlertCircle className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <span>
              All transactions follow strict priority allocation (Tuition → Exam → Lab → Caution Deposit). Scholarships and concessions are verified by the institutional audit ledger.
            </span>
          </div>
          </>
        )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChallanPreview(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Preview Challan
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {printSuccess ? 'Sent to Printer...' : 'Print Fee Challan (1 Page)'}
            </button>
          </div>

          <button
            onClick={onClose}
            className={`px-5 py-2 bg-gradient-to-r ${meta.gradient} text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer`}
          >
            Close
          </button>
        </div>
      </div>

      {/* Single-Page Fee Challan Component (Screen Preview Modal + Isolated Print Portal) */}
      <PrintableFeeChallan
        student={s}
        meta={meta}
        isOpen={showChallanPreview}
        onClose={() => setShowChallanPreview(false)}
        onPrint={() => {
          setPrintSuccess(true);
          setTimeout(() => setPrintSuccess(false), 3000);
        }}
      />
    </div>
  );
};
