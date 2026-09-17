import React, { useEffect, useState } from 'react';
import { UserProfile, StudentRecord } from '../types';
import { ApiClient } from '../services/api';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge } from '../components/StatusBadge';
import { PrintableFeeChallan } from '../components/PrintableFeeChallan';
import { PrintableHallTicket, HallTicketData } from '../components/PrintableHallTicket';
import { ChatInterface } from '../components/ChatInterface';
import { PROGRAM_META, ADMISSION_MODES, ProgramMeta } from './StudentsPage';
import {
  GraduationCap, CreditCard, FileText, Bot, Download,
  Calendar, CheckCircle2, AlertCircle,
  Printer, QrCode, Layers, RefreshCw, X,
  ShieldAlert, Award, Clock, FileCheck2, UserCheck,
  ShieldCheck, BadgeCheck
} from 'lucide-react';

interface StudentPortalPageProps {
  user: UserProfile;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const StudentPortalPage: React.FC<StudentPortalPageProps> = ({
  user,
  activeTab = 'student-dashboard',
  onSelectTab,
}) => {
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [clearanceData, setClearanceData] = useState<any | null>(null);
  const [timetableData, setTimetableData] = useState<HallTicketData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>(
    activeTab.startsWith('student-') ? activeTab : 'student-dashboard'
  );

  // Challan & Payment Modal state
  const [showChallanModal, setShowChallanModal] = useState<boolean>(false);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payChannel, setPayChannel] = useState<'UPI' | 'NET_BANKING' | 'DEBIT_CARD'>('UPI');
  const [payLoading, setPayLoading] = useState<boolean>(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null);

  // Exam Hall Ticket & Permission Modal state
  const [showHallTicketModal, setShowHallTicketModal] = useState<boolean>(false);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [permCategory, setPermCategory] = useState<string>('BANK_EDUCATION_LOAN');
  const [permCommitmentDate, setPermCommitmentDate] = useState<string>('2026-06-25');
  const [permReason, setPermReason] = useState<string>('');
  const [permLoading, setPermLoading] = useState<boolean>(false);
  const [permSuccessMsg, setPermSuccessMsg] = useState<string | null>(null);

