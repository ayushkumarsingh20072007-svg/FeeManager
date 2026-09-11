import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading verified institutional records from ledger...',
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
      <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs font-medium text-slate-500 font-mono">{message}</p>
    </div>
  );
};
