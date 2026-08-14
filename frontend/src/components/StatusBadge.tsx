import React from 'react';

export type BadgeStatus = 'COMPLETED' | 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'ACTIVE' | string;

interface StatusBadgeProps {
  status: BadgeStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]">
          Completed
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">
          Pending
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EDE4FC] text-[#7C3AED] border border-[#DDD6FE]">
          In Progress
        </span>
      );
    case 'OVERDUE':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
          Overdue
        </span>
      );
    case 'IN_REVIEW':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
          In Review
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]">
          Active
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};
