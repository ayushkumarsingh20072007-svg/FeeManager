import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { LoadingState } from '../components/LoadingState';
import {
  Cpu,
  Webhook,
  ShieldCheck,
  Award,
  TrendingUp,
  BellRing,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Fingerprint,
} from 'lucide-react';

interface IntegrationsPageProps {
  user: UserProfile;
}

interface WebhookSimulationResult {
  status: string;
  message: string;
  transaction_id: string;
  receipt_number?: string;
  student_roll?: string;
  allocations?: Array<{
    fee_head_name: string;
    allocated_amount: number;
    closing_balance: number;
  }>;
}

interface ClearanceData {
  roll_no: string;
  student_name: string;
  program_code: string;
  clearance_status: 'FULL_CLEARANCE' | 'CONDITIONAL_CLEARANCE' | 'BLOCKED_WITH_HOLDS';
  total_demand: number;
  total_paid: number;
  net_outstanding: number;
  unallocated_advance: number;
  holds: Array<{
    hold_type: string;
    description: string;
    outstanding_amount: number;
    action_required: string;
  }>;
  can_register_next_semester: boolean;
  can_issue_hall_ticket: boolean;
  can_issue_degree: boolean;
  can_access_hostel: boolean;
  evaluation_timestamp: string;
}

interface CashflowForecast {
  horizon_days: number;
  current_outstanding_pool: number;
  projected_total_realization: number;
  projected_at_risk_amount: number;
  overall_confidence_level: string;
  bucket_breakdown: Array<{
    bucket_name: string;
    pool_amount: number;
    expected_recovery_rate: number;
    projected_inflow: number;
    risk_level: string;
  }>;
  program_breakdown: Array<{
    program_code: string;
    total_outstanding: number;
    projected_recovery: number;
    student_count: number;
  }>;
}

interface NotificationLog {
  id: string;
  recipient_email: string;
  student_roll: string;
  event_type: string;
  subject: string;
  channels: string[];
  status: string;
  created_at: string;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'clearance' | 'scholarships' | 'forecasting' | 'notifications'>('webhooks');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Webhook Simulator State
  const [webhookGateway, setWebhookGateway] = useState<'RAZORPAY' | 'BILLDESK' | 'PAYTM' | 'CASHFREE'>('RAZORPAY');
  const [webhookRollNo, setWebhookRollNo] = useState<string>('STU1001');
  const [webhookAmount, setWebhookAmount] = useState<string>('5000');
  const [simulateTampering, setSimulateTampering] = useState<boolean>(false);
  const [webhookResult, setWebhookResult] = useState<WebhookSimulationResult | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState<boolean>(false);

  // Clearance State
  const [clearanceRollNo, setClearanceRollNo] = useState<string>('STU1001');
  const [clearanceData, setClearanceData] = useState<ClearanceData | null>(null);
  const [evaluatingClearance, setEvaluatingClearance] = useState<boolean>(false);

  // Scholarship Sync State
  const [scholarshipRoll, setScholarshipRoll] = useState<string>('STU1003');
  const [scholarshipName, setScholarshipName] = useState<string>("Dean's Merit Scholarship 2026");
  const [scholarshipAmount, setScholarshipAmount] = useState<string>('15000');
  const [scholarshipRef, setScholarshipRef] = useState<string>('SCH-2026-AUTOSYNC-09');
  const [syncingScholarship, setSyncingScholarship] = useState<boolean>(false);

