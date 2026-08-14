import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DashboardSummary } from '../../types/models';
import { Clock, CheckCircle2, AlertTriangle, Hourglass, ArrowRight } from 'lucide-react';

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
        <p className="text-ink-muted text-sm mt-1">Overview of your self-allocated tasks, active progress, and workspace metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total / Pending Tasks */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Total Allocated</span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-ink mt-4">{data?.totalTasks ?? 0}</p>
          <span className="inline-block text-xs font-medium text-ink-muted mt-2">Self-allocated tasks</span>
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

      {/* Quick Action Info Card */}
      <div className="bg-gradient-to-r from-purple-500/5 via-brand/5 to-pink-500/5 rounded-xl border border-brand/10 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-bold text-ink text-base">Self-Directed Schedule</h2>
          <p className="text-xs text-ink-muted mt-1 max-w-xl">
            You are responsible for self-allocating your tasks. Create new deliverables in your tasks workspace to track your progress and share updates automatically with the owner.
          </p>
        </div>
        <Link
          to="/employee/tasks"
          className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg shadow-md shadow-purple-600/10 flex items-center justify-center gap-2 self-start md:self-auto transition-all"
        >
          <span>Go to Tasks Workspace</span>
          <ArrowRight className="w-4.5 h-4.5" />
        </Link>
      </div>
    </div>
  );
};
