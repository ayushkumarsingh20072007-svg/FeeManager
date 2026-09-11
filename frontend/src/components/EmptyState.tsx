import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  description = 'There are currently no entries to display in this view.',
  icon: Icon = Inbox,
  action,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
