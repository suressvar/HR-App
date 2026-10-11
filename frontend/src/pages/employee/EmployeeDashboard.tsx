import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DashboardSummary } from '../../types/models';
import { Clock, CheckCircle2, AlertTriangle, Hourglass, ArrowRight, FileSpreadsheet, PlusCircle } from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { token } = useAuth();

  const { data, isLoading, isError, error } = useQuery<DashboardSummary>({
    queryKey: ['employeeDashboard'],
    queryFn: () => fetchApi<DashboardSummary>('/dashboard/employee', {}, token),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-xs">
        <div className="w-8 h-8 border-4 border-[#107c41] border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-[#107c41] font-bold">Loading Employee Sheet...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
        Failed to load metrics: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Workspace Summary</h1>
          </div>
        </div>

        <Link
          to="/employee/tasks/a-to-z"
          className="px-3.5 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Allocate Task</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Tasks */}
        <Link
          to="/employee/tasks/a-to-z"
          className="bg-white rounded-lg border border-slate-300 hover:border-[#107c41] p-3.5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Total Tasks</span>
            <Hourglass className="w-4 h-4 text-[#107c41]" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900">{data?.totalTasks ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Allocated Tasks</span>
          </div>
          <div className="text-[16px] text-[#107c41] bg-emerald-50 px-2 py-1 rounded flex items-center justify-between font-semibold">
            <span>View Tasks Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* In Progress */}
        <div className="bg-white rounded-lg border border-slate-300 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Active Progress</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-sky-700">
              {data?.totalTasks ? data.totalTasks - ((data.completedTasks || 0) + (data.overdueTasks || 0)) : 0}
            </span>
            <span className="text-xs text-slate-500 ml-2">Currently Working</span>
          </div>
          <div className="text-[16px] text-sky-700 bg-sky-50 px-2 py-1 rounded font-semibold">
            In Progress
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-lg border border-slate-300 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-emerald-700">{data?.completedTasks ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Completed Tasks</span>
          </div>
          <div className="text-[16px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-semibold">
            {data?.totalTasks ? `${Math.round(((data.completedTasks || 0) / data.totalTasks) * 100)}% Finished` : '0%'}
          </div>
        </div>

        {/* Overdue */}
        <Link
          to="/employee/tasks/pending"
          className="bg-white rounded-lg border border-red-200 hover:border-red-400 p-3.5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-red-100 pb-2">
            <span className="text-xs font-bold text-red-700 uppercase">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-red-600">{data?.overdueTasks ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Action Required</span>
          </div>
          <div className="text-[16px] text-red-700 bg-red-50 px-2 py-1 rounded flex items-center justify-between font-semibold">
            <span>Review Pending</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Helpful Instruction Box */}
      <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Worksheet Navigation</h2>
        </div>
        <Link
          to="/employee/tasks/a-to-z"
          className="px-4 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <span>Open Tasks Worksheet</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
