import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { TaskItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { CheckSquare, CheckCircle2, AlertCircle } from 'lucide-react';

export const EmployeeTasks: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GET /api/tasks/mine
  const { data: tasks, isLoading, isError, error } = useQuery<TaskItem[]>({
    queryKey: ['myTasks'],
    queryFn: () => fetchApi<TaskItem[]>('/tasks/mine', {}, token),
  });

  // PATCH /api/tasks/:id/status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetchApi<TaskItem>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setToastMessage(`Task "${updatedTask.title}" status updated to ${updatedTask.status}.`);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update task status.');
    },
  });

  const handleStatusChange = (taskId: string, newStatus: string) => {
    setErrorMessage(null);
    updateStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">My Assigned Tasks</h1>
        <p className="text-ink-muted text-sm mt-1">Review your deliverables and update task progress.</p>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-bold text-ink">My Work Items</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : isError ? (
          <div className="p-6 text-red-600 text-sm">Failed to load tasks: {(error as Error).message}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-border text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  <th className="py-3.5 px-6">Task Title & Description</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6">Current Status</th>
                  <th className="py-3.5 px-6">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-ink">
                {tasks && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 max-w-md">
                        <div className="font-semibold text-ink">{task.title}</div>
                        <div className="text-xs text-ink-muted mt-1 leading-relaxed">{task.description}</div>
                      </td>
                      <td className="py-4 px-6 text-ink-muted whitespace-nowrap text-xs font-medium">
                        {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <select
                          value={task.status}
                          disabled={updateStatusMutation.isPending}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold bg-white text-ink focus:outline-none focus:border-brand cursor-pointer hover:border-brand-accent transition-all"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="OVERDUE" disabled>
                            Overdue
                          </option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 px-6 text-center text-ink-muted text-sm">
                      You currently have no assigned tasks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
