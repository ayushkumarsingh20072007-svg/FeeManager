import React, { useEffect, useState } from 'react';
import { PaymentRecord, ReceiptResponse, StudentRecord } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Download,
  X,
  PlusCircle,
  RotateCcw,
  Layers,
  AlertCircle,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Record Payment Modal State
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [recordStudentId, setRecordStudentId] = useState<string>('');
  const [recordAmount, setRecordAmount] = useState<string>('');
  const [recordChannel, setRecordChannel] = useState<string>('COUNTER');
  const [recordTxnId, setRecordTxnId] = useState<string>('');
  const [recordUtr, setRecordUtr] = useState<string>('');
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Allocation & Details Modal State
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<PaymentRecord | null>(null);

  // Reversal State
  const [showReversalModal, setShowReversalModal] = useState<boolean>(false);
  const [reversalPayment, setReversalPayment] = useState<PaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [reversingPayment, setReversingPayment] = useState<boolean>(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptResponse | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get<PaymentRecord[]>('/payments').catch(async () => {
        return await ApiClient.get<PaymentRecord[]>('/ledger/payments');
      });
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await ApiClient.get<StudentRecord[]>('/ledger/students');
      setStudents(data);
    } catch (err) {
      console.error('Failed to load student registry for payment collection:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStudents();
  }, []);

  const handleOpenReceipt = async (payment: PaymentRecord) => {
    setSelectedPaymentForReceipt(payment);
    setLoadingReceipt(true);
    setReceiptError(null);
    setDownloadError(null);
    setReceiptData(null);
    try {
      const data = await ApiClient.get<ReceiptResponse>(`/payments/${payment.id}/receipt`);
      setReceiptData(data);
    } catch (err: any) {
      console.error('Failed to fetch receipt:', err);
      setReceiptError(err.message || 'Unable to retrieve receipt record.');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedPaymentForReceipt) return;
    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      await ApiClient.downloadBlob(
        `/payments/${selectedPaymentForReceipt.id}/receipt/pdf`,
        `fee_receipt_${receiptData?.receipt_number || selectedPaymentForReceipt.payment_ref}.pdf`
      );
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      setDownloadError(err.message || 'Could not download PDF receipt. Please check server logs or permissions.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordStudentId || !recordAmount || parseFloat(recordAmount) <= 0) {
      setRecordError('Please select a student and enter a valid positive payment amount.');
      return;
    }

    setSubmittingPayment(true);
    setRecordError(null);
    try {
      const payload = {
        student_id: recordStudentId,
        amount: parseFloat(recordAmount),
        channel: recordChannel,
        transaction_id: recordTxnId ? recordTxnId.trim() : undefined,
        utr_number: recordUtr ? recordUtr.trim() : undefined,
        notes: recordNotes ? recordNotes.trim() : undefined,
      };

      const res = await ApiClient.post<PaymentRecord>('/payments', payload);
      setShowRecordModal(false);
      setRecordAmount('');
      setRecordTxnId('');
      setRecordUtr('');
      setRecordNotes('');

      await fetchPayments();
      await fetchStudents();

      // Automatically open receipt for the new payment
      if (res && res.id) {
        handleOpenReceipt(res);
      }
    } catch (err: any) {
      console.error('Record payment error:', err);
      setRecordError(err.message || 'Failed to record payment. Please check input parameters.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenReversal = (payment: PaymentRecord) => {
    setReversalPayment(payment);
    setReversalReason('');
    setReversalError(null);
    setShowReversalModal(true);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalPayment || !reversalReason.trim()) {
      setReversalError('Please provide a mandatory audit explanation for reversing this payment.');
      return;
    }

    setReversingPayment(true);
    setReversalError(null);
    try {
      await ApiClient.post(`/payments/${reversalPayment.id}/reverse`, {
        reason: reversalReason.trim(),
      });
      setShowReversalModal(false);
      setSelectedPaymentForDetails(null);
      await fetchPayments();
      await fetchStudents();
    } catch (err: any) {
      console.error('Payment reversal failed:', err);
      setReversalError(err.message || 'Reversal failed.');
    } finally {
      setReversingPayment(false);
    }
  };

  const selectedStudentObj = students.find((s) => s.id === recordStudentId || s.roll_no === recordStudentId);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.payment_ref.toLowerCase().includes(search.toLowerCase()) ||
      p.student_roll.toLowerCase().includes(search.toLowerCase()) ||
      p.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.transaction_id && p.transaction_id.toLowerCase().includes(search.toLowerCase())) ||
      (p.utr_number && p.utr_number.toLowerCase().includes(search.toLowerCase()));

    const matchesChannel =
      selectedChannel === 'ALL' || p.channel === selectedChannel;

    const matchesStatus =
      selectedStatus === 'ALL' || p.status === selectedStatus;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header with Record Payment Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Payment Operations & Collection Journal"
          subtitle="Deterministic payment collection, smart partial fee-head allocations, and receipt auditing"
          breadcrumbs={[
            { label: 'ERP Shell', href: '#' },
            { label: 'Payments', href: '#' },
            { label: 'Transactions' },
          ]}
        />
        <button
          onClick={() => {
            setShowRecordModal(true);
            setRecordError(null);
          }}
          className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Record New Payment
        </button>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, UTR, roll no, name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Payment Method / Channel */}
          <select
            value={selectedChannel}
            onChange={(e) => {
              setSelectedChannel(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            title="Filter by Payment Channel"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="ONLINE_GATEWAY">Online Gateway</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="CARD">Card</option>
            <option value="CHEQUE">Cheque</option>
            <option value="COUNTER">Counter / Cash</option>
            <option value="CASH">Cash</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            title="Filter by Payment Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="RECONCILED">RECONCILED</option>
            <option value="PENDING">PENDING</option>
            <option value="REVERSED">REVERSED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="MISMATCH">MISMATCH</option>
          </select>
        </div>
      </div>

      {/* 3. Payments Table */}
      {loading ? (
        <LoadingState message="Fetching official payment ledger records..." />
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Payment Records Found"
          description="There are no payments matching your selected search query or channel filter."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Channel / Mode</th>
                  <th className="py-3 px-4">Transaction / UTR</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {p.payment_ref}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.student_name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{p.student_roll}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {p.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {p.transaction_id || p.utr_number || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedPaymentForDetails(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="View Fee Allocation Breakdown"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-600" />
                          Breakdown
                        </button>
                        <button
                          onClick={() => handleOpenReceipt(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 transition-colors cursor-pointer"
                          title="View Official Fee Receipt"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-600" />
                          Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * pageSize, filteredPayments.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700">
                {filteredPayments.length}
              </span>{' '}
              transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RECORD PAYMENT MODAL                                                  */}
      {/* ========================================================================= */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <CreditCard className="w-4 h-4 text-brand-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Record Official Fee Collection</h3>
                  <p className="text-[11px] text-brand-200">
                    Deterministic smart partial allocation will apply sequentially
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4 text-xs">
              {recordError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>{recordError}</div>
                </div>
              )}

              {/* Student Selector */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Student (Roll / Name)</label>
                <select
                  value={recordStudentId}
                  onChange={(e) => {
                    setRecordStudentId(e.target.value);
                    const stu = students.find((s) => s.id === e.target.value || s.roll_no === e.target.value);
                    if (stu && stu.outstanding_amount > 0) {
                      setRecordAmount(stu.outstanding_amount.toString());
                    }
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.roll_no} - {s.name} (Outstanding: ₹{s.outstanding_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Remaining Outstanding Pill */}
              {selectedStudentObj && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 flex items-center justify-between text-indigo-900">
                  <span>Current Outstanding Demand:</span>
                  <span className="font-mono font-bold text-sm">
                    ₹{selectedStudentObj.outstanding_amount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 50000"
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Payment Channel */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Payment Mode</label>
                  <select
                    value={recordChannel}
                    onChange={(e) => setRecordChannel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
                  >
                    <option value="COUNTER">Counter / Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CHEQUE">Cheque / DD</option>
                    <option value="ONLINE_GATEWAY">Online Gateway</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Txn ID */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Transaction ID</label>
                  <input
                    type="text"
                    placeholder="Optional gateway txn id"
                    value={recordTxnId}
                    onChange={(e) => setRecordTxnId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Bank UTR */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Bank UTR / Ref</label>
                  <input
                    type="text"
                    placeholder="Optional UTR number"
                    value={recordUtr}
                    onChange={(e) => setRecordUtr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Remarks / Journal Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Counter collection verified against receipt slip"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingPayment ? 'Recording & Allocating...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ALLOCATION BREAKDOWN MODAL                                             */}
      {/* ========================================================================= */}
      {selectedPaymentForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-300" />
                  Fee Allocation Breakdown
                </h3>
                <p className="text-[11px] text-slate-300 font-mono">
                  {selectedPaymentForDetails.payment_ref} • {selectedPaymentForDetails.student_name} ({selectedPaymentForDetails.student_roll})
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentForDetails(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Payment Amount</span>
                  <div className="text-sm font-mono font-bold text-slate-900">
                    ₹{selectedPaymentForDetails.amount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Channel / Status</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-semibold text-slate-800">{selectedPaymentForDetails.channel}</span>
                    <StatusBadge status={selectedPaymentForDetails.status} />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Receipt Number</span>
                  <div className="font-mono text-slate-700">
                    {selectedPaymentForDetails.receipt_number || 'Generated'}
                  </div>
                </div>
              </div>

              {/* Allocations Table */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Smart Partial Allocation by Priority</span>
                  <span className="text-[11px] text-slate-500 font-normal">Deterministic Engine</span>
                </div>
                {selectedPaymentForDetails.allocations && selectedPaymentForDetails.allocations.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-3">Fee Head</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Applied Priority</th>
                          <th className="py-2 px-3 text-right">Allocated Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPaymentForDetails.allocations.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {a.fee_head_name || 'Standard Fee'}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{a.fee_head_type || 'TUITION'}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {a.priority_applied || 'Standard'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              ₹{a.allocated_amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
                    Allocations are recorded in demand item ledgers.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {selectedPaymentForDetails.status !== 'REVERSED' && (
                  <button
                    onClick={() => handleOpenReversal(selectedPaymentForDetails)}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reverse Payment
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => {
                      const p = selectedPaymentForDetails;
                      setSelectedPaymentForDetails(null);
                      handleOpenReceipt(p);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-semibold cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REVERSAL CONFIRMATION MODAL                                            */}
      {/* ========================================================================= */}
      {showReversalModal && reversalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-red-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Authorize Payment Reversal
              </h3>
              <button
                onClick={() => setShowReversalModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReverseSubmit} className="p-5 space-y-4 text-xs">
              {reversalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800">
                  {reversalError}
                </div>
              )}

              <p className="text-slate-600">
                Are you sure you want to reverse payment{' '}
                <strong className="font-mono text-slate-900">{reversalPayment.payment_ref}</strong> for{' '}
                <strong className="text-slate-900">₹{reversalPayment.amount.toLocaleString()}</strong>?
                This will un-allocate the amounts and restore the student demand balance.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Audit Justification / Reversal Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Cheque bounce / duplicate counter entry error"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReversalModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversingPayment}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                >
                  {reversingPayment ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RECEIPT MODAL                                                         */}
      {/* ========================================================================= */}
      {selectedPaymentForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <FileText className="w-5 h-5 text-brand-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    Official Fee Receipt
                    {receiptData && (
                      <span className="font-mono text-xs font-normal text-brand-200 bg-white/10 px-2 py-0.5 rounded-md">
                        {receiptData.receipt_number}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-brand-200">
                    Vignan's Foundation for Science, Technology & Research (Deemed to be University)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {loadingReceipt ? (
                <LoadingState message="Generating verified receipt and calculating balances..." />
              ) : receiptError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    Receipt Error
                  </div>
                  <p>{receiptError}</p>
                </div>
              ) : receiptData ? (
                <div className="space-y-6">
                  {/* Download Error Banner */}
                  {downloadError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                      {downloadError}
                    </div>
                  )}

                  {/* Student & Payment Summary Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Student Name</span>
                      <div className="font-bold text-slate-900 mt-0.5">{receiptData.student_name}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Roll Number</span>
                      <div className="font-mono font-bold text-brand-700 mt-0.5">{receiptData.student_roll}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Program / Sem</span>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {receiptData.program_code} (Sem {receiptData.semester})
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Payment Channel</span>
                      <div className="text-slate-800 font-medium mt-0.5">{receiptData.payment_channel}</div>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Fee Head Allocations for this Transaction
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Head Code</th>
                            <th className="py-2.5 px-3">Fee Head Description</th>
                            <th className="py-2.5 px-3 text-right">Allocated Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {receiptData.fee_head_items && receiptData.fee_head_items.length > 0 ? (
                            receiptData.fee_head_items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-mono text-brand-700 font-semibold">
                                  {item.head_code}
                                </td>
                                <td className="py-2.5 px-3">{item.head_name}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                                  ₹{item.allocated_amount.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-3 px-3 text-center text-slate-500">
                                Standard Demand Item Allocation
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Cumulative Financial Ledger Summary */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Gross Demand:</span>
                      <span className="font-mono">₹{receiptData.gross_demand.toLocaleString()}</span>
                    </div>
                    {receiptData.total_reductions > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Total Deductions (Scholarships/Concessions):</span>
                        <span className="font-mono">- ₹{receiptData.total_reductions.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2">
                      <span>Net Annual Demand:</span>
                      <span className="font-mono">₹{receiptData.net_demand.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>Total Paid to Date:</span>
                      <span className="font-mono">₹{receiptData.cumulative_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-brand-900 font-bold text-sm border-t border-slate-200 pt-2">
                      <span>Remaining Outstanding:</span>
                      <span className="font-mono text-red-600">
                        ₹{receiptData.remaining_outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Deterministic report generated with ReportLab PDF engine.</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForReceipt(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={downloadingPdf || !receiptData}
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
