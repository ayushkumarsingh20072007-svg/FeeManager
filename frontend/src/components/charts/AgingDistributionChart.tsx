import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { AgingDistributionItem } from '../../types';

interface AgingDistributionChartProps {
  data: AgingDistributionItem[];
  totalOutstanding: number;
  totalDefaulters: number;
  loading?: boolean;
  onSliceClick?: (bucketCode: string) => void;
}

const fmtLakhs = (val: number) => {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item: AgingDistributionItem = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
        <div className="font-bold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>Aging Bucket: {item.bucket}</span>
        </div>
        <div className="text-slate-300 font-mono">
          Outstanding: <span className="font-bold text-white">₹{item.amount.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-slate-400">
          Student Count: <span className="font-bold text-amber-300 font-mono">{item.count}</span>
        </div>
        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 italic">
          Click slice to filter student roster
        </div>
      </div>
    );
  }
  return null;
};

export const AgingDistributionChart: React.FC<AgingDistributionChartProps> = ({
  data,
  totalOutstanding,
  totalDefaulters,
  loading,
  onSliceClick,
}) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-xs text-slate-500 font-medium">Loading aging breakdown...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 text-xs text-slate-500">
        No aging receivables data found.
      </div>
    );
  }

  return (
    <div className="relative w-full h-72 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="bucket"
            cx="50%"
            cy="45%"
            innerRadius={65}
            outerRadius={92}
            paddingAngle={3}
            cursor="pointer"
            onClick={(entry: any) => {
              const code = entry?.bucket_code || entry?.payload?.bucket_code || entry?.name;
              if (onSliceClick && code) {
                onSliceClick(code);
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Donut Hole Center Label */}
      <div className="absolute top-[41%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Due</div>
        <div className="text-sm font-black text-slate-900 font-mono">{fmtLakhs(totalOutstanding)}</div>
        <div className="text-[9px] text-red-600 font-medium font-mono">{totalDefaulters} Students</div>
      </div>
    </div>
  );
};
