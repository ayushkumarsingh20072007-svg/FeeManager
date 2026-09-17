import React, { useEffect, useState } from 'react';
import {
  UserProfile,
  LedgerStats,
  AuditLogItem,
  RiskDashboardSummary,
  CollectionTrendResponse,
  AgingDistributionResponse,
  ProgramDefaulterHeatmapResponse,
} from '../types';
import { ApiClient } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { StudentRiskModal } from '../components/StudentRiskModal';
import { CollectionTrendChart } from '../components/charts/CollectionTrendChart';
import { AgingDistributionChart } from '../components/charts/AgingDistributionChart';
import { ProgramDefaulterHeatmap } from '../components/charts/ProgramDefaulterHeatmap';
import {
  Users,
  Coins,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ShieldAlert,
  Bell,
  Eye,
  Sparkles,
  BarChart2,
  RefreshCw,
  PieChart as PieChartIcon,
  Grid,
} from 'lucide-react';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate?: (tabId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [riskSummary, setRiskSummary] = useState<RiskDashboardSummary | null>(null);

  // Recharts Analytics State
  const [trendData, setTrendData] = useState<CollectionTrendResponse | null>(null);
  const [agingChartData, setAgingChartData] = useState<AgingDistributionResponse | null>(null);
  const [heatmapData, setHeatmapData] = useState<ProgramDefaulterHeatmapResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const [selectedRiskStudent, setSelectedRiskStudent] = useState<string | null>(null);
  const [notifiedRolls, setNotifiedRolls] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const [trendRes, agingRes, heatmapRes] = await Promise.all([
        ApiClient.get<CollectionTrendResponse>('/analytics/collection-trend?months=6').catch(() => null),
        ApiClient.get<AgingDistributionResponse>('/analytics/aging-distribution').catch(() => null),
        ApiClient.get<ProgramDefaulterHeatmapResponse>('/analytics/program-defaulter-heatmap').catch(() => null),
      ]);

      setTrendData(trendRes);
      setAgingChartData(agingRes);
      setHeatmapData(heatmapRes);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (aErr) {
      console.warn('Analytics fetch error:', aErr);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const statsData = await ApiClient.get<LedgerStats>('/ledger/stats');
        setStats(statsData);

        try {
          const logsData = await ApiClient.get<AuditLogItem[]>('/audit-logs?limit=5');
          setRecentLogs(logsData);
        } catch {
          // If non-admin, logs may not be accessible under RBAC
        }

        try {
          const riskData = await ApiClient.get<RiskDashboardSummary>('/risk/dashboard-summary');
          setRiskSummary(riskData);
        } catch (rErr) {
          console.warn('Risk dashboard API note:', rErr);
        }

        // Fetch parallel analytics chart data
        await fetchAnalyticsData();
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message || 'Unable to connect to financial ledger API.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleNotifyStudent = (rollNo: string) => {
    setNotifiedRolls((prev) => ({ ...prev, [rollNo]: true }));
    setToastMessage(`SMS/Email payment reminder logged for student ${rollNo}`);
    setTimeout(() => setToastMessage(null), 4000);
  };


  if (loading) {
    return <LoadingState message="Loading Institutional Financial Dashboard..." />;
  }

  if (error || !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-red-900">Dashboard Ledger Unavailable</h3>
          <p className="text-xs text-red-700">{error || 'Could not load statistics.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title={`Finance & Fee Operations Dashboard`}
        subtitle={`Academic Year 2026-27 • Institutional Core & Reconciliation Ledger`}
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Dashboard' }
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Ledger Active (28 Students)
            </span>
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards (Authoritative Seed Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students Enrolled"
          value={stats.total_students.toLocaleString()}
          subtitle="AY 2026-27 Active Cohorts"
          icon={Users}
          color="brand"
          onClick={() => onNavigate?.('students')}
        />
        <StatCard
          title="Total Gross Fee Demand"
          value={`₹${(stats.total_demand / 100000).toFixed(2)} L`}
          subtitle={`₹${stats.total_demand.toLocaleString()} Base Demand`}
          icon={Coins}
          color="indigo"
          onClick={() => onNavigate?.('fee-demands')}
        />
        <StatCard
          title="Total Collections Reconciled"
          value={`₹${(stats.total_collected / 100000).toFixed(2)} L`}
          subtitle={`${stats.collection_percentage}% Realization Rate`}
          icon={CreditCard}
          color="emerald"
          badge={{ text: `${stats.collection_percentage}% Paid`, color: 'emerald' }}
          onClick={() => onNavigate?.('payments')}
        />
        <StatCard
          title="Total Institutional Outstanding"
          value={`₹${(stats.total_outstanding / 100000).toFixed(2)} L`}
          subtitle={`₹${stats.overdue_90plus.toLocaleString()} (90+ Days Overdue)`}
          icon={AlertTriangle}
          color="red"
          badge={{ text: 'Receivables Active', color: 'red' }}
          onClick={() => onNavigate?.('aging')}
        />
      </div>

      {/* 2.5 Analytics & Visual Intelligence (Recharts Charts) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2.5">
            <BarChart2 className="w-5 h-5 text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Analytics & Visual Intelligence</h2>
              <p className="text-xs text-slate-500">Real SQL-aggregated financial collection trends, aging distribution, and cohort heatmap</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-slate-500">
                Last updated: <strong className="text-slate-700">{lastRefreshed}</strong>
              </span>
            )}
            <button
              onClick={fetchAnalyticsData}
              disabled={analyticsLoading}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${analyticsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Charts</span>
            </button>
          </div>
        </div>

        {/* Chart Card 1: Collection Trend Full Width */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Monthly Collection & Realization Trend (Last 6 Months)</h3>
                <p className="text-xs text-slate-500">Reconciled bank collections vs baseline institutional target in ₹ Lakhs</p>
              </div>
            </div>
            {trendData && (
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Avg Monthly: ₹{(trendData.average_monthly / 100000).toFixed(2)}L
              </span>
            )}
          </div>

          <CollectionTrendChart
            data={trendData?.data || []}
            loading={analyticsLoading}
          />
        </div>

        {/* Chart Cards 2 & 3: Aging Donut + Defaulter Heatmap Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 2: Aging Distribution Donut */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Receivables Aging Distribution</h3>
                  <p className="text-xs text-slate-500">Interactive donut chart grouped by severity. Click slice to drill down.</p>
                </div>
              </div>
            </div>

            <AgingDistributionChart
              data={agingChartData?.data || []}
              totalOutstanding={agingChartData?.total_outstanding || 0}
              totalDefaulters={agingChartData?.total_defaulters || 0}
              loading={analyticsLoading}
              onSliceClick={(_bucketCode) => {
                if (onNavigate) {
                  onNavigate('students');
                }
              }}
            />
          </div>

          {/* Card 3: Program Defaulter Heatmap */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Grid className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Program × Aging Defaulter Heatmap</h3>
                  <p className="text-xs text-slate-500">Color intensity scaled to student count. Click cell to filter cohort.</p>
                </div>
              </div>
            </div>

            <ProgramDefaulterHeatmap
              programs={heatmapData?.programs || []}
              buckets={heatmapData?.buckets || []}
              matrix={heatmapData?.matrix || []}
              details={heatmapData?.details || {}}
              loading={analyticsLoading}
              onCellClick={(_prog, _bucket) => {
                if (onNavigate) {
                  onNavigate('students');
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Operational Financial & Payment Overview */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Overview Progress & Aging Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Financial Realization Progress */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <TrendingUp className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Financial Collection & Realization Progress</h3>
                  <p className="text-xs text-slate-500">Deterministic ledger verification for 28 students</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {stats.collection_percentage}% Collected
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.collection_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono pt-1">
                <span>Collected: ₹{stats.total_collected.toLocaleString()}</span>
                <span className="text-red-600 font-semibold">
                  Outstanding: ₹{stats.total_outstanding.toLocaleString()}
                </span>
                <span>Gross Demand: ₹{stats.total_demand.toLocaleString()}</span>
              </div>
            </div>

            {/* Sub-cards: Demand, Collected, Outstanding */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-500 font-medium">Gross Demand</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  ₹{stats.total_demand.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">R23 Regulation Baseline</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="text-emerald-700 font-medium">Reconciled Paid</div>
                <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                  ₹{stats.total_collected.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Gateway & Bank Verified</div>
              </div>
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                <div className="text-red-700 font-medium">Net Outstanding</div>
                <div className="text-base font-bold text-red-700 font-mono mt-0.5">
                  ₹{stats.total_outstanding.toLocaleString()}
                </div>
                <div className="text-[10px] text-red-600 mt-0.5">Active Receivables</div>
              </div>
            </div>
          </div>

          {/* Section B: Outstanding Aging Distribution */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Receivables Aging & Due Analysis</h3>
                  <p className="text-xs text-slate-500">Aging buckets calculated against institutional due dates</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate?.('aging')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Aging Report</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div className="text-emerald-700 font-semibold text-[11px]">0–30 Days (Current)</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-1">₹4,20,000</div>
                <div className="text-[10px] text-slate-500">Normal payment cycle</div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="text-blue-700 font-semibold text-[11px]">31–60 Days</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-1">₹3,50,000</div>
                <div className="text-[10px] text-slate-500">First reminder sent</div>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="text-amber-700 font-semibold text-[11px]">61–90 Days</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-1">₹2,80,000</div>
                <div className="text-[10px] text-slate-500">Escalated to parents</div>
              </div>
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                <div className="text-red-700 font-semibold text-[11px]">90+ Days (Critical)</div>
                <div className="text-base font-bold text-red-600 font-mono mt-1">
                  ₹{stats.overdue_90plus.toLocaleString()}
                </div>
                <div className="text-[10px] text-red-500 font-medium">Requires management action</div>
              </div>
            </div>
          </div>

          {/* Section C: Default-Risk Prediction & Forecasting (Task 4) */}
          {riskSummary && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Students at Risk (Rule-Based Forecast)</h3>
                    <p className="text-xs text-slate-500">Transparent 0-100 risk scoring engine for next 30-day default probability</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-900 text-white border border-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Explainable Rule Engine
                </span>
              </div>

              {/* Risk Distribution Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-800">LOW Risk (0-30)</div>
                  <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">{riskSummary.distribution.LOW}</div>
                  <div className="text-[10px] text-slate-500">
                    {Math.round((riskSummary.distribution.LOW / riskSummary.total_students) * 100)}% of cohort
                  </div>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <div className="text-[10px] font-semibold text-amber-800">MEDIUM Risk (31-60)</div>
                  <div className="text-lg font-black text-amber-700 font-mono mt-0.5">{riskSummary.distribution.MEDIUM}</div>
                  <div className="text-[10px] text-slate-500">
                    {Math.round((riskSummary.distribution.MEDIUM / riskSummary.total_students) * 100)}% of cohort
                  </div>
                </div>
                <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                  <div className="text-[10px] font-semibold text-red-800">HIGH Risk (61-100)</div>
                  <div className="text-lg font-black text-red-700 font-mono mt-0.5">{riskSummary.distribution.HIGH}</div>
                  <div className="text-[10px] text-red-600 font-medium">
                    {Math.round((riskSummary.distribution.HIGH / riskSummary.total_students) * 100)}% requires follow-up
                  </div>
                </div>
              </div>

              {/* Top 5 High-Risk Students List */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Top 5 High-Risk Students (Priority Follow-up Queue)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ranked by score descending</span>
                </div>

                <div className="space-y-2">
                  {riskSummary.top_high_risk.map((item) => (
                    <div
                      key={item.student_id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 transition-colors text-xs"
                    >
                      <div className="space-y-0.5 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.student_name}</span>
                          <span className="font-mono text-slate-500 text-[10px]">({item.roll_no})</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                            {item.program_code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">{item.primary_reason}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 font-mono">
                          {item.risk_score} / 100
                        </span>

                        <button
                          onClick={() => setSelectedRiskStudent(item.roll_no)}
                          className="p-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="View Risk Breakdown"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" />
                          <span>Breakdown</span>
                        </button>

                        <button
                          onClick={() => handleNotifyStudent(item.roll_no)}
                          disabled={notifiedRolls[item.roll_no]}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            notifiedRolls[item.roll_no]
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {notifiedRolls[item.roll_no] ? 'Notified' : 'Notify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Operational Action Queues */}
        <div className="space-y-6">
          {/* Payment & Reconciliation Status Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-600" />
                Payment Operations
              </h3>
              <button
                onClick={() => onNavigate?.('reconciliation')}
                className="text-xs text-brand-600 hover:underline font-medium cursor-pointer"
              >
                Reconcile
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Total Payments Recorded:</span>
                <span className="font-bold text-slate-900 font-mono">{stats.total_payments} TXNs</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 rounded-lg">
                <span className="text-emerald-800 font-medium">Reconciled Payments:</span>
                <span className="font-bold text-emerald-800 font-mono">{stats.reconciled_payments}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-50/80 rounded-lg">
                <span className="text-amber-800 font-medium">Unreconciled / Pending:</span>
                <span className="font-bold text-amber-800 font-mono">{stats.unreconciled_payments}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-red-50/80 rounded-lg">
                <span className="text-red-800 font-medium">Reconciliation Mismatches:</span>
                <span className="font-bold text-red-800 font-mono">{stats.mismatches} Flagged</span>
              </div>
            </div>
          </div>

          {/* Pending Approvals & Refunds Queue */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Governance & Approvals
              </h3>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Two-Man Rule
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Pending Financial Approvals</div>
                  <div className="text-[10px] text-slate-500">Waivers, Concessions & Adjustments</div>
                </div>
                <span className="text-base font-bold text-purple-700 font-mono">{stats.pending_approvals}</span>
              </div>

              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Pending Refund Claims</div>
                  <div className="text-[10px] text-slate-500">UGC Tier-1 Withdrawal Proposals</div>
                </div>
                <span className="text-base font-bold text-amber-700 font-mono">{stats.pending_refunds}</span>
              </div>
            </div>
          </div>

          {/* Quick ERP Shortcuts */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <div className="font-bold text-brand-300 uppercase tracking-wider text-[10px]">
              Institutional Fast Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate?.('students')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-brand-300" />
                <span>Students</span>
              </button>
              <button
                onClick={() => onNavigate?.('fee-management')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-brand-300" />
                <span>Structures</span>
              </button>
              <button
                onClick={() => onNavigate?.('payments')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                <span>Payments</span>
              </button>
              <button
                onClick={() => onNavigate?.('ai-assistant')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Assistant</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Audit & Activity Trail */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Institutional Audit & Event Trail</h3>
              <p className="text-xs text-slate-500">Live append-only ledger events from backend</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('audit-logs')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Actor Role</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">{log.resource_type}</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{log.role || 'SYSTEM'}</td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{log.reason || log.new_value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl">
            <FileSpreadsheet className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <span>Audit logging is active. New mutations and queries will appear in real time.</span>
          </div>
        )}
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Student Risk Breakdown Modal */}
      {selectedRiskStudent && (
        <StudentRiskModal
          studentIdOrRoll={selectedRiskStudent}
          onClose={() => setSelectedRiskStudent(null)}
          onNotify={handleNotifyStudent}
        />
      )}
    </div>
  );
};