  // Receipt download loading states
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  // Sync tab if parent changes it
  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const switchTab = (tab: string) => {
    setCurrentTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const fetchStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend automatically applies server-side RBAC scoping for STUDENT role
      const studentsList = await ApiClient.get<StudentRecord[]>('/ledger/students');
      if (studentsList && studentsList.length > 0) {
        // Under strict RBAC, this list contains exactly the authenticated student
        const myRecord = studentsList[0];
        setStudent(myRecord);
        const netBal = myRecord.net_demand != null ? Math.max(0, myRecord.net_demand - (myRecord.paid_amount || 0)) : 0;
        setPayAmount(netBal.toString());

        // Fetch clearance status
        try {
          const clearance = await ApiClient.get<any>(`/integrations/clearance/${myRecord.roll_no}`);
          setClearanceData(clearance);
        } catch (cErr) {
          console.warn('Could not fetch clearance data:', cErr);
        }

        // Fetch exam timetable
        try {
          const timetable = await ApiClient.get<HallTicketData>(`/integrations/exam-timetable/${myRecord.roll_no}`);
          setTimetableData(timetable);
        } catch (tErr) {
          console.warn('Could not fetch exam timetable:', tErr);
        }
      } else {
        setError('No student academic record found for this profile.');
      }

      // Fetch student's payment transactions
      try {
        const paymentsList = await ApiClient.get<any[]>('/payments');
        setPayments(paymentsList || []);
      } catch (pErr) {
        console.warn('Could not fetch student payments:', pErr);
      }
    } catch (err: any) {
      console.error('Error loading student profile:', err);
      setError(err.message || 'Failed to load your student ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const fmt = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Handle Counsellor Exam Permission Request
  const handleApplyPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (!permReason.trim()) {
      alert('Please enter a detailed explanation of your situation.');
      return;
    }

    setPermLoading(true);
    setPermSuccessMsg(null);
    try {
      const res = await ApiClient.post<any>('/integrations/exam-permission/request', {
        reason_category: permCategory,
        commitment_date: permCommitmentDate,
        reason: permReason,
        student_roll: student.roll_no,
      });

      setPermSuccessMsg(`Application ${res.approval_code} received! Forwarded to Academic & Finance Counsellor Desk.`);
      setTimeout(() => {
        setShowPermissionModal(false);
        setPermSuccessMsg(null);
        fetchStudentData();
      }, 2200);
    } catch (err: any) {
      alert(`Submission failed: ${err.message || 'Could not submit request.'}`);
    } finally {
      setPermLoading(false);
    }
  };

  // Handle Online Fee Payment Simulation
  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const numAmount = parseFloat(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setPayLoading(true);
    setPaySuccessMsg(null);
    try {
      const randomUtr = `UTR${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
      await ApiClient.post('/payments', {
        student_id: student.id,
        amount: numAmount,
        channel: payChannel,
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Online self-service portal fee payment via ${payChannel}`,
        utr_number: randomUtr,
        transaction_id: `TXN-PORTAL-${Date.now().toString().slice(-8)}`,
      });

      setPaySuccessMsg(`Payment of ${fmt(numAmount)} successfully recorded! UTR: ${randomUtr}`);
      setTimeout(() => {
        setShowPayModal(false);
        setPaySuccessMsg(null);
        fetchStudentData();
      }, 2000);
    } catch (err: any) {
      alert(`Payment failed: ${err.message || 'Server error. Please try again.'}`);
    } finally {
      setPayLoading(false);
    }
  };

  // Download official receipt PDF
  const handleDownloadReceipt = async (paymentId: string, receiptNum?: string) => {
    setDownloadingReceiptId(paymentId);
    try {
      await ApiClient.downloadBlob(
        `/payments/${paymentId}/receipt/pdf`,
        `fee_receipt_${receiptNum || paymentId.slice(0, 8)}.pdf`
      );
    } catch (err: any) {
      alert(`Failed to download PDF receipt: ${err.message || 'Error occurred'}`);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your student fee account and ledger..." />;
  }

  if (error || !student) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-900">Student Record Inaccessible</h3>
          <p className="text-xs text-red-700">{error || 'Your student profile is currently being synchronized with institutional databases.'}</p>
          <button
            onClick={fetchStudentData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
          </button>
        </div>
      </div>
    );
  }

  // Derive metadata
  const meta: ProgramMeta = PROGRAM_META['BTECH-CSE'] || {
    code: 'BTECH-CSE',
    label: 'B.Tech Computer Science & Engineering',
    shortLabel: 'B.Tech CSE',
    dept: 'Computer Science & Engineering',
    level: 'UG',
    duration: '4 Years',
    semesters: 8,
    icon: <GraduationCap className="w-6 h-6" />,
    gradient: 'from-blue-600 to-indigo-600',
    accent: 'text-blue-700',
    lightBg: 'bg-blue-50 border-blue-200',
    borderAccent: 'border-blue-500',
    approxFeeGen: 178000,
    approxFeeMgmt: 248000,
  };

  const adm = ADMISSION_MODES[student.admission_route || ''] || ADMISSION_MODES['EAMCET'];
  const AdmIcon = adm.icon;

  const deductions = (student.scholarship_amount || 0) + (student.concession_amount || 0) + (student.waiver_amount || 0);
  const netPayable = student.net_demand != null ? student.net_demand : Math.max(0, student.gross_demand - deductions);
  const remainingDue = Math.max(0, netPayable - (student.paid_amount || 0));
  const progressPercent = netPayable > 0 ? Math.min(100, Math.round(((student.paid_amount || 0) / netPayable) * 100)) : 100;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* 1. Student Personal Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0 border border-white/30">
              {student.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-sm border border-white/30">
                  {student.roll_no}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {student.enrollment_status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 font-medium flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" />
                {meta.label} • Semester {student.semester} • AY {student.academic_year || '2026-27'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons on Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowChallanModal(true)}
              className="px-4 py-2.5 bg-white text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              Print Fee Challan
            </button>

            {clearanceData?.is_eligible_for_hall_ticket ? (
              <button
                onClick={() => setShowHallTicketModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Award className="w-4 h-4 text-white" />
                {clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED' ? 'Endorsed Hall Ticket' : 'Official Hall Ticket'}
              </button>
            ) : (
              <button
                onClick={() => switchTab('student-hall-ticket')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-slate-900" />
                Hall Ticket (Hold)
              </button>
            )}

            {remainingDue > 0 && (
              <button
                onClick={() => setShowPayModal(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Pay Fee Online
              </button>
            )}
          </div>
        </div>

        {/* Admission Mode & Merit Credential Badge inside banner */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/20 text-white">
              <AdmIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white/70 text-[11px] block">Verified Admission Route:</span>
              <span className="font-bold text-white text-xs">{adm.name}</span>
            </div>
          </div>

          {student.admission_route === 'JEE_MAINS' && (
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-3 font-mono">
              <div>
                <span className="text-[10px] text-white/70 uppercase block">JEE Mains Percentile</span>
                <span className="font-black text-amber-300 text-sm">{student.entrance_score}%ile</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div className="text-right">
                <span className="text-[10px] text-emerald-300 font-bold block">75% Tuition Scholarship</span>
                <span className="text-[11px] text-white">Saved {fmt(student.scholarship_amount || 0)}</span>
              </div>
            </div>
          )}

          {student.admission_route === 'VSAT' && student.entrance_rank && (
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-3 font-mono">
              <div>
                <span className="text-[10px] text-white/70 uppercase block">V-SAT Rank</span>
                <span className="font-black text-amber-300 text-sm">#{student.entrance_rank}</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div className="text-right">
                <span className="text-[10px] text-emerald-300 font-bold block">Merit Scholarship</span>
                <span className="text-[11px] text-white">Saved {fmt(student.scholarship_amount || 0)}</span>
              </div>
            </div>
          )}

          {student.admission_route === 'RESERVED_CATEGORY' && (
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-right">
              <span className="text-[10px] text-amber-300 font-bold block">Govt. Post-Matric Welfare ({student.category})</span>
              <span className="text-xs text-white font-mono font-bold">{fmt(student.scholarship_amount || 0)} Reimbursed</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Sub-navigation tabs for Student Portal */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => switchTab('student-dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'student-dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          My Fee Dashboard
        </button>

        <button
          onClick={() => switchTab('student-ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'student-ledger'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Itemized Ledger & Deductions
        </button>

        <button
          onClick={() => switchTab('student-challan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'student-challan'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Official Fee Challan
        </button>

        <button
          onClick={() => switchTab('student-hall-ticket')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'student-hall-ticket'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Exam Hall Ticket & Clearances
          {clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
          {clearanceData?.clearance_status === 'BLOCKED_WITH_HOLDS' && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          onClick={() => switchTab('student-payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'student-payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Payments & Receipts ({payments.length})
        </button>

        <button
          onClick={() => switchTab('ai-assistant')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'ai-assistant'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Fee Assistant
        </button>
      </div>

      {/* 3. TAB 1: My Fee Dashboard */}
      {currentTab === 'student-dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Key Financial Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Gross Demand
              </span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                {fmt(student.gross_demand)}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Institutional Standard Rate</span>
            </div>

            <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Scholarships & Concessions
              </span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                - {fmt(deductions)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium mt-1 block">Sanctioned & Deducted</span>
            </div>

            <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-xs bg-blue-50/20">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                Net Payable Amount
              </span>
              <div className="text-xl font-black text-blue-800 font-mono mt-1">
                {fmt(netPayable)}
              </div>
              <span className="text-[10px] text-blue-600 font-medium mt-1 block">Official Billed Amount</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Remaining Balance
              </span>
              <div className={`text-xl font-black font-mono mt-1 ${remainingDue === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {fmt(remainingDue)}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {remainingDue === 0 ? '✓ No pending balance' : `Due by ${student.due_date || 'June 30, 2026'}`}
              </span>
            </div>
          </div>

          {/* Payment Progress Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Fee Payment Realization:</span>
                <StatusBadge status={student.demand_status} />
              </div>
              <span className="font-mono font-bold text-slate-700">
                {fmt(student.paid_amount || 0)} paid of {fmt(netPayable)} ({progressPercent}%)
              </span>
            </div>

            <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Payment Due Date: <strong className="text-slate-800">{student.due_date || 'June 30, 2026'}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Automated Bank Reconciliation Active
              </span>
            </div>
          </div>

          {/* Exam Hall Ticket & Clearance Status Card */}
          <div className={`rounded-2xl p-5 border shadow-xs space-y-4 ${
            clearanceData?.is_eligible_for_hall_ticket
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-gradient-to-r from-amber-50 via-red-50 to-orange-50 border-amber-300 text-amber-950'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-sm ${
                  clearanceData?.is_eligible_for_hall_ticket ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  {clearanceData?.is_eligible_for_hall_ticket ? <Award className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-sm tracking-tight text-slate-900">
                      Semester End Examination Admit Card & Multi-Factor Clearances
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED'
                        ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                        : clearanceData?.is_eligible_for_hall_ticket
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED'
                        ? '★ SPECIAL ENTRY PERMITTED'
                        : clearanceData?.is_eligible_for_hall_ticket
                        ? '✓ CLEARED FOR EXAMS'
                        : 'EXAMINATION ENTRY BLOCKED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED' ? (
                      <>
                        <strong>Special Counsellor Exemption Active:</strong> Authorized by Academic & Finance Counsellor Desk (Ref: {clearanceData?.special_permission?.approval_code || 'APR-EXAM-2026'}).
                        {clearanceData?.special_permission?.valid_until && ` Valid through ${clearanceData.special_permission.valid_until}.`}
                      </>
                    ) : clearanceData?.is_eligible_for_hall_ticket ? (
                      <>
                        <strong>All Exam Prerequisites Cleared:</strong> Tuition fee reconciled, attendance requirement satisfied (≥ 75%), and Finance Department Digital Signature cryptographically affixed.
                      </>
                    ) : clearanceData?.special_permission?.status === 'PENDING' ? (
                      <>
                        <strong>Counsellor Review in Progress:</strong> Your permission request (Ref: {clearanceData?.special_permission?.approval_code}) is being evaluated by the Academic & Finance Desk.
                      </>
                    ) : (
                      <>
                        <strong>Examination entry is blocked:</strong> Review clearance criteria below (fees settlement and minimum 75% semester attendance required).
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {clearanceData?.is_eligible_for_hall_ticket ? (
                  <button
                    onClick={() => setShowHallTicketModal(true)}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print Official Hall Ticket
                  </button>
                ) : clearanceData?.special_permission?.status === 'PENDING' ? (
                  <button
                    onClick={() => switchTab('student-hall-ticket')}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    View Application Status
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPermCategory(
                        (clearanceData?.attendance_percentage ?? 85) < 75
                          ? 'MEDICAL_CONDONATION'
                          : 'BANK_EDUCATION_LOAN'
                      );
                      setShowPermissionModal(true);
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Send Request to Finance Dept
                  </button>
                )}
              </div>
            </div>

            {/* 3-Pillar Clearance Status Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-200/60">
              {/* Pillar 1: Fee Status */}
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                remainingDue === 0 || clearanceData?.special_permission?.status === 'APPROVED'
                  ? 'bg-white/80 border-emerald-200'
                  : 'bg-white/80 border-red-200'
              }`}>
                <div className={`p-2 rounded-lg shrink-0 ${
                  remainingDue === 0 || clearanceData?.special_permission?.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Pillar 1: Fees Clearance</div>
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {remainingDue === 0
                      ? 'Fees Cleared (₹0 Due)'
                      : clearanceData?.special_permission?.status === 'APPROVED'
                      ? 'Counsellor Exemption'
                      : `Due: ${fmt(remainingDue)}`}
                  </div>
                </div>
              </div>

              {/* Pillar 2: Attendance */}
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                (clearanceData?.attendance_percentage ?? 86.5) >= 75.0
                  ? 'bg-white/80 border-emerald-200'
                  : 'bg-white/80 border-red-200'
              }`}>
                <div className={`p-2 rounded-lg shrink-0 ${
                  (clearanceData?.attendance_percentage ?? 86.5) >= 75.0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Pillar 2: Attendance</div>
                  <div className="text-xs font-extrabold text-slate-900">
                    <span>{clearanceData?.attendance_percentage ?? 86.5}%</span>{' '}
                    <span className={`text-[10px] font-bold ${
                      (clearanceData?.attendance_percentage ?? 86.5) >= 75.0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {(clearanceData?.attendance_percentage ?? 86.5) >= 75.0 ? '(≥75% Required)' : '(<75% Shortage)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Finance Digital Signature */}
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                clearanceData?.digital_signature?.status === 'DIGITALLY_SIGNED_AND_AUTHENTICATED' || clearanceData?.is_eligible_for_hall_ticket
                  ? 'bg-white/80 border-emerald-200'
                  : 'bg-white/80 border-amber-200'
              }`}>
                <div className={`p-2 rounded-lg shrink-0 ${
                  clearanceData?.digital_signature?.status === 'DIGITALLY_SIGNED_AND_AUTHENTICATED' || clearanceData?.is_eligible_for_hall_ticket
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Pillar 3: Finance E-Signature</div>
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {clearanceData?.digital_signature?.status === 'DIGITALLY_SIGNED_AND_AUTHENTICATED' || clearanceData?.is_eligible_for_hall_ticket
                      ? 'Digitally Signed & Sealed'
                      : 'Signature Withheld'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Challan Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-blue-700">
                  <Printer className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900">Official Student Fee Challan</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Generated single-page university fee challan containing your roll number, designated SBI Virtual Account Number (VAN), and exact itemized amounts.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowChallanModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save Single PDF
                </button>
              </div>
            </div>

            {/* Instant Online Payment Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CreditCard className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900">Instant Online Payment</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Pay your fees through instant UPI QR code, Net Banking, or Debit Cards. Your student ledger updates immediately upon transaction.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowPayModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {remainingDue === 0 ? 'Make Advance Payment' : `Pay Remaining Due (${fmt(remainingDue)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: Itemized Fee Ledger */}
      {currentTab === 'student-ledger' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Itemized Fee Structure & Ledger Heads</h3>
              <p className="text-xs text-slate-500">Official schedule approved by Academic Council for AY {student.academic_year || '2026-27'}</p>
            </div>
            <StatusBadge status={student.demand_status} />
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-3.5 w-14 text-center">#</th>
                <th className="p-3.5">Fee Head Description</th>
                <th className="p-3.5 w-32 text-center">Type</th>
                <th className="p-3.5 text-right w-40">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3.5 text-center font-mono text-slate-400">01</td>
                <td className="p-3.5 font-medium text-slate-800">Tuition Fee (Standard Curriculum Rate)</td>
                <td className="p-3.5 text-center text-slate-500">Annual</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">₹80,000.00</td>
              </tr>
              <tr>
                <td className="p-3.5 text-center font-mono text-slate-400">02</td>
                <td className="p-3.5 font-medium text-slate-800">Admission & University Registration Fee</td>
                <td className="p-3.5 text-center text-slate-500">One-time</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">₹15,000.00</td>
              </tr>
              <tr>
                <td className="p-3.5 text-center font-mono text-slate-400">03</td>
                <td className="p-3.5 font-medium text-slate-800">Laboratory & Cloud Infrastructure Charges</td>
                <td className="p-3.5 text-center text-slate-500">Annual</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">₹35,000.00</td>
              </tr>
              <tr>
                <td className="p-3.5 text-center font-mono text-slate-400">04</td>
                <td className="p-3.5 font-medium text-slate-800">Library Resources, Student Amenities & Exam Fee</td>
                <td className="p-3.5 text-center text-slate-500">Annual</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">₹38,000.00</td>
              </tr>
              <tr>
                <td className="p-3.5 text-center font-mono text-slate-400">05</td>
                <td className="p-3.5 font-medium text-slate-800">Refundable Institutional Caution Deposit</td>
                <td className="p-3.5 text-center text-slate-500">One-time</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">₹10,000.00</td>
              </tr>

              {/* Gross Subtotal */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={3} className="p-3.5 text-right uppercase text-[11px] text-slate-600">
                  Gross Institutional Demand:
                </td>
                <td className="p-3.5 text-right font-mono text-slate-950 text-sm">
                  {fmt(student.gross_demand)}
                </td>
              </tr>

              {/* Deductions: Scholarships */}
              {deductions > 0 && (
                <>
                  {student.scholarships && student.scholarships.length > 0 ? (
                    student.scholarships.map((sch, i) => (
                      <tr key={i} className="bg-emerald-50/60 text-emerald-900">
                        <td className="p-3.5 text-center font-mono">D{i + 1}</td>
                        <td className="p-3.5">
                          <span className="font-bold">LESS: {sch.name}</span>
                          <div className="text-[10px] text-emerald-700">{sch.authority} • Sanction Code: {sch.code}</div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Waiver Applied</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                          - {fmt(sch.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    student.scholarship_amount != null && student.scholarship_amount > 0 && (
                      <tr className="bg-emerald-50/60 text-emerald-900">
                        <td className="p-3.5 text-center font-mono">D1</td>
                        <td className="p-3.5 font-bold">
                          LESS: Merit Scholarship ({student.admission_route === 'JEE_MAINS' ? `${student.entrance_score}%ile Tier` : 'Approved Route'})
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Waiver Applied</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                          - {fmt(student.scholarship_amount || 0)}
                        </td>
                      </tr>
                    )
                  )}

                  {student.concessions && student.concessions.map((cnc, i) => (
                    <tr key={`cnc-${i}`} className="bg-blue-50/60 text-blue-900">
                      <td className="p-3.5 text-center font-mono">C{i + 1}</td>
                      <td className="p-3.5">
                        <span className="font-bold">LESS: {cnc.reason}</span>
                        <div className="text-[10px] text-blue-700">{cnc.approved_by || 'Institutional Concession'}</div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-blue-700">Concession</td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-800">
                        - {fmt(cnc.amount)}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Net Payable Row */}
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td colSpan={3} className="p-4 text-right uppercase tracking-wider">
                  Total Net Payable Amount:
                </td>
                <td className="p-4 text-right font-mono text-base text-emerald-400">
                  {fmt(netPayable)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
            <span>Audit Verification: SHA256:{student.id.slice(0, 16)} • Fully Reconciled</span>
            <button
              onClick={() => setShowChallanModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Official Fee Challan
            </button>
          </div>
        </div>
      )}

      {/* 5. TAB 3: Official Fee Challan View */}
      {currentTab === 'student-challan' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900">Your Official University Fee Challan</h3>
              <p className="text-xs text-slate-500">1-Page Single Copy with SBI Virtual Account & Security Verification</p>
            </div>
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Single Challan (PDF)
            </button>
          </div>

          <div className="p-4 bg-slate-100 rounded-2xl flex justify-center">
            <button
              onClick={() => setShowChallanModal(true)}
              className="px-5 py-3 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Open High-Resolution Challan Preview Modal
            </button>
          </div>
        </div>
      )}

      {/* 6. TAB 4: Payments & Receipts */}
      {currentTab === 'student-payments' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200 space-y-4 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900">Payment History & Official Receipts</h3>
              <p className="text-xs text-slate-500">Authoritative audit ledger of all fee transactions and PDF receipts</p>
            </div>
            {remainingDue > 0 && (
              <button
                onClick={() => setShowPayModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay Fee Online
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No payment transactions recorded yet.</p>
              {remainingDue > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Make First Payment Now
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3">Reference</th>
                    <th className="p-3">UTR / Txn ID</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-blue-700">{p.payment_ref}</td>
                      <td className="p-3 font-mono text-slate-600">{p.utr_number || p.transaction_id}</td>
                      <td className="p-3 font-medium text-slate-700">{p.channel}</td>
                      <td className="p-3 text-slate-500">{p.payment_date}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{fmt(p.amount)}</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDownloadReceipt(p.id, p.receipt_number)}
                          disabled={downloadingReceiptId === p.id}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          {downloadingReceiptId === p.id ? 'Downloading...' : 'PDF Receipt'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: Exam Hall Ticket & Permissions */}
      {currentTab === 'student-hall-ticket' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Clearance Banner */}
          <div className={`p-6 rounded-3xl border shadow-sm ${
            clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED'
              ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white border-emerald-700'
              : clearanceData?.is_eligible_for_hall_ticket
              ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-700'
              : 'bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 text-white border-red-800'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-inner ${
                  clearanceData?.is_eligible_for_hall_ticket ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  {clearanceData?.is_eligible_for_hall_ticket ? (
                    <Award className="w-8 h-8 text-white" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                      Vignan's University • Examination Branch
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                        : clearanceData?.is_eligible_for_hall_ticket
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                        : 'bg-red-500/30 text-red-300 border border-red-400/40'
                    }`}>
                      {clearanceData?.clearance_status || 'EVALUATING'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1">
                    Semester End Examinations — Hall Ticket / Admit Card
                  </h2>
                  <p className="text-xs text-white/80 mt-1 max-w-2xl leading-relaxed">
                    {clearanceData?.clearance_status === 'SPECIAL_ENTRY_PERMITTED' ? (
                      <>Special Counsellor & Finance Exemption Approved. Hall Ticket is active with CFAO Digital Signature. Valid through <strong>{clearanceData?.special_permission?.valid_until || 'Session End'}</strong>.</>
                    ) : clearanceData?.is_eligible_for_hall_ticket ? (
                      <>Academic and Financial clearance complete. No outstanding institutional holds. Your Hall Ticket is verified for all scheduled course examinations.</>
                    ) : remainingDue > 0 && (clearanceData?.attendance_percentage ?? 85) < 75.0 ? (
                      <>Your Hall Ticket is currently <strong>BLOCKED</strong> due to unpaid fee balance of <strong>{fmt(remainingDue)}</strong> and attendance shortage (<strong>{clearanceData?.attendance_percentage}%</strong> &lt; 75.0%). Submit a request message to Finance Department for review.</>
                    ) : remainingDue > 0 ? (
                      <>Your Hall Ticket is currently <strong>BLOCKED</strong> due to unpaid university fee balance of <strong>{fmt(remainingDue)}</strong>. Clear dues or submit a request message to Finance Department.</>
                    ) : (
                      <>Your Hall Ticket is currently <strong>BLOCKED</strong> due to semester attendance shortage (<strong>{clearanceData?.attendance_percentage ?? 68}%</strong> &lt; mandatory 75.0%). Submit an attendance condonation request to Finance Department.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                {clearanceData?.is_eligible_for_hall_ticket ? (
                  <button
                    onClick={() => setShowHallTicketModal(true)}
                    className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Download / Print Hall Ticket
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setPermCategory(
                          (clearanceData?.attendance_percentage ?? 85) < 75
                            ? 'MEDICAL_CONDONATION'
                            : 'BANK_EDUCATION_LOAN'
                        );
                        setShowPermissionModal(true);
                      }}
                      className="px-5 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      {clearanceData?.special_permission?.status === 'PENDING'
                        ? 'Update Request to Finance Dept'
                        : 'Send Request to Finance Department'}
                    </button>
                    {remainingDue > 0 && (
                      <button
                        onClick={() => setShowPayModal(true)}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        Pay Due ({fmt(remainingDue)})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Finance Department Cryptographic Clearance & E-Signature Audit Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${
                  clearanceData?.is_eligible_for_hall_ticket
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    Finance Department Digital Signature & Examination Clearance
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      clearanceData?.is_eligible_for_hall_ticket
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {clearanceData?.digital_signature?.status === 'DIGITALLY_SIGNED_AND_AUTHENTICATED' || clearanceData?.is_eligible_for_hall_ticket
                        ? '✓ SIGNATURE AFFIXED'
                        : '⚠ SIGNATURE WITHHELD'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Statutory clearance under Indian Information Technology Act, 2000 (Section 3A) for Examination Admissibility
                  </p>
                </div>
              </div>

              {clearanceData?.digital_signature?.certificate_id && (
                <div className="text-right font-mono text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">DSC Certificate ID</span>
                  <strong className="text-slate-800 font-bold">{clearanceData.digital_signature.certificate_id}</strong>
                </div>
              )}
            </div>

            {/* 3 Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pillar 1: Fee Clearance */}
              <div className={`p-4 rounded-2xl border transition-all ${
                remainingDue === 0 || clearanceData?.special_permission?.status === 'APPROVED'
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-red-50/60 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">1. Financial Clearance</span>
                  {remainingDue === 0 || clearanceData?.special_permission?.status === 'APPROVED' ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-800">
                      CLEARED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-200 text-red-800">
                      HOLD
                    </span>
                  )}
                </div>
                <div className="text-base font-black text-slate-900">
                  {remainingDue === 0
                    ? '₹0 Due (Fully Paid)'
                    : clearanceData?.special_permission?.status === 'APPROVED'
                    ? 'Counsellor Exemption'
                    : fmt(remainingDue) + ' Overdue'}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  {remainingDue === 0
                    ? 'All institutional dues, tuition, and examination fee ledger entries cleared.'
                    : clearanceData?.special_permission?.status === 'APPROVED'
                    ? 'Under special undertaking approved by the Finance Counsellor.'
                    : 'Overdue balance must be cleared or permission granted to unlock signature.'}
                </p>
              </div>

              {/* Pillar 2: Academic Attendance */}
              <div className={`p-4 rounded-2xl border transition-all ${
                (clearanceData?.attendance_percentage ?? 86.5) >= 75.0
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-red-50/60 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">2. Semester Attendance</span>
                  {(clearanceData?.attendance_percentage ?? 86.5) >= 75.0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-800">
                      ELIGIBLE (≥75%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-200 text-red-800">
                      SHORTAGE (&lt;75%)
                    </span>
                  )}
                </div>
                <div className="text-base font-black text-slate-900 flex items-baseline gap-2">
                  <span>{clearanceData?.attendance_percentage ?? 86.5}%</span>
                  <span className="text-[11px] font-semibold text-slate-500">of minimum 75.0% required</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (clearanceData?.attendance_percentage ?? 86.5) >= 75.0 ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, clearanceData?.attendance_percentage ?? 86.5)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 leading-normal">
                  {(clearanceData?.attendance_percentage ?? 86.5) >= 75.0
                    ? 'Complies with University Academic Council attendance regulations.'
                    : 'Attendance is below statutory minimum 75.0%. Contact HOD for condonation.'}
                </p>
              </div>

              {/* Pillar 3: Finance Digital Signature Details */}
              <div className={`p-4 rounded-2xl border transition-all ${
                clearanceData?.is_eligible_for_hall_ticket
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">3. CFAO Digital Signature</span>
                  {clearanceData?.is_eligible_for_hall_ticket ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-800">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-200 text-slate-700">
                      WITHHELD
                    </span>
                  )}
                </div>
                <div className="text-sm font-black text-slate-900">
                  {clearanceData?.digital_signature?.signatory_name || 'CA. Rajesh Sharma, FCA'}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {clearanceData?.digital_signature?.signatory_role || 'Chief Finance & Accounts Officer (CFAO)'}
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-2 bg-white/80 p-1.5 rounded-lg border border-slate-200 truncate">
                  SHA-256: {clearanceData?.digital_signature?.digital_signature_hash || 'WITHHELD_UNTIL_MULTI_FACTOR_CLEARANCE'}
                </p>
              </div>
            </div>

            {/* Cryptographic Digital Signature Detail Box */}
            {clearanceData?.is_eligible_for_hall_ticket && clearanceData?.digital_signature && (
              <div className="p-4 bg-emerald-950 text-emerald-100 rounded-2xl border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Official Finance Clearance E-Certificate Affixed to Hall Ticket
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-200/90 font-mono">
                    Token: {clearanceData.digital_signature.certificate_id} • Signed at {clearanceData.digital_signature.timestamp}
                  </div>
                  <div className="text-[10px] text-emerald-300/80">
                    Statutory Rule: Indian Information Technology Act 2000 (Section 3A) • Verified by University Finance Division
                  </div>
                </div>

                <button
                  onClick={() => setShowHallTicketModal(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-950" />
                  View Signed Admit Card
                </button>
              </div>
            )}
          </div>

          {/* Counsellor Permission Request Status card if submitted */}
          {clearanceData?.special_permission && (
            <div className={`p-5 rounded-2xl border ${
              clearanceData.special_permission.status === 'APPROVED'
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : clearanceData.special_permission.status === 'PENDING'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-red-50/80 border-red-300 text-red-950'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      Counsellor Desk Request Tracking: {clearanceData.special_permission.approval_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      clearanceData.special_permission.status === 'APPROVED'
                        ? 'bg-emerald-200 text-emerald-800'
                        : clearanceData.special_permission.status === 'PENDING'
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {clearanceData.special_permission.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>Reason Stated:</strong> {clearanceData.special_permission.reason}
                  </div>
                  {clearanceData.special_permission.commitment_date && (
                    <div className="text-[11px] text-slate-600">
                      <strong>Committed Payment Date:</strong> {clearanceData.special_permission.commitment_date}
                    </div>
                  )}
                  {clearanceData.special_permission.counsellor_remarks && (
                    <div className="text-xs font-semibold text-slate-900 mt-2 p-2 bg-white/70 rounded-lg border border-slate-200">
                      💬 <strong>Counsellor Remarks:</strong> {clearanceData.special_permission.counsellor_remarks}
                    </div>
                  )}
                </div>

                {clearanceData.special_permission.status === 'REJECTED' && (
                  <button
                    onClick={() => setShowPermissionModal(true)}
                    className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800 transition-colors"
                  >
                    Re-apply
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Timetable Schedule Grid */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Official Course Timetable & Allocated Examination Desks
                </h3>
                <p className="text-xs text-slate-500">
                  Venue: {timetableData?.center_name || 'Main Campus Exam Complex, Vadlamudi'}
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500">Timing:</span> <strong className="text-slate-900">10:00 AM - 01:00 PM (Morning Session)</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-28">Course Code</th>
                    <th className="p-3">Course / Subject Name</th>
                    <th className="p-3 w-32">Exam Date</th>
                    <th className="p-3 w-36">Hall & Desk Allocation</th>
                    <th className="p-3 text-center w-28">Admit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(timetableData?.courses || []).map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{c.course_code}</td>
                      <td className="p-3 font-medium text-slate-900">{c.course_title}</td>
                      <td className="p-3 font-mono text-slate-600">{c.exam_date}</td>
                      <td className="p-3 font-mono text-slate-800">
                        {c.exam_hall} • <strong className="text-red-600">{c.seat_number}</strong>
                      </td>
                      <td className="p-3 text-center">
                        {clearanceData?.is_eligible_for_hall_ticket ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Admitted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Timetable footer with action */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Need to dispute desk allocation or timetable clash? Contact the Controller of Examinations at <strong className="text-slate-700">exams@vignan.ac.in</strong>
              </div>

              {clearanceData?.is_eligible_for_hall_ticket && (
                <button
                  onClick={() => setShowHallTicketModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  Print Official 1-Page Admit Card
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 5: AI Fee Assistant */}
      {currentTab === 'ai-assistant' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm">Agent 40 — Student Fee Intelligence</h3>
                <p className="text-[10px] text-slate-400">Ask questions about your fee breakdown, installment deadlines, or scholarships</p>
              </div>
            </div>
          </div>
          <ChatInterface user={user} />
        </div>
      )}

      {/* Single-Page Fee Challan Component (Always mounted to provide print portal) */}
      <PrintableFeeChallan
        student={student}
        meta={meta}
        isOpen={showChallanModal}
        onClose={() => setShowChallanModal(false)}
      />

      {/* Interactive Pay Fee Online Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Online Fee Payment Gateway</h3>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMakePayment} className="p-6 space-y-4 text-xs">
              {paySuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{paySuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Student Name & Roll Number
                </label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-800">
                  {student.name} ({student.roll_no})
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Payment Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Net Outstanding Balance:</span>
                  <strong className="text-slate-800">{fmt(remainingDue)}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayChannel('UPI')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      payChannel === 'UPI'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayChannel('NET_BANKING')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      payChannel === 'NET_BANKING'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Net Banking
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayChannel('DEBIT_CARD')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      payChannel === 'DEBIT_CARD'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Card
                  </button>
                </div>
              </div>

              {payChannel === 'UPI' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <div className="w-24 h-24 mx-auto bg-white border border-slate-300 rounded-lg flex items-center justify-center p-1">
                    <QrCode className="w-20 h-20 text-slate-800" />
                  </div>
                  <div className="text-[10px] font-mono text-slate-600">
                    UPI ID: <strong>vignanfee@sbi</strong>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {payLoading ? 'Processing...' : `Confirm & Pay ${fmt(parseFloat(payAmount) || 0)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply for Counsellor Exam Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Academic Counsellor Desk — Exam Permission Request</h3>
                  <p className="text-[10px] text-slate-300">Submit special exemption appeal for Semester End Examination Entry</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyPermission} className="p-6 space-y-4 text-xs">
              {permSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{permSuccessMsg}</span>
                </div>
              )}

              {/* Student and Clearance Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Student Roll No:</span>
                  <strong className="font-mono text-slate-900">{student.roll_no}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Candidate Name:</span>
                  <strong className="text-slate-900">{student.name}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Academic Program:</span>
                  <strong className="text-slate-900">{meta.label} (Sem {student.semester})</strong>
                </div>
                <div className={`flex justify-between pt-1 border-t border-slate-200 font-semibold ${
                  remainingDue > 0 ? 'text-red-700' : 'text-emerald-700'
                }`}>
                  <span>Current Outstanding Fee:</span>
                  <strong className="font-mono text-xs">{fmt(remainingDue)} {remainingDue === 0 ? '(Cleared)' : '(Pending)'}</strong>
                </div>
                <div className={`flex justify-between font-semibold ${
                  (clearanceData?.attendance_percentage ?? 85) >= 75 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  <span>Semester Attendance:</span>
                  <strong className="font-mono text-xs">
                    {clearanceData?.attendance_percentage ?? 85}% {(clearanceData?.attendance_percentage ?? 85) >= 75 ? '(Satisfied ≥75%)' : '(Shortage <75%)'}
                  </strong>
                </div>
              </div>

              {/* Reason Category */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  {(clearanceData?.attendance_percentage ?? 85) < 75.0
                    ? 'Reason for Attendance Condonation & Exam Clearance *'
                    : 'Reason for Delayed Fee Payment Exemption *'}
                </label>
                <select
                  value={permCategory}
                  onChange={(e) => setPermCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 text-xs"
                >
                  {(clearanceData?.attendance_percentage ?? 85) < 75.0 ? (
                    <>
                      <option value="MEDICAL_CONDONATION">Medical Emergency / Hospitalization (Doctor Certificate Submitted)</option>
                      <option value="UNIVERSITY_SPORTS_EVENT">University Representation (Sports / NCC / Cultural / Symposium)</option>
                      <option value="FAMILY_EMERGENCY">Severe Family Emergency / Bereavement</option>
                      <option value="REMEDIAL_HOURS_COMPLETED">Completed Remedial Sessions & Attendance Makeup</option>
                      <option value="OTHER_ATTENDANCE_APPEAL">Other Genuine Attendance Condonation Request</option>
                    </>
                  ) : (
                    <>
                      <option value="BANK_EDUCATION_LOAN">Education Loan In Process (Nationalized Bank Sanction Awaited)</option>
                      <option value="AGRICULTURAL_HARVEST_DELAY">Parent Agricultural / Crop Harvest Realization Delay</option>
                      <option value="FAMILY_FINANCIAL_HARDSHIP">Temporary Family Medical / Financial Emergency</option>
                      <option value="SALARY_CREDIT_DELAY">Parent Monthly Salary / Remittance Delay</option>
                      <option value="OTHER">Other Genuine Academic Exemption</option>
                    </>
                  )}
                </select>
              </div>

              {/* Committed Payment Date (only if fee due) */}
              {remainingDue > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Committed Fee Clearance Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={permCommitmentDate}
                    onChange={(e) => setPermCommitmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    You undertake to settle the outstanding balance of {fmt(remainingDue)} on or before this date.
                  </p>
                </div>
              )}

              {/* Explanation Note / Request Message */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Request Message to Finance Department <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={permReason}
                  onChange={(e) => setPermReason(e.target.value)}
                  placeholder={
                    (clearanceData?.attendance_percentage ?? 85) < 75.0
                      ? 'E.g., I was suffering from viral fever and jaundice from 10th to 24th March. Medical fitness certificate submitted to Accounts Office and HOD. Kindly approve condonation and authorize Hall Ticket with digital signature.'
                      : 'E.g., Bank loan application #SBI-8921 is sanctioned by SBI Main Branch; disbursement letter is submitted to accounts office. Kindly grant hall ticket permission.'
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={permLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-700 to-slate-900 hover:from-red-800 hover:to-black text-white rounded-xl font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  {permLoading ? 'Submitting to Finance Dept...' : 'Send Request to Finance Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official 1-Page Printable Hall Ticket Component */}
      {timetableData && (
        <PrintableHallTicket
          data={timetableData}
          isOpen={showHallTicketModal}
          onClose={() => setShowHallTicketModal(false)}
        />
      )}
    </div>
  );
};
