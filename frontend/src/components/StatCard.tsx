import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: 'brand' | 'emerald' | 'purple' | 'amber' | 'rose' | 'blue' | 'indigo' | 'red';
  trend?: string;
  badge?: { text: string; color?: string };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'brand',
  trend,
  badge,
  onClick,
}) => {
  const getColorStyles = () => {
    switch (color) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-100 text-emerald-700',
          valueColor: 'text-emerald-950',
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-100 text-purple-700',
          valueColor: 'text-purple-950',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-100 text-amber-700',
          valueColor: 'text-amber-950',
        };
      case 'rose':
      case 'red':
        return {
          iconBg: 'bg-red-100 text-red-700',
          valueColor: 'text-red-950',
        };
      case 'indigo':
        return {
          iconBg: 'bg-indigo-100 text-indigo-700',
          valueColor: 'text-indigo-950',
        };
      case 'blue':
        return {
          iconBg: 'bg-blue-100 text-blue-700',
          valueColor: 'text-blue-950',
        };
      default:
        return {
          iconBg: 'bg-brand-100 text-brand-700',
          valueColor: 'text-slate-900',
        };
    }
  };

  const styles = getColorStyles();

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
        onClick ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${styles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-black font-mono tracking-tight ${styles.valueColor}`}>
            {value}
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className="mt-2 text-[11px] font-semibold text-brand-700 flex items-center gap-1">
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};
