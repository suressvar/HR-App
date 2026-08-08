import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DashboardSummary } from '../../types/models';
import { Clock, CheckCircle2, AlertTriangle, Hourglass } from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { token } = useAuth();

  const { data, isLoading, isError, error } = useQuery<DashboardSummary>({
    queryKey: ['employeeDashboard'],
    queryFn: () => fetchApi<DashboardSummary>('/dashboard/employee', {}, token),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Failed to load metrics: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">My Workspace Dashboard</h1>
        <p className="text-ink-muted text-sm mt-1">Overview of your assigned tasks and personal performance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total / Pending Tasks */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Total Assigned</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-ink mt-4">{data?.totalTasks ?? 0}</p>
          <span className="inline-block text-xs font-medium text-ink-muted mt-2">Assigned task items</span>
        </div>

        {/* In Progress Tasks */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Active Progress</span>
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-brand mt-4">{data?.totalTasks ? data.totalTasks - (data.completedTasks + data.overdueTasks) : 0}</p>
          <span className="inline-block text-xs font-medium text-ink-muted mt-2">Currently being worked on</span>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Completed</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-4">{data?.completedTasks ?? 0}</p>
          <span className="inline-block text-xs font-medium text-ink-muted mt-2">Completed deliverables</span>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Overdue</span>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-red-600 mt-4">{data?.overdueTasks ?? 0}</p>
          <span className="inline-block text-xs font-medium text-ink-muted mt-2">Requires immediate action</span>
        </div>
      </div>
    </div>
  );
};
