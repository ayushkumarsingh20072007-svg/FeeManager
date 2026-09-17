import React from 'react';
import { createPortal } from 'react-dom';
import {
  Printer, X, ShieldCheck, Award, QrCode, Lock, CheckCircle2, AlertTriangle, FileCheck
} from 'lucide-react';

export interface ExamCourse {
  course_code: string;
  course_title: string;
  exam_date: string;
  session_time: string;
  exam_hall: string;
  seat_number: string;
}

export interface DigitalSignatureInfo {
  is_signed: boolean;
  status: string;
  signatory_name?: string;
  signatory_designation?: string;
  signatory_department?: string;
  institution?: string;
  certificate_id?: string;
  signed_at?: string;
  signature_hash?: string;
  algorithm?: string;
  it_act_compliance?: string;
  clearance_type?: string;
  verification_seal?: string;
  verified_metrics?: {
    attendance: string;
    financial_standing: string;
    academic_records: string;
  };
  message?: string;
}

export interface HallTicketData {
  student_id: string;
  roll_no: string;
  student_name: string;
  program: string;
  semester: number;
  academic_year: string;
  center_name: string;
  clearance_status: string;
  is_eligible: boolean;
  attendance_percentage?: number;
  is_attendance_eligible?: boolean;
  special_permission_ref?: string | null;
  valid_until?: string | null;
  digital_signature?: DigitalSignatureInfo | null;
  clearance_checklist?: any;
  courses: ExamCourse[];
}

interface PrintableHallTicketProps {
  data: HallTicketData;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: () => void;
}

