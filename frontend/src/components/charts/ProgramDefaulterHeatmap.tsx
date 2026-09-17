import React, { useState } from 'react';
import { HeatmapCellDetail } from '../../types';
import { Users, Info } from 'lucide-react';

interface ProgramDefaulterHeatmapProps {
  programs: string[];
  buckets: string[];
  matrix: number[][];
  details: Record<string, HeatmapCellDetail>;
  loading?: boolean;
  onCellClick?: (programCode: string, bucketName: string) => void;
}

const getCellBgColor = (count: number, bucketIndex: number) => {
  if (count === 0) return 'bg-slate-100 text-slate-400 hover:bg-slate-200/80';
  if (bucketIndex === 0) {
    // Current (Emerald)
    return count > 5 ? 'bg-emerald-500 text-white font-bold' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
  }
  if (bucketIndex === 1) {
    // 0-30 days (Blue/Yellow)
    return count > 5 ? 'bg-blue-600 text-white font-bold' : 'bg-blue-100 text-blue-800 hover:bg-blue-200';
  }
  if (bucketIndex === 2) {
    // 31-60 days (Amber/Orange)
    return count > 3 ? 'bg-amber-500 text-white font-bold' : 'bg-amber-100 text-amber-900 hover:bg-amber-200';
  }
  // 60+ days (Red)
  return count > 2 ? 'bg-red-600 text-white font-bold' : 'bg-red-100 text-red-900 hover:bg-red-200';
};

export const ProgramDefaulterHeatmap: React.FC<ProgramDefaulterHeatmapProps> = ({
  programs,
  buckets,
  matrix,
  details,
  loading,
  onCellClick,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ p: string; b: string; detail: HeatmapCellDetail } | null>(null);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-xs text-slate-500 font-medium">Loading program defaulter matrix...</span>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 text-xs text-slate-500">
        No program defaulter heatmap available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Heatmap Grid Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white border-b border-slate-800">
              <th className="py-2.5 px-3 text-left font-bold w-32 border-r border-slate-800">
                Program / Cohort
              </th>
              {buckets.map((b, idx) => (
                <th key={idx} className="py-2.5 px-2 text-center font-bold">
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programs.map((prog, pIdx) => (
              <tr key={prog} className="hover:bg-slate-50/60">
                <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-100 bg-slate-50/50 font-mono text-[11px]">
                  {prog}
                </td>
                {buckets.map((b, bIdx) => {
                  const count = matrix[pIdx] ? matrix[pIdx][bIdx] : 0;
                  const cellKey = `${prog}_${b}`;
                  const detail = details[cellKey] || { count: 0, amount: 0, student_ids: [] };
                  const bgClass = getCellBgColor(count, bIdx);

                  return (
                    <td key={bIdx} className="p-1 text-center">
                      <button
                        onClick={() => onCellClick && onCellClick(prog, b)}
                        onMouseEnter={() => setHoveredCell({ p: prog, b, detail })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer font-mono font-bold text-xs shadow-2xs flex items-center justify-center gap-1 ${bgClass}`}
                        title={`${prog} — ${b}: ${detail.count} students, ₹${detail.amount.toLocaleString('en-IN')}`}
                      >
                        <span>{count}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hover Info Tooltip Bar */}
      <div className="p-2.5 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between min-h-[38px] shadow-sm">
        {hoveredCell ? (
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-brand-300" />
            <span className="font-semibold text-brand-300">{hoveredCell.p}</span>
            <span className="text-slate-400">•</span>
            <span>Bucket: <strong className="text-white">{hoveredCell.b}</strong></span>
            <span className="text-slate-400">•</span>
            <span>Count: <strong className="text-amber-300 font-mono">{hoveredCell.detail.count} students</strong></span>
            <span className="text-slate-400">•</span>
            <span>Outstanding: <strong className="text-emerald-300 font-mono">₹{hoveredCell.detail.amount.toLocaleString('en-IN')}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Hover over any program matrix cell to inspect defaulter counts and total outstanding balance. Click cell to filter roster.</span>
          </div>
        )}
      </div>
    </div>
  );
};
