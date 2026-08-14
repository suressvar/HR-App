import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { DashboardSummary, TaskItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { Users, CheckCircle2, Clock, AlertTriangle, Check } from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isSummaryError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fade-in">
        Failed to load dashboard metrics: {(summaryError as Error).message}
      </div>
    );
  }

  // Filter tasks pending approval
  const inReviewTasks = tasks?.filter((t) => t.status === 'IN_REVIEW') || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Clean, Simple Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Executive Dashboard</h1>
        <p className="text-ink-muted text-sm mt-1">High-level workforce performance, self-allocation tracking, and task overview.</p>
      </div>

      {/* High-Legibility Overview Grid with Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Employees -> Link to Employees page */}
        <Link
          to="/owner/employees"
          className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between cursor-pointer text-left block"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Total Staff</span>
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-ink mt-3">{data?.totalEmployees ?? 0}</p>
          </div>
          <p className="text-xs font-medium text-ink-muted border-t border-slate-50 pt-2.5 mt-4">
            Active workers registered in your system. Click to view staff.
          </p>
        </Link>

        {/* Total Tasks -> Link to Tasks workspace */}
        <Link
          to="/owner/assign-work"
          className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between cursor-pointer text-left block"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">All Work Items</span>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-ink mt-3">{data?.totalTasks ?? 0}</p>
          </div>
          <p className="text-xs font-medium text-ink-muted border-t border-slate-50 pt-2.5 mt-4">
            Total self-allocated tasks. Click to view all tasks.
          </p>
        </Link>

        {/* Completed Tasks -> Link to Tasks workspace */}
        <Link
          to="/owner/assign-work"
          className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between cursor-pointer text-left block"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Approved Tasks</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 mt-3">{data?.completedTasks ?? 0}</p>
          </div>
          <p className="text-xs font-medium text-ink-muted border-t border-slate-50 pt-2.5 mt-4">
            Tasks successfully completed. Click to manage tasks.
          </p>
        </Link>

        {/* Overdue Tasks -> Link to Tasks workspace */}
        <Link
          to="/owner/assign-work"
          className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md hover:border-brand/40 transition-all flex flex-col justify-between cursor-pointer text-left block"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Overdue Tasks</span>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-red-600 mt-3">{data?.overdueTasks ?? 0}</p>
          </div>
          <p className="text-xs font-medium text-ink-muted border-t border-slate-50 pt-2.5 mt-4 text-red-600 font-semibold">
            Passed their deadlines. Click to manage tasks.
          </p>
        </Link>
      </div>

      {/* ACTION REQUIRED: Pending Approval Feed */}
      {inReviewTasks.length > 0 ? (
        <div className="bg-gradient-to-br from-amber-50/50 via-white to-brand/5 rounded-xl border-2 border-brand/20 p-6 shadow-md animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand/10">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-brand animate-pulse shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-ink uppercase tracking-wider">⚠️ Action Required: Tasks Pending Your Approval ({inReviewTasks.length})</h2>
                <p className="text-xs text-ink-muted mt-0.5">Staff members have finished these tasks and are waiting for your check-off.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inReviewTasks.map((task) => (
              <div key={task.id} className="bg-white border border-border rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {task.category || 'TECHNICAL'}
                    </span>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {task.priority || 'MEDIUM'} Priority
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-ink text-base leading-snug">{task.title}</h3>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">{task.description}</p>
                  </div>

                  {task.completionNotes && (
                    <div className="p-3.5 rounded-lg bg-emerald-50/40 border border-emerald-100/80 text-xs text-emerald-900 leading-relaxed font-medium">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                        <span>📝 Worker's Notes</span>
                      </div>
                      "{task.completionNotes}"
                    </div>
                  )}

                  <div className="text-xs text-ink-muted border-t border-slate-50 pt-2.5 flex items-center justify-between font-medium">
                    <span>
                      Worker: <strong className="text-ink font-bold text-sm">{task.employee?.name}</strong>
                    </span>
                    <span className="whitespace-nowrap text-red-600 font-semibold bg-red-50/50 px-2 py-0.5 rounded text-[10px] uppercase">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => approveTaskMutation.mutate(task.id)}
                    disabled={approveTaskMutation.isPending}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-75"
                  >
                    {approveTaskMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>Approve & Complete Task</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/20 border border-emerald-200/50 rounded-xl p-5 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-950 text-sm">All Caught Up!</h3>
            <p className="text-xs text-emerald-800/80 mt-0.5">There are no employee tasks currently waiting for your review.</p>
          </div>
        </div>
      )}

      {/* Tracker and Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workforce Task Progress Tracker */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4.5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink">📊 Staff Workloads & Progress</h2>
              <p className="text-[11px] text-ink-muted mt-0.5">A complete list of your staff and their task completion metrics.</p>
            </div>
            {/* Guide Legend */}
            <div className="flex items-center flex-wrap gap-3 text-[10px] font-bold text-ink-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand" /> Active</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Overdue</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 border-b border-border text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-5">Employee & Role</th>
                  <th className="py-3 px-5">Task Breakdown</th>
                  <th className="py-3 px-5 text-right pr-6">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-ink">
                {data?.employeeProgress && data.employeeProgress.length > 0 ? (
                  data.employeeProgress.map((emp) => {
                    const rate = emp.totalTasks > 0 ? Math.round((emp.completedTasks / emp.totalTasks) * 100) : 0;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-extrabold text-ink text-sm">{emp.name}</div>
                          <div className="text-ink-muted mt-0.5 text-xs font-medium">{emp.role}</div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <span className="text-brand bg-brand-light px-2 py-0.5 rounded text-xs">{emp.inProgressTasks} active</span>
                            <span className="text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded text-xs">{emp.completedTasks} done</span>
                            {emp.overdueTasks > 0 && (
                              <span className="text-red-700 bg-red-100/50 px-2 py-0.5 rounded text-xs">{emp.overdueTasks} overdue</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 max-w-[180px] text-right pr-6">
                          <div className="flex items-center justify-end gap-3.5">
                            <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  rate === 100
                                    ? 'bg-emerald-500'
                                    : rate > 50
                                    ? 'bg-brand'
                                    : rate > 0
                                    ? 'bg-amber-500'
                                    : 'bg-slate-200'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-ink text-sm whitespace-nowrap min-w-[36px] text-right">
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="py-12 px-5 text-center text-ink-muted">
                      No active employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Self-Allocation Feed */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4.5 border-b border-border bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">🔔 Recent Task Activity</h2>
              <p className="text-[11px] text-ink-muted mt-0.5">The last 5 tasks self-allocated by staff.</p>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              Live Feed
            </span>
          </div>

          <div className="p-5 flex-1 divide-y divide-slate-100 overflow-y-auto space-y-4 max-h-[420px]">
            {data?.recentSelfAllocatedTasks && data.recentSelfAllocatedTasks.length > 0 ? (
              data.recentSelfAllocatedTasks.map((task) => (
                <div key={task.id} className="pt-3.5 first:pt-0 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="font-bold text-ink text-xs leading-snug line-clamp-2 hover:line-clamp-none transition-all">
                      {task.title}
                    </h3>
                    <div className="scale-90 origin-right shrink-0">
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                  <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[9px] pt-1">
                    <span className="font-extrabold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200/40">
                      {task.category || 'TECHNICAL'}
                    </span>
                    {task.estimatedHours && (
                      <span className="text-ink-muted font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand" /> {task.estimatedHours}h est.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1 border-t border-slate-50/50">
                    <span>
                      Worker: <strong className="text-ink font-semibold">{task.employee?.name || 'Staff'}</strong>
                    </span>
                    <span className="font-medium">
                      {new Date(task.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-ink-muted text-xs">
                No recent task allocations.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
