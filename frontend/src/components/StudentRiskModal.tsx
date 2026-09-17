import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle2, Bell, Info, Calculator } from 'lucide-react';
import { ApiClient } from '../services/api';
import { RiskScoreResponse } from '../types';

interface StudentRiskModalProps {
  studentIdOrRoll: string;
  onClose: () => void;
  onNotify?: (studentRoll: string) => void;
}

export const StudentRiskModal: React.FC<StudentRiskModalProps> = ({
  studentIdOrRoll,
  onClose,
  onNotify,
}) => {
  const [riskData, setRiskData] = useState<RiskScoreResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notified, setNotified] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    ApiClient.get<RiskScoreResponse>(`/risk/student/${studentIdOrRoll}`)
      .then((data) => setRiskData(data))
      .catch((err) => setError(err.message || 'Failed to fetch default risk calculation.'))
      .finally(() => setLoading(false));
  }, [studentIdOrRoll]);

  const handleNotifyClick = () => {
    setNotified(true);
    if (onNotify && riskData) {
      onNotify(riskData.roll_no);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'HIGH':
        return {
          bg: 'bg-red-500',
          badgeBg: 'bg-red-100 text-red-800 border-red-200',
          barColor: 'from-red-500 to-rose-600',
          text: 'text-red-700',
          border: 'border-red-200',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          barColor: 'from-amber-500 to-orange-500',
          text: 'text-amber-700',
          border: 'border-amber-200',
        };
      default:
        return {
          bg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          barColor: 'from-emerald-500 to-teal-600',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-brand-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Default Risk Assessment</h3>
              <p className="text-xs text-slate-300">Explainable Rule-Based Predictive Audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 font-medium">Computing deterministic default risk score...</p>
            </div>
          ) : error || !riskData ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
              <div className="font-bold text-red-900">Risk Assessment Error</div>
              <div className="text-red-700 text-[11px]">{error || 'Data unavailable'}</div>
            </div>
          ) : (
            <>
              {/* Student Header Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{riskData.student_name}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {riskData.roll_no} • {riskData.program_code || 'Academic Program'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      getTierColor(riskData.risk_tier).badgeBg
                    }`}
                  >
                    {riskData.risk_tier} RISK
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    Score: {riskData.risk_score} / 100
                  </div>
                </div>
              </div>

              {/* Gauge & Score Meter */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-brand-600" />
                    Predictive Default Probability
                  </span>
                  <span className={`font-mono font-bold text-sm ${getTierColor(riskData.risk_tier).text}`}>
                    {riskData.risk_score} / 100 Points
                  </span>
                </div>

                <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200/80">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      getTierColor(riskData.risk_tier).barColor
                    } transition-all duration-500`}
                    style={{ width: `${Math.max(5, riskData.risk_score)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>LOW (0-30)</span>
                  <span>MEDIUM (31-60)</span>
                  <span>HIGH (61-100)</span>
                </div>
              </div>

              {/* Auditability Banner */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900 text-[11px]">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Transparent Rule-Based Forecast:</span> Every score is computed deterministically from historical payment delays, aging buckets, partial payment ratio, installment adherence, and scholarship status.
                </div>
              </div>

              {/* Contributing Factors List */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px]">
                  Contributing Factors Breakdown (Explainable AI)
                </h5>

                <div className="space-y-2">
                  {riskData.contributing_factors.map((factor, idx) => {
                    const pct = Math.round((factor.points / factor.max_points) * 100);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-slate-900 font-semibold">{factor.factor}</span>
                          <span className="font-mono text-slate-700 font-bold">
                            +{factor.points} <span className="text-slate-400 font-normal">/ {factor.max_points} pts</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{factor.explanation}</p>

                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              factor.points > 0 ? getTierColor(riskData.risk_tier).bg : 'bg-slate-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          {riskData && (
            <button
              onClick={handleNotifyClick}
              disabled={notified}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                notified
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              }`}
            >
              {notified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Follow-up Logged
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  Notify Student / Parent
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
