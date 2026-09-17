import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CollectionTrendItem } from '../../types';

interface CollectionTrendChartProps {
  data: CollectionTrendItem[];
  loading?: boolean;
}

const fmtLakhs = (val: number) => {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const collected = payload.find((p: any) => p.dataKey === 'collected')?.value || 0;
    const target = payload.find((p: any) => p.dataKey === 'target')?.value || 0;
    const pct = target > 0 ? ((collected / target) * 100).toFixed(1) : '0';

    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
        <div className="font-bold text-slate-300 border-b border-slate-700 pb-1">
          Month: {label}
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-emerald-400 font-medium">Reconciled Paid:</span>
          <span className="font-mono font-bold">₹{collected.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400 font-medium">Baseline Target:</span>
          <span className="font-mono text-slate-300">₹{target.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
          <span className="text-amber-400 font-semibold">Target Achieved:</span>
          <span className="font-mono font-bold text-amber-300">{pct}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const CollectionTrendChart: React.FC<CollectionTrendChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-xs text-slate-500 font-medium">Loading collection trend metrics...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 text-xs text-slate-500">
        No monthly collection data available.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtLakhs}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="target"
            name="Baseline Target"
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="collected"
            name="Reconciled Collections"
            stroke="#059669"
            strokeWidth={3}
            dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 7, fill: '#047857' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