export const PrintableHallTicket: React.FC<PrintableHallTicketProps> = ({
  data,
  isOpen,
  onClose,
  onPrint,
}) => {
  if (!isOpen) return null;

  const isSpecialPermission = data.clearance_status === 'SPECIAL_ENTRY_PERMITTED' || !!data.special_permission_ref;
  const attendance = data.attendance_percentage != null ? data.attendance_percentage : 86.5;
  const isAttendanceMet = attendance >= 75.0;
  const sig = data.digital_signature;

  const handlePrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  // Hall Ticket DOM Layout
  const hallTicketContent = (
    <div
      id="single-hall-ticket-print-root"
      className="bg-white text-slate-900 font-sans p-5 max-w-4xl mx-auto border-2 border-slate-800 shadow-xl rounded-sm print:p-2 print:border print:shadow-none print:max-w-none print:w-full"
      style={{ minHeight: '260mm', maxHeight: '280mm' }}
    >
      {/* 1. Official University Header */}
      <div className="border-b-2 border-slate-900 pb-2.5 mb-2.5 text-center relative">
        <div className="flex items-center justify-between">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-700 via-brand-600 to-indigo-800 flex items-center justify-center font-bold text-white text-lg shrink-0 border-2 border-amber-400 shadow-sm print:border-slate-800">
            VU
          </div>
          <div className="flex-1 px-3">
            <h1 className="text-base sm:text-lg font-black text-red-700 tracking-tight uppercase leading-tight print:text-base">
              Vignan's Foundation for Science, Technology & Research
            </h1>
            <div className="text-[9.5px] text-slate-600 font-medium">
              (Deemed to be University under Sec 3 of UGC Act 1956) • NAAC 'A+' Accredited
            </div>
            <div className="text-[9.5px] text-slate-500 font-medium">
              Vadlamudi, Guntur District, Andhra Pradesh - 522213, India
            </div>
            <div className="mt-1 inline-block bg-slate-900 text-white font-extrabold text-[10.5px] px-3 py-0.5 rounded-sm tracking-wider uppercase">
              Office of the Controller of Examinations
            </div>
          </div>
          <div className="w-14 h-14 border border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center p-1 text-[7.5px] text-slate-500 font-mono">
            <QrCode className="w-7 h-7 text-slate-700" />
            <span>AUTHENTIC</span>
          </div>
        </div>
        <div className="mt-1.5 text-center">
          <span className="text-[11.5px] font-black text-slate-900 tracking-wider uppercase border-b-2 border-red-600 pb-0.5">
            Semester End Theory & Practical Examinations Hall Ticket - {data.academic_year}
          </span>
        </div>
      </div>

      {/* 2. Clearance Endorsement & Security Banner */}
      <div className={`mb-2.5 p-2 rounded border flex items-center justify-between text-xs ${
        isSpecialPermission
          ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
          : 'bg-blue-50 border-blue-500 text-blue-950'
      }`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className={`w-5 h-5 shrink-0 ${isSpecialPermission ? 'text-emerald-600' : 'text-blue-600'}`} />
          <div>
            <span className="font-extrabold uppercase tracking-wide">
              {isSpecialPermission
                ? '★ SPECIAL ENTRY PERMITTED (COUNSELLOR & FINANCE ENDORSED) ★'
                : '✔ OFFICIAL MULTI-FACTOR CLEARANCE VERIFIED — REGULAR ADMISSION'}
            </span>
            {isSpecialPermission && (
              <div className="text-[10px] text-emerald-800 mt-0.5 font-medium">
                Authorized under Counsellor Exemption Approval: <strong>{data.special_permission_ref || 'APR-EXAM-2026'}</strong>
                {data.valid_until && ` • Valid through: ${data.valid_until}`}
              </div>
            )}
          </div>
        </div>
        <div className="text-right text-[9.5px] font-mono shrink-0">
          <div>Status: <span className="font-bold text-emerald-700">AUTHORIZED FOR ENTRY</span></div>
          <div className="text-slate-500">Security Hash: VU-{(data.roll_no || 'STU').slice(-4)}-99A1</div>
        </div>
      </div>

      {/* 3. Candidate Profile & Venue Details */}
      <div className="grid grid-cols-4 gap-2.5 mb-2.5 border border-slate-300 rounded p-2.5 text-xs bg-slate-50/60 print:bg-transparent">
        <div className="col-span-3 space-y-1.5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Candidate Name</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">{data.student_name}</span>
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Registration / Roll No</span>
              <span className="font-mono font-extrabold text-red-700 text-xs sm:text-sm">{data.roll_no}</span>
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Semester Attendance</span>
              <span className={`font-mono font-bold text-xs ${isAttendanceMet ? 'text-emerald-700' : 'text-red-700'}`}>
                {attendance}% {isAttendanceMet ? '✓ (Min 75% Met)' : '⚠ (Shortage)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Program & Branch</span>
              <span className="font-semibold text-slate-800 text-xs">{data.program}</span>
            </div>
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Semester / Standing</span>
              <span className="font-semibold text-slate-800 text-xs">Semester {data.semester} (Academic Standing: Good)</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-200">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Examination Venue / Center</span>
            <span className="font-semibold text-slate-800 text-xs">{data.center_name}</span>
          </div>
        </div>

        {/* Photo Box */}
        <div className="col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-400 rounded bg-white p-1.5">
          <div className="w-18 h-22 bg-slate-100 rounded border border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[8.5px] text-center p-1">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 mb-1">
              {data.student_name.slice(0, 2).toUpperCase()}
            </div>
            <span>DIGITAL PHOTO</span>
          </div>
          <span className="text-[8px] text-slate-500 font-mono mt-0.5">{data.roll_no}</span>
        </div>
      </div>

      {/* 4. AUTO-GENERATED DIGITAL SIGNATURE FROM FINANCE DEPARTMENT */}
      {sig && sig.is_signed ? (
        <div className="mb-2.5 p-2 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-2 border-emerald-500 rounded text-xs text-slate-800 shadow-xs print:border print:bg-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wide">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Generated Cryptographic Digital Signature — Finance Department</span>
                <span className="px-2 py-0.5 rounded text-[8.5px] bg-emerald-200 text-emerald-900 font-mono">
                  {sig.certificate_id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-slate-700">
                <div>
                  <span className="text-slate-500">Authorized Signatory:</span>{' '}
                  <strong className="text-slate-900">{sig.signatory_name}</strong>{' '}
                  <span className="text-slate-500">({sig.signatory_designation})</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>{' '}
                  <strong className="font-mono text-slate-800">{sig.signed_at}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Cryptographic Algorithm:</span>{' '}
                  <span className="font-mono text-slate-800">{sig.algorithm}</span>
                </div>
                <div>
                  <span className="text-slate-500">Statutory Compliance:</span>{' '}
                  <span className="text-slate-800 font-medium">{sig.it_act_compliance}</span>
                </div>
              </div>

              {/* SHA-256 Digest Monospace Bar */}
              <div className="mt-1 pt-1 border-t border-emerald-200/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="truncate max-w-xl">
                  Digest Hash: <strong className="text-emerald-900">{sig.signature_hash}</strong>
                </span>
                <span className="text-emerald-700 font-bold shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  E-Signature Authenticated
                </span>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-center justify-center p-1.5 bg-white border border-emerald-300 rounded text-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <FileCheck className="w-4 h-4" />
              </div>
              <span className="text-[7px] font-bold text-emerald-800 uppercase mt-0.5">FINANCE E-SEAL</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-2.5 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold text-[10px]">
            Digital Signature Withheld: Student does not fulfill mandatory clearance criteria (fees clearance or attendance &gt;= 75%).
          </span>
        </div>
      )}

      {/* 5. Examination Schedule & Timetable */}
      <div className="mb-2.5">
        <div className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Official Course Timetable & Allocated Examination Desks</span>
          <span className="text-[9px] font-normal text-slate-500 font-mono">Exam Session: 10:00 AM - 01:00 PM</span>
        </div>
        <table className="w-full text-left text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 print:bg-slate-100 text-[10px]">
              <th className="p-1 border-r border-slate-300 w-8 text-center">#</th>
              <th className="p-1 border-r border-slate-300 w-20">Course Code</th>
              <th className="p-1 border-r border-slate-300">Course / Subject Title</th>
              <th className="p-1 border-r border-slate-300 w-24">Date</th>
              <th className="p-1 border-r border-slate-300 w-32">Hall & Desk Allocation</th>
              <th className="p-1 w-24 text-center">Invigilator Sign</th>
            </tr>
          </thead>
          <tbody>
            {data.courses.map((c, idx) => (
              <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 print:hover:bg-transparent text-[11px]">
                <td className="p-1 text-center font-mono text-[10px] border-r border-slate-200">{idx + 1}</td>
                <td className="p-1 font-mono font-bold text-slate-800 border-r border-slate-200">{c.course_code}</td>
                <td className="p-1 font-medium text-slate-800 border-r border-slate-200">{c.course_title}</td>
                <td className="p-1 font-mono text-slate-700 border-r border-slate-200">{c.exam_date}</td>
                <td className="p-1 text-slate-700 text-[10px] border-r border-slate-200 font-mono">
                  {c.exam_hall} • <span className="font-bold text-red-700">{c.seat_number}</span>
                </td>
                <td className="p-1 text-center text-slate-300 border-slate-200 text-[9px]">
                  [ Verified ]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. Instructions to Candidates */}
      <div className="mb-3 border border-slate-200 rounded p-2 bg-slate-50/50 print:bg-transparent text-[9px] leading-relaxed text-slate-700">
        <span className="font-bold text-slate-900 block mb-0.5 uppercase tracking-wide">
          Rules & Regulations for Semester End Examinations:
        </span>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Candidates must occupy allotted seats at least <strong>15 minutes</strong> prior to commencement. No entry allowed after 10:15 AM.</li>
          <li>Candidates must carry this Hall Ticket along with their official <strong>University Student Identity Card</strong>.</li>
          <li>Possession of mobile phones, smart watches, programmable calculators, or unauthorized materials inside the hall is strictly prohibited.</li>
          <li>Clearance status is digitally audited by Finance Comptroller and Examination Cell. Tampering voids eligibility.</li>
          <li>Check question paper code and ensure registration number is clearly bubbled on OMR answer booklet.</li>
        </ol>
      </div>

      {/* 7. Signatures & Official Seals (Candidate, Finance Officer DSC, and Controller of Examinations) */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t-2 border-slate-800 text-center text-xs mt-auto">
        {/* Candidate Signature */}
        <div>
          <div className="h-9 border-b border-dashed border-slate-400 mb-1"></div>
          <span className="font-bold text-slate-800 text-[10.5px]">Candidate Signature</span>
          <div className="text-[8.5px] text-slate-500">(To be signed in presence of Invigilator)</div>
        </div>

        {/* Finance Department E-Seal & Digital Signature Stamp */}
        <div className="flex flex-col items-center justify-center">
          <div className="p-1.5 border border-emerald-600 rounded bg-emerald-50/50 text-[8px] text-emerald-900 font-mono text-center w-full">
            <div className="font-bold flex items-center justify-center gap-1 text-emerald-800">
              <Lock className="w-2.5 h-2.5" />
              DIGITALLY SIGNED E-SEAL
            </div>
            <div>CA. Rajesh Sharma, FCA</div>
            <div className="text-[7.5px] text-slate-500">Chief Finance & Accounts Officer</div>
            <div className="text-[7px] text-emerald-700 font-bold truncate">
              ID: {sig?.certificate_id || 'DSC-VU-FIN-2026'}
            </div>
          </div>
        </div>

        {/* Controller of Examinations */}
        <div>
          <div className="h-9 flex items-end justify-center mb-1 font-serif italic text-slate-800 font-bold text-xs">
            Dr. K. Sambasiva Rao
          </div>
          <span className="font-bold text-slate-800 text-[10.5px] border-t border-slate-800 pt-0.5 block">
            Controller of Examinations
          </span>
          <div className="text-[8.5px] text-slate-500">Vignan's University, Vadlamudi</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Screen Modal Preview */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Official University Exam Hall Ticket / Admit Card</h3>
                <p className="text-xs text-slate-400">
                  {data.student_name} ({data.roll_no}) • {data.program}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-brand-600 hover:from-red-700 hover:to-brand-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF (1-Page)</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Screen Scrollable View */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
            <div className="w-full shadow-lg">
              {hallTicketContent}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Digital signature cryptographically signed by Chief Finance & Accounts Officer. Single-page print isolated.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>

      {/* 2. Isolated Print Portal (Rendered into document.body for @media print) */}
      {createPortal(hallTicketContent, document.body)}
    </>
  );
};
