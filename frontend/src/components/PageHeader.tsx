import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  badge?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                {b.href ? (
                  <span className="hover:text-slate-600 transition-colors">{b.label}</span>
                ) : (
                  <span className="text-slate-600 font-semibold">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center space-x-2.5">
          {Icon && (
            <div className="p-2 rounded-lg bg-blue-50 text-brand-600 border border-blue-100">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-brand-700 border border-blue-200">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-500 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
};
