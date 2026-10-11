import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DashboardSummary, TaskItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { Users, CheckCircle2, Clock, AlertTriangle, Check, ArrowRight, FileSpreadsheet } from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const getFrequencyStyle = (f?: string) => {
    switch (f) {
      case 'DAILY':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'WEEKLY':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'YEARLY':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'ONE_TIME':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // GET summary metrics
  const { data, isLoading: isSummaryLoading, isError: isSummaryError, error: summaryError } = useQuery<DashboardSummary>({
    queryKey: ['ownerDashboard'],
    queryFn: () => fetchApi<DashboardSummary>('/dashboard/owner', {}, token),
  });

  // GET all tasks (to filter IN_REVIEW ones)
  const { data: tasks, isLoading: isTasksLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks'],
    queryFn: () => fetchApi<TaskItem[]>('/tasks', {}, token),
  });

  // PATCH approve task
  const approveTaskMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<TaskItem>(`/tasks/${id}/approve`, { method: 'PATCH' }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDashboard'] });
    },
  });

  const isLoading = isSummaryLoading || isTasksLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-xs">
        <div className="w-8 h-8 border-4 border-[#107c41] border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-[#107c41] font-bold">Loading Excel Worksheet Data...</span>
      </div>
    );
  }

  if (isSummaryError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
        Failed to load worksheet data: {(summaryError as Error).message}
      </div>
    );
  }

  const inReviewTasks = tasks?.filter((t) => t.status === 'IN_REVIEW') || [];

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Executive Summary</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/owner/assign-work/a-to-z"
            className="px-3 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Assign Task</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards (Spreadsheet Summary Totals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Staff */}
        <Link
          to="/owner/employees"
          className="bg-white rounded-lg border border-slate-300 hover:border-[#107c41] p-3.5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Staff</span>
            <Users className="w-4 h-4 text-[#107c41]" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900">{data?.totalEmployees ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Active Employees</span>
          </div>
          <div className="text-[16px] text-[#107c41] bg-emerald-50 px-2 py-1 rounded flex items-center justify-between font-semibold">
            <span>View Staff Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Total Tasks */}
        <Link
          to="/owner/assign-work/a-to-z"
          className="bg-white rounded-lg border border-slate-300 hover:border-[#107c41] p-3.5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Tasks</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900">{data?.totalTasks ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Deliverables</span>
          </div>
          <div className="text-[16px] text-sky-700 bg-sky-50 px-2 py-1 rounded flex items-center justify-between font-semibold">
            <span>View Task Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Completed Tasks */}
        <div className="bg-white rounded-lg border border-slate-300 p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-emerald-700">{data?.completedTasks ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Finished Tasks</span>
          </div>
          <div className="text-[16px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-semibold">
            {data?.totalTasks ? `${Math.round(((data.completedTasks || 0) / data.totalTasks) * 100)}% Completion Rate` : '0%'}
          </div>
        </div>

        {/* Overdue Tasks */}
        <Link
          to="/owner/assign-work/pending"
          className="bg-white rounded-lg border border-red-200 hover:border-red-400 p-3.5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-red-100 pb-2">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-red-600">{data?.overdueTasks ?? 0}</span>
            <span className="text-xs text-slate-500 ml-2">Needs Attention</span>
          </div>
          <div className="text-[16px] text-red-700 bg-red-50 px-2 py-1 rounded flex items-center justify-between font-semibold">
            <span>Check Pending</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* In Review / Pending Approval Spreadsheet Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-[#f8fafc] px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Tasks Waiting For Approval ({inReviewTasks.length})
            </h2>
          </div>
        </div>

        {inReviewTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No tasks currently pending approval.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} className="text-center">#</th>
                  <th>Task Title</th>
                  <th>Assigned Employee</th>
                  <th>Due Date</th>
                  <th>Submission Notes</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {inReviewTasks.map((task, idx) => (
                  <tr key={task.id}>
                    <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="font-semibold text-slate-900">{task.title}</td>
                    <td className="text-slate-700">{task.employee?.name || 'Unassigned'}</td>
                    <td className="text-slate-600">{new Date(task.dueDate).toLocaleDateString('en-GB')}</td>
                    <td className="text-slate-600 italic">{task.completionNotes || 'No notes provided'}</td>
                    <td className="text-center">
                      <button
                        onClick={() => approveTaskMutation.mutate(task.id)}
                        disabled={approveTaskMutation.isPending}
                        className="px-3 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded text-xs shadow-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Task</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Performance Spreadsheet Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-[#f8fafc] px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Staff Progress Sheet (By Employee)
          </h2>
          <span className="text-xs text-slate-500">Total Staff: {data?.employeeProgress?.length ?? 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="excel-grid-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">#</th>
                <th>Employee Name</th>
                <th>Role / Designation</th>
                <th className="text-right">Total Allocated</th>
                <th className="text-right">Completed</th>
                <th className="text-right">In Progress</th>
                <th className="text-right">Overdue</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.employeeProgress?.map((emp, idx) => (
                <tr key={emp.id}>
                  <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="font-bold text-slate-900">{emp.name}</td>
                  <td className="text-slate-600">{emp.role}</td>
                  <td className="text-right font-bold text-[#107c41]">{emp.totalTasks}</td>
                  <td className="text-right font-bold text-emerald-700">{emp.completedTasks}</td>
                  <td className="text-right font-bold text-sky-700">{emp.inProgressTasks}</td>
                  <td className="text-right font-bold text-red-600">{emp.overdueTasks}</td>
                  <td className="text-center">
                    <StatusBadge status={emp.status} />
                  </td>
                </tr>
              ))}
              {(!data?.employeeProgress || data.employeeProgress.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No staff records found in worksheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Self-Allocated Tasks Register */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-[#f8fafc] px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Recent Self-Allocated Tasks Sheet
          </h2>
          <span className="text-xs text-slate-500">Work Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="excel-grid-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">#</th>
                <th>Task Title</th>
                <th>Employee</th>
                <th>Frequency</th>
                <th>Due Date</th>
                <th>Entries / Time</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentSelfAllocatedTasks?.map((task, idx) => (
                <tr key={task.id}>
                  <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="font-semibold text-slate-900">{task.title}</td>
                  <td className="text-slate-700">{task.employee?.name || 'Self'}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[16px] font-bold border ${getFrequencyStyle(task.frequency)}`}>
                      {task.frequency || 'ONE_TIME'}
                    </span>
                  </td>
                  <td className="text-slate-600">{new Date(task.dueDate).toLocaleDateString('en-GB')}</td>
                  <td className="text-slate-600">
                    {task.noOfEntry ? `${task.noOfEntry} entries (${task.totalTime || 0} mins)` : '-'}
                  </td>
                  <td className="text-center">
                    <StatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
              {(!data?.recentSelfAllocatedTasks || data.recentSelfAllocatedTasks.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No self-allocated task records found recently.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
