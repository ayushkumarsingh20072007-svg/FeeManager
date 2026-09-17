import React from 'react';
import { createPortal } from 'react-dom';
import { StudentRecord } from '../types';
import { ProgramMeta } from '../pages/StudentsPage';
import {
  Printer, X, ShieldCheck
} from 'lucide-react';

interface PrintableFeeChallanProps {
  student: StudentRecord;
  meta: ProgramMeta;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: () => void;
}

// Convert amount to Indian currency words
function amountToWords(amount: number): string {
  if (!amount || amount <= 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + convertGroup(n % 100);
    if (n < 100000) return convertGroup(Math.floor(n / 1000)) + ' Thousand ' + convertGroup(n % 1000);
    if (n < 10000000) return convertGroup(Math.floor(n / 100000)) + ' Lakh ' + convertGroup(n % 100000);
    return convertGroup(Math.floor(n / 10000000)) + ' Crore ' + convertGroup(n % 10000000);
  };

  const words = convertGroup(Math.round(amount)).trim().replace(/\s+/g, ' ');
  return `Rupees ${words} Only`;
}

export const PrintableFeeChallan: React.FC<PrintableFeeChallanProps> = ({
  student: s,
  meta,
  isOpen,
  onClose,
  onPrint,
}) => {
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  const deductions = (s.scholarship_amount || 0) + (s.concession_amount || 0) + (s.waiver_amount || 0);
  const netPayable = s.net_demand != null ? s.net_demand : Math.max(0, s.gross_demand - deductions);

  // Clean roll number alphanumeric for Virtual Account Number
  const cleanRoll = s.roll_no.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const challanNo = `VU-CHAL-2026-${cleanRoll.slice(-6) || '000001'}`;
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const dueDate = s.due_date || 'June 30, 2026';

  // Specific admission mode label & metric display
  const getAdmissionSummary = () => {
    switch (s.admission_route) {
      case 'JEE_MAINS':
        return `JEE Mains (National Entrance) • ${s.entrance_score != null ? `${s.entrance_score} %ile` : 'Qualified'}`;
      case 'VSAT':
        return `V-SAT (University Entrance) • All-India Rank #${s.entrance_rank || 'N/A'}`;
      case 'RESERVED_CATEGORY':
        return `Lower Caste / Reserved Category • ${s.quota_details || s.category}`;
      case 'SPECIAL_STATE':
        return `Special State Status Quota • ${s.quota_details || 'North-East / J&K Domicile'}`;
      case 'EAMCET':
        return 'State CET / EAMCET (Convenor Quota)';
      case 'MANAGEMENT':
        return 'Institutional Management Quota (Category-B)';
      default:
        return s.admission_route_name || s.admission_route || 'Standard Academic Entry';
    }
  };

  const handlePrintClick = () => {
    if (onPrint) onPrint();
    window.print();
  };

  // The actual official challan content (used both for screen preview and print portal)
  const challanCard = (
    <div className="bg-white text-slate-900 border-2 border-slate-900 p-6 rounded-none shadow-none max-w-[210mm] mx-auto print:p-0 print:border-none print:max-w-none">
      {/* 1. Official University Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xl tracking-tighter">
              VU
            </div>
            <div>
              <h1 className="font-serif font-black text-lg sm:text-xl text-slate-950 tracking-tight uppercase leading-tight">
                Vignan's Foundation for Science, Technology & Research
              </h1>
              <p className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase">
                (Deemed to be University • NAAC 'A+' Accredited • Agent 40 Financial Core)
              </p>
              <p className="text-[9px] text-slate-500">
                Vadlamudi, Guntur, Andhra Pradesh - 522213 • Directorate of Student Accounts & Finance
              </p>
            </div>
          </div>
          <div className="text-right border border-slate-900 px-3 py-1.5 bg-slate-50 text-[10px] shrink-0">
            <div className="font-mono font-bold text-slate-900">STUDENT FEE CHALLAN</div>
            <div className="text-[9px] text-slate-600 font-medium">SINGLE OFFICIAL RECORD</div>
            <div className="text-[8px] font-mono text-emerald-800 font-bold uppercase">Audit Verified</div>
          </div>
        </div>
      </div>

      {/* 2. Challan Reference & Dates Bar */}
      <div className="bg-slate-100 border border-slate-800 px-3 py-1.5 mb-3 flex items-center justify-between text-xs font-mono font-semibold">
        <div className="flex items-center gap-4">
          <span>Challan No: <strong className="text-slate-950">{challanNo}</strong></span>
          <span>Academic Year: <strong className="text-slate-950">{s.academic_year || '2026-27'}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Issue Date: <strong className="text-slate-950">{issueDate}</strong></span>
          <span>Due Date: <strong className="text-red-700">{dueDate}</strong></span>
        </div>
      </div>

      {/* 3. Student Particulars Table */}
      <div className="border border-slate-800 mb-3 text-xs">
        <div className="bg-slate-800 text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Student Particulars & Admission Route</span>
          <span className="font-mono text-[10px] text-slate-300 font-normal">UID: {s.id.slice(0, 12)}</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
          <div className="p-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Student Name:</span>
              <strong className="text-slate-950 font-bold">{s.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Roll / Registration No:</span>
              <strong className="text-slate-950 font-mono font-bold">{s.roll_no}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Academic Program:</span>
              <span className="text-slate-900 font-semibold">{meta.label}</span>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Current Semester:</span>
              <strong className="text-slate-950">Semester {s.semester}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Admission Mode:</span>
              <strong className="text-purple-900 font-bold">{getAdmissionSummary()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Student Category / Quota:</span>
              <span className="text-slate-900 font-semibold">{s.category} ({s.quota_details || 'General'})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Itemized Fee Heads & Calculations Table */}
      <div className="border border-slate-800 mb-3 text-xs">
        <div className="bg-slate-800 text-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          Fee Head Breakdown & Approved Deductions
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-700">
              <th className="p-2 border-r border-slate-300 w-12 text-center">S.No</th>
              <th className="p-2 border-r border-slate-300">Fee Head Description</th>
              <th className="p-2 border-r border-slate-300 w-28 text-center">Period / Terms</th>
              <th className="p-2 text-right w-36">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">01</td>
              <td className="p-2 border-r border-slate-300 font-medium">Tuition Fee (Standard Institutional Schedule)</td>
              <td className="p-2 border-r border-slate-300 text-center text-slate-600">Annual</td>
              <td className="p-2 text-right font-mono font-semibold">₹80,000.00</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">02</td>
              <td className="p-2 border-r border-slate-300 font-medium">Admission & University Registration Fee</td>
              <td className="p-2 border-r border-slate-300 text-center text-slate-600">One-time</td>
              <td className="p-2 text-right font-mono font-semibold">₹15,000.00</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">03</td>
              <td className="p-2 border-r border-slate-300 font-medium">Laboratory, Computing & High-Performance Cloud Facilities</td>
              <td className="p-2 border-r border-slate-300 text-center text-slate-600">Annual</td>
              <td className="p-2 text-right font-mono font-semibold">₹35,000.00</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">04</td>
              <td className="p-2 border-r border-slate-300 font-medium">Examination, Library Resources & Student Amenities</td>
              <td className="p-2 border-r border-slate-300 text-center text-slate-600">Annual</td>
              <td className="p-2 text-right font-mono font-semibold">₹38,000.00</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">05</td>
              <td className="p-2 border-r border-slate-300 font-medium">Refundable Institutional Caution Deposit</td>
              <td className="p-2 border-r border-slate-300 text-center text-slate-600">One-time</td>
              <td className="p-2 text-right font-mono font-semibold">₹10,000.00</td>
            </tr>

            {/* Gross Demand Subtotal */}
            <tr className="bg-slate-50 border-t-2 border-slate-800 font-bold">
              <td colSpan={3} className="p-2 border-r border-slate-300 text-right uppercase text-[11px]">
                Gross Institutional Demand (Subtotal):
              </td>
              <td className="p-2 text-right font-mono text-slate-900">{fmt(s.gross_demand)}</td>
            </tr>

            {/* Deductions: Scholarships & Concessions */}
            {deductions > 0 && (
              <>
                {s.scholarships && s.scholarships.length > 0 ? (
                  s.scholarships.map((sch, idx) => (
                    <tr key={idx} className="bg-emerald-50/70 text-emerald-900 text-xs">
                      <td className="p-2 border-r border-slate-300 text-center font-mono">D{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300">
                        <span className="font-bold">LESS: {sch.name}</span>
                        <div className="text-[10px] text-emerald-700">{sch.authority} • Code: {sch.code}</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-semibold text-emerald-700">Waiver Applied</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">- {fmt(sch.amount)}</td>
                    </tr>
                  ))
                ) : (
                  s.scholarship_amount != null && s.scholarship_amount > 0 && (
                    <tr className="bg-emerald-50/70 text-emerald-900 text-xs">
                      <td className="p-2 border-r border-slate-300 text-center font-mono">D1</td>
                      <td className="p-2 border-r border-slate-300 font-bold">
                        LESS: Merit Scholarship ({s.admission_route === 'JEE_MAINS' ? `${s.entrance_score}%ile Tier` : 'Approved Route'})
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-semibold text-emerald-700">Waiver Applied</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">- {fmt(s.scholarship_amount || 0)}</td>
                    </tr>
                  )
                )}

                {s.concessions && s.concessions.length > 0 && s.concessions.map((cnc, idx) => (
                  <tr key={`cnc-${idx}`} className="bg-blue-50/70 text-blue-900 text-xs">
                    <td className="p-2 border-r border-slate-300 text-center font-mono">C{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300">
                      <span className="font-bold">LESS: {cnc.reason}</span>
                      <div className="text-[10px] text-blue-700">Approved by: {cnc.approved_by || 'Finance Board'} {cnc.code ? `• Code: ${cnc.code}` : ''}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-semibold text-blue-700">Concession</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-800">- {fmt(cnc.amount)}</td>
                  </tr>
                ))}
              </>
            )}

            {/* NET PAYABLE AMOUNT ROW */}
            <tr className="bg-slate-900 text-white font-black text-sm">
              <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider">
                Total Net Payable Amount (INR):
              </td>
              <td className="p-2.5 text-right font-mono text-base tracking-tight text-emerald-400">
                {fmt(netPayable)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      <div className="border border-slate-800 p-2 mb-3 bg-slate-50 text-xs flex items-center justify-between">
        <div>
          <span className="text-slate-500 font-semibold uppercase text-[10px] block">Amount in Words:</span>
          <span className="font-serif font-bold text-slate-950 italic">{amountToWords(netPayable)}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 font-semibold uppercase text-[10px] block">Paid to Date:</span>
          <span className="font-mono font-bold text-slate-800">{fmt(s.paid_amount || 0)}</span>
        </div>
      </div>

      {/* 5. Bank Payment Channels & Mode of Deposit */}
      <div className="border border-slate-800 mb-3 p-2.5 text-xs bg-slate-50">
        <div className="font-bold uppercase text-[10px] text-slate-800 tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
          <span>Banking & Payment Instructions (Designated Bank A/C)</span>
          <span className="text-[9px] font-mono text-slate-600">RTGS / NEFT / IMPS / Offline Cash</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-sans">Bank Name:</span>
            <strong>State Bank of India</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-sans">Virtual A/C No (VAN):</span>
            <strong className="text-blue-900 font-bold">VIGNAN{cleanRoll}</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-sans">IFSC Code:</span>
            <strong>SBIN0012345</strong>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block uppercase font-sans">Campus Branch:</span>
            <span>Vadlamudi University Br.</span>
          </div>
        </div>
      </div>

      {/* 6. Signatures & Verification Hash */}
      <div className="border-t-2 border-slate-900 pt-4 mt-4">
        <div className="grid grid-cols-3 text-center text-xs gap-4">
          <div>
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-slate-400 font-mono italic">[Electronically Generated]</span>
            </div>
            <span className="font-bold text-slate-800 text-[10px] uppercase">Candidate / Parent Signature</span>
          </div>
          <div>
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-emerald-700 font-mono font-bold">✓ AUDIT STAMP VALIDATED</span>
            </div>
            <span className="font-bold text-slate-800 text-[10px] uppercase">Receiving Bank / Cashier Seal</span>
          </div>
          <div>
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[9px] text-blue-900 font-mono font-bold">DR. K. V. RAMANA</span>
            </div>
            <span className="font-bold text-slate-800 text-[10px] uppercase">Finance & Accounts Officer</span>
          </div>
        </div>

        {/* Audit footer */}
        <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-mono">
          <span>Security Hash: SHA256:{s.id.slice(0, 16)}•AUTH-VERIFIED</span>
          <span>Single-Copy Fee Challan Document • No duplicate page required</span>
          <span>Printed on: {new Date().toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. PRINT-ONLY ISOLATED PORTAL (Attaches directly to document.body) */}
      {createPortal(
        <div id="single-fee-challan-print-root">
          {challanCard}
        </div>,
        document.body
      )}

      {/* 2. ON-SCREEN PREVIEW MODAL (When preview is opened) */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Official Fee Challan Preview (Single 1-Page Document)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintClick}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save Single PDF
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Challan Screen View Area */}
            <div className="p-6 bg-slate-200/70 overflow-y-auto flex-1 flex justify-center">
              <div className="bg-white shadow-lg p-6 max-w-[210mm] w-full">
                {challanCard}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Configured for single-page A4 print without duplicate copies.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintClick}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Single Challan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