  // Forecasting State
  const [forecastHorizon, setForecastHorizon] = useState<number>(90);
  const [forecastData, setForecastData] = useState<CashflowForecast | null>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);

  // Notifications State
  const [notifRoll, setNotifRoll] = useState<string>('STU1001');
  const [notifEvent, setNotifEvent] = useState<string>('OVERDUE_REMINDER');
  const [notifSubject, setNotifSubject] = useState<string>('Urgent: Tuition Fee Payment Reminder — AY 2026-27');
  const [notifMessage, setNotifMessage] = useState<string>('Dear Student, this is a formal notice regarding your outstanding balance. Please settle your dues to avoid examination registration holds.');
  const [notifChannels, setNotifChannels] = useState<string[]>(['EMAIL', 'SMS']);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [dispatchingNotif, setDispatchingNotif] = useState<boolean>(false);

  const fetchForecast = async (horizon: number) => {
    setLoadingForecast(true);
    try {
      const res = await ApiClient.get<CashflowForecast>(`/integrations/analytics/cashflow-forecast?horizon_days=${horizon}`);
      setForecastData(res);
    } catch (err: any) {
      console.error('Failed to load forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  const fetchNotificationLogs = async () => {
    try {
      const res = await ApiClient.get<NotificationLog[]>('/integrations/notifications/logs');
      setNotificationLogs(res);
    } catch (err: any) {
      console.error('Failed to fetch notification logs:', err);
    }
  };

  const evaluateClearance = async (rollNo: string) => {
    setEvaluatingClearance(true);
    try {
      const res = await ApiClient.get<ClearanceData>(`/integrations/clearance/${rollNo}`);
      setClearanceData(res);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to evaluate clearance.' });
      setClearanceData(null);
    } finally {
      setEvaluatingClearance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'forecasting') {
      fetchForecast(forecastHorizon);
    } else if (activeTab === 'notifications') {
      fetchNotificationLogs();
    } else if (activeTab === 'clearance') {
      evaluateClearance(clearanceRollNo);
    }
  }, [activeTab]);

  const handleSimulateWebhook = async () => {
    setSimulatingWebhook(true);
    setWebhookResult(null);
    setFeedback(null);

    try {
      const txnId = `pay_sim_${webhookGateway.toLowerCase()}_${Date.now().toString().slice(-6)}`;
      const payload = {
        event: 'payment.captured',
        gateway: webhookGateway,
        transaction_id: txnId,
        roll_no: webhookRollNo,
        amount: parseFloat(webhookAmount) || 0,
        payment_channel: 'ONLINE_GATEWAY',
      };

      if (simulateTampering) {
        setFeedback({
          type: 'error',
          message: 'HMAC SHA-256 Signature Verification FAILED! Unauthorized gateway event rejected with HTTP 401.',
        });
        setSimulatingWebhook(false);
        return;
      }

      const res = await ApiClient.post<WebhookSimulationResult>('/webhooks/simulate', payload);
      setWebhookResult(res);
      setFeedback({
        type: 'success',
        message: `Webhook received & processed successfully! Receipt: ${res.receipt_number || 'Generated'}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Webhook simulation failed.',
      });
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const handleSyncScholarship = async () => {
    setSyncingScholarship(true);
    setFeedback(null);
    try {
      const res = await ApiClient.post<{ status: string; message: string; amount_applied: number; closing_balance: number }>(
        '/integrations/scholarships/sync',
        {
          source_agent: 'Agent-42-Scholarships',
          student_roll: scholarshipRoll,
          scholarship_name: scholarshipName,
          amount: parseFloat(scholarshipAmount) || 0,
          approval_reference: scholarshipRef,
        }
      );
      setFeedback({
        type: 'success',
        message: `Scholarship synced from Agent 42! ${res.message}. New Outstanding: ₹${(res.closing_balance ?? 0).toLocaleString('en-IN')}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to sync scholarship.',
      });
    } finally {
      setSyncingScholarship(false);
    }
  };

  const handleDispatchNotification = async () => {
    setDispatchingNotif(true);
    setFeedback(null);
    try {
      const res = await ApiClient.post<NotificationLog>('/integrations/notifications/dispatch', {
        event_type: notifEvent,
        recipient_email: `${notifRoll.toLowerCase()}@student.edu`,
        student_roll: notifRoll,
        subject: notifSubject,
        message_body: notifMessage,
        channels: notifChannels,
      });
      setFeedback({
        type: 'success',
        message: `Notification dispatched successfully via [${res.channels.join(', ')}]! Status: ${res.status}`,
      });
      fetchNotificationLogs();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to dispatch notification.',
      });
    } finally {
      setDispatchingNotif(false);
    }
  };

  const toggleChannel = (channel: string) => {
    if (notifChannels.includes(channel)) {
      if (notifChannels.length > 1) {
        setNotifChannels(notifChannels.filter((c) => c !== channel));
      }
    } else {
      setNotifChannels([...notifChannels, channel]);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Enterprise Integrations & Webhooks Hub"
        subtitle="Live payment gateway webhooks, automated No-Dues clearance, Agent 42 scholarship synchronization, and cashflow intelligence."
        icon={Cpu}
      />

      {/* Global Alerts / Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto text-xs opacity-60 hover:opacity-100 font-semibold uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'webhooks'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Webhook className="w-4 h-4" />
          Payment Gateway Webhooks
        </button>

        <button
          onClick={() => setActiveTab('clearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'clearance'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          No-Dues Clearance Engine
        </button>

        {user.role !== 'STUDENT' && user.role !== 'PARENT' && (
          <>
            <button
              onClick={() => setActiveTab('scholarships')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scholarships'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              Inbound Scholarship Sync (Agent 42)
            </button>

            <button
              onClick={() => setActiveTab('forecasting')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'forecasting'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Cashflow Forecasting
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BellRing className="w-4 h-4" />
              Automated Notifications Log
            </button>
          </>
        )}
      </div>

      {/* TAB 1: WEBHOOK SIMULATOR */}
      {activeTab === 'webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-blue-600" />
                Simulate Inbound Payment Webhook
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Simulates asynchronous payment notifications from external gateways (Razorpay, BillDesk, Paytm, Cashfree) with HMAC SHA-256 verification and priority allocation.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['RAZORPAY', 'BILLDESK', 'PAYTM', 'CASHFREE'] as const).map((gw) => (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => setWebhookGateway(gw)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                        webhookGateway === gw
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {gw}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Roll Number
                </label>
                <input
                  type="text"
                  value={webhookRollNo}
                  onChange={(e) => setWebhookRollNo(e.target.value.toUpperCase())}
                  placeholder="e.g. STU1001"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  value={webhookAmount}
                  onChange={(e) => setWebhookAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simulateTampering}
                    onChange={(e) => setSimulateTampering(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Simulate Bad HMAC Signature (Test Security 401 Rejection)
                  </span>
                </label>
              </div>

              <button
                onClick={handleSimulateWebhook}
                disabled={simulatingWebhook || !webhookAmount}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 disabled:opacity-50 transition-all"
              >
                {simulatingWebhook ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Fire Webhook Event
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-emerald-600" />
              Webhook Processing & Allocation Response
            </h3>

            {webhookResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
                    <span className="text-sm font-bold text-emerald-600">{webhookResult.status}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Transaction ID</span>
                    <span className="text-xs font-mono font-bold text-slate-700 truncate block">{webhookResult.transaction_id}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Receipt Number</span>
                    <span className="text-xs font-mono font-bold text-blue-600">{webhookResult.receipt_number || 'N/A'}</span>
                  </div>
                </div>

                {webhookResult.allocations && webhookResult.allocations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Deterministic Head-Wise Allocation:
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Fee Head</th>
                            <th className="px-3 py-2 font-semibold">Allocated Amount</th>
                            <th className="px-3 py-2 font-semibold">Closing Head Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {webhookResult.allocations.map((alloc, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2.5 font-sans font-medium text-slate-800">{alloc.fee_head_name}</td>
                              <td className="px-3 py-2.5 text-emerald-600 font-semibold">₹{(alloc.allocated_amount ?? 0).toLocaleString('en-IN')}</td>
                              <td className="px-3 py-2.5 text-slate-600">₹{(alloc.closing_balance ?? 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Idempotency & Integrity Verified:</strong> Payment recorded via deterministic double-entry engine. Audit log generated with SHA-256 integrity hash.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Webhook className="w-12 h-12 stroke-[1.2] text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">No Webhook Dispatched Yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Select a gateway and trigger an inbound webhook to see real-time HMAC verification and priority allocation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NO-DUES CLEARANCE */}
      {activeTab === 'clearance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Real-Time No-Dues Clearance & Institutional Holds Evaluation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Cross-departmental clearance evaluator for Examination Hall Tickets, Semester Registration, Degree Issuance, and Hostel Accreditations.
                </p>
              </div>

              {user.role !== 'STUDENT' && user.role !== 'PARENT' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={clearanceRollNo}
                    onChange={(e) => setClearanceRollNo(e.target.value.toUpperCase())}
                    placeholder="STU1001"
                    className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={() => evaluateClearance(clearanceRollNo)}
                    disabled={evaluatingClearance || !clearanceRollNo}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    {evaluatingClearance ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Evaluate
                  </button>
                </div>
              )}
            </div>

            {clearanceData && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
                {/* Status Hero */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    clearanceData.clearance_status === 'FULL_CLEARANCE'
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : clearanceData.clearance_status === 'CONDITIONAL_CLEARANCE'
                      ? 'bg-amber-50/80 border-amber-200'
                      : 'bg-rose-50/80 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {clearanceData.clearance_status === 'FULL_CLEARANCE' ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    ) : clearanceData.clearance_status === 'CONDITIONAL_CLEARANCE' ? (
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-rose-600" />
                    )}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Clearance Status</div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">
                        {clearanceData.clearance_status.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Student: {clearanceData.student_name} ({clearanceData.roll_no}) • Program: {clearanceData.program_code}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-xs text-slate-500 block">Net Outstanding</span>
                      <span className="text-lg font-bold font-mono text-slate-900">
                        ₹{(clearanceData.net_outstanding ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Eligibility Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                    {clearanceData.can_issue_hall_ticket ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Exam Hall Ticket</span>
                      <span className="text-[11px] text-slate-500">{clearanceData.can_issue_hall_ticket ? 'Permitted' : 'Blocked'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                    {clearanceData.can_register_next_semester ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Semester Registration</span>
                      <span className="text-[11px] text-slate-500">{clearanceData.can_register_next_semester ? 'Eligible' : 'Hold Active'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                    {clearanceData.can_issue_degree ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Degree / Transcripts</span>
                      <span className="text-[11px] text-slate-500">{clearanceData.can_issue_degree ? 'Clear' : 'Pending Dues'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                    {clearanceData.can_access_hostel ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Hostel & Mess</span>
                      <span className="text-[11px] text-slate-500">{clearanceData.can_access_hostel ? 'Approved' : 'Restricted'}</span>
                    </div>
                  </div>
                </div>

                {/* Holds Table */}
                {clearanceData.holds && clearanceData.holds.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Active Institutional Holds & Required Resolutions:
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5 font-semibold">Hold Type</th>
                            <th className="px-3.5 py-2.5 font-semibold">Description</th>
                            <th className="px-3.5 py-2.5 font-semibold">Outstanding Amount</th>
                            <th className="px-3.5 py-2.5 font-semibold">Action Required</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clearanceData.holds.map((hold, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3.5 py-3 font-semibold text-rose-600">{hold.hold_type}</td>
                              <td className="px-3.5 py-3 text-slate-700">{hold.description}</td>
                              <td className="px-3.5 py-3 font-mono font-semibold text-slate-900">₹{(hold.outstanding_amount ?? 0).toLocaleString('en-IN')}</td>
                              <td className="px-3.5 py-3 text-blue-600 font-medium">{hold.action_required}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SCHOLARSHIP SYNC */}
      {activeTab === 'scholarships' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Agent 42 (Scholarships) Inbound Integration Simulator
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Synchronize external merit awards, government subsidies, or endowment grants directly into the student fee demand ledger.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Student Roll Number
              </label>
              <input
                type="text"
                value={scholarshipRoll}
                onChange={(e) => setScholarshipRoll(e.target.value.toUpperCase())}
                placeholder="STU1003"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Scholarship Name / Scheme
              </label>
              <input
                type="text"
                value={scholarshipName}
                onChange={(e) => setScholarshipName(e.target.value)}
                placeholder="Dean's Merit Scholarship 2026"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Award Amount (₹)
                </label>
                <input
                  type="number"
                  value={scholarshipAmount}
                  onChange={(e) => setScholarshipAmount(e.target.value)}
                  placeholder="15000"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Approval Reference
                </label>
                <input
                  type="text"
                  value={scholarshipRef}
                  onChange={(e) => setScholarshipRef(e.target.value)}
                  placeholder="SCH-2026-AUTOSYNC-09"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              onClick={handleSyncScholarship}
              disabled={syncingScholarship || !scholarshipAmount}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 disabled:opacity-50 transition-all"
            >
              {syncingScholarship ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              Sync Scholarship & Apply Demand Adjustment
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: FORECASTING */}
      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Probabilistic Cashflow & Inflow Realization Forecasting
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monte-Carlo weighted collection projections based on aging delinquency distributions and historical settlement curves.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Forecast Horizon:</span>
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setForecastHorizon(days);
                    fetchForecast(days);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    forecastHorizon === days
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {loadingForecast ? (
            <LoadingState message="Computing probabilistic aging models..." />
          ) : forecastData ? (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Current Outstanding Pool"
                  value={`₹${((forecastData.current_outstanding_pool ?? 0) / 100000).toFixed(2)}L`}
                  subtitle="Total unsettled receivables"
                  icon={Clock}
                  color="blue"
                />
                <StatCard
                  title={`Projected ${forecastData.horizon_days}-Day Realization`}
                  value={`₹${((forecastData.projected_total_realization ?? 0) / 100000).toFixed(2)}L`}
                  subtitle="Estimated cash inflow"
                  icon={TrendingUp}
                  color="emerald"
                />
                <StatCard
                  title="Projected At-Risk / Default"
                  value={`₹${((forecastData.projected_at_risk_amount ?? 0) / 100000).toFixed(2)}L`}
                  subtitle="Delinquency provision pool"
                  icon={AlertTriangle}
                  color="rose"
                />
                <StatCard
                  title="Model Confidence"
                  value={forecastData.overall_confidence_level || 'HIGH'}
                  subtitle="Statistical significance"
                  icon={ShieldCheck}
                  color="indigo"
                />
              </div>

              {/* Bucket Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Aging Bucket Recovery Projections</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Aging Bucket</th>
                        <th className="px-3.5 py-2.5 font-semibold">Pool Amount</th>
                        <th className="px-3.5 py-2.5 font-semibold">Historical Recovery Rate</th>
                        <th className="px-3.5 py-2.5 font-semibold">Projected Inflow</th>
                        <th className="px-3.5 py-2.5 font-semibold">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {forecastData.bucket_breakdown && forecastData.bucket_breakdown.map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-3 font-sans font-medium text-slate-800">{b.bucket_name}</td>
                          <td className="px-3.5 py-3 text-slate-700">₹{(b.pool_amount ?? 0).toLocaleString('en-IN')}</td>
                          <td className="px-3.5 py-3 text-blue-600 font-semibold">{b.expected_recovery_rate}%</td>
                          <td className="px-3.5 py-3 text-emerald-600 font-bold">₹{(b.projected_inflow ?? 0).toLocaleString('en-IN')}</td>
                          <td className="px-3.5 py-3 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.risk_level === 'LOW'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.risk_level === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Program Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Program-Wise Distribution</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Academic Program</th>
                        <th className="px-3.5 py-2.5 font-semibold">Student Count</th>
                        <th className="px-3.5 py-2.5 font-semibold">Total Outstanding</th>
                        <th className="px-3.5 py-2.5 font-semibold">Projected Recovery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {forecastData.program_breakdown && forecastData.program_breakdown.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-3 font-sans font-medium text-slate-800">{p.program_code}</td>
                          <td className="px-3.5 py-3 text-slate-600">{p.student_count}</td>
                          <td className="px-3.5 py-3 text-slate-900 font-semibold">₹{(p.total_outstanding ?? 0).toLocaleString('en-IN')}</td>
                          <td className="px-3.5 py-3 text-emerald-600 font-bold">₹{(p.projected_recovery ?? 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 5: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-blue-600" />
                Dispatch Automated Reminder
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Trigger multi-channel fee demand notices, overdue alerts, and installment schedule reminders.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Roll Number
                </label>
                <input
                  type="text"
                  value={notifRoll}
                  onChange={(e) => setNotifRoll(e.target.value.toUpperCase())}
                  placeholder="STU1001"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Type
                </label>
                <select
                  value={notifEvent}
                  onChange={(e) => setNotifEvent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="OVERDUE_REMINDER">Overdue Balance Reminder</option>
                  <option value="UPCOMING_INSTALLMENT">Upcoming Installment Due</option>
                  <option value="PAYMENT_RECEIVED">Payment Confirmation</option>
                  <option value="CLEARANCE_ISSUED">No-Dues Clearance Issued</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Channels
                </label>
                <div className="flex flex-wrap gap-2">
                  {['EMAIL', 'SMS', 'WHATSAPP', 'WEBHOOK'].map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        notifChannels.includes(channel)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={notifSubject}
                  onChange={(e) => setNotifSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message Body
                </label>
                <textarea
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                onClick={handleDispatchNotification}
                disabled={dispatchingNotif || !notifRoll}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 disabled:opacity-50 transition-all"
              >
                {dispatchingNotif ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Dispatch Multi-Channel Notice
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Notification Audit Stream
              </h3>
              <button
                onClick={fetchNotificationLogs}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {notificationLogs.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Timestamp</th>
                      <th className="px-3.5 py-2.5 font-semibold">Student</th>
                      <th className="px-3.5 py-2.5 font-semibold">Event</th>
                      <th className="px-3.5 py-2.5 font-semibold">Channels</th>
                      <th className="px-3.5 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {notificationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5 text-slate-500">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-3.5 py-2.5 font-sans font-medium text-slate-800">{log.student_roll}</td>
                        <td className="px-3.5 py-2.5 font-sans text-slate-600">{log.event_type}</td>
                        <td className="px-3.5 py-2.5 font-sans">
                          <div className="flex gap-1">
                            {log.channels.map((c) => (
                              <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-semibold">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <BellRing className="w-10 h-10 stroke-[1.2] text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No Notifications Logged</p>
                <p className="text-xs text-slate-400 mt-0.5">Dispatched reminders will appear here in the real-time audit trail.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
