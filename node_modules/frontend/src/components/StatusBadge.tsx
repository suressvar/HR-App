import React from 'react';

export type BadgeStatus = 'COMPLETED' | 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'IN_REVIEW' | 'ACTIVE' | string;

interface StatusBadgeProps {
  status: BadgeStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Completed
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Pending
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
          In Progress
        </span>
      );
    case 'OVERDUE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          Overdue
        </span>
      );
    case 'IN_REVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
          In Review
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Active
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
          {status}
        </span>
      );
  }
};
