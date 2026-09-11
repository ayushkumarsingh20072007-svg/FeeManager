import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const getColors = () => {
    switch (role) {
      case 'ACCOUNTS_OFFICER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FINANCE_APPROVER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'MANAGEMENT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ADMIN':
      case 'SYSTEM_ADMIN':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'STUDENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PARENT':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${getColors()}`}>
      {role.replace('_', ' ')}
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    const s = status.toUpperCase();
    if (s.includes('PAID') && !s.includes('PARTIAL') && !s.includes('UNPAID')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
    if (s.includes('PARTIAL')) {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    if (s.includes('OVERDUE') || s.includes('FAILED') || s.includes('REJECTED')) {
      return 'bg-red-50 text-red-700 border-red-300';
    }
    if (s.includes('RECONCILED') || s.includes('SUCCESS') || s.includes('APPROVED') || s.includes('ACTIVE') || s.includes('PROCESSED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
    if (s.includes('PENDING') || s.includes('REVIEW') || s.includes('REQUESTED')) {
      return 'bg-purple-50 text-purple-700 border-purple-300';
    }
    return 'bg-slate-50 text-slate-700 border-slate-300';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide border ${getStatusStyles()}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
