import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { TaskItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { CheckSquare, CheckCircle2, AlertCircle, PlusCircle, X, Clock } from 'lucide-react';

export const EmployeeTasks: React.FC = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Task creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [frequency, setFrequency] = useState<'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'YEARLY'>('ONE_TIME');

  // Task submission notes modal state
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // GET /api/tasks/mine
  const { data: tasks, isLoading, isError, error } = useQuery<TaskItem[]>({
    queryKey: ['myTasks'],
    queryFn: () => fetchApi<TaskItem[]>('/tasks/mine', {}, token),
  });

  // PATCH /api/tasks/:id/status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, completionNotes }: { id: string; status: string; completionNotes?: string }) =>
      fetchApi<TaskItem>(
        `/tasks/${id}/status`,
        { method: 'PATCH', body: JSON.stringify({ status, completionNotes }) },
        token
      ),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setToastMessage(
        updatedTask.status === 'IN_REVIEW'
          ? `Submitted task "${updatedTask.title}" for review.`
          : `Task "${updatedTask.title}" status updated to ${updatedTask.status}.`
      );
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update task status.');
    },
  });

  // POST /api/tasks (Self-allocate)
  const createTaskMutation = useMutation({
    mutationFn: (newTask: {
      employeeId: string;
      title: string;
      description: string;
      dueDate: string;
      priority: string;
      estimatedHours?: number;
      category: string;
      frequency: string;
    }) => fetchApi<TaskItem>('/tasks', { method: 'POST', body: JSON.stringify(newTask) }, token),
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setToastMessage(`Successfully self-allocated task "${createdTask.title}".`);
      setErrorMessage(null);
      setIsModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setPriority('MEDIUM');
      setEstimatedHours('');
      setCategory('TECHNICAL');
      setFrequency('ONE_TIME');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to self-allocate task.');
    },
  });

  const handleStatusChange = (task: TaskItem, newStatus: string) => {
    setErrorMessage(null);
    if (newStatus === 'IN_REVIEW') {
      setSelectedTaskForReview(task);
      setCompletionNotes('');
    } else {
      updateStatusMutation.mutate({ id: task.id, status: newStatus });
    }
  };

  const handleReviewNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForReview) return;

    updateStatusMutation.mutate({
      id: selectedTaskForReview.id,
      status: 'IN_REVIEW',
      completionNotes: completionNotes.trim() ? completionNotes : null as any,
    });
    setSelectedTaskForReview(null);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newDueDate) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    createTaskMutation.mutate({
      employeeId: user?.profile?.id || '',
      title: newTitle,
      description: newDescription,
      dueDate: new Date(newDueDate).toISOString(),
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      category,
      frequency,
    });
  };

  const getPriorityStyle = (p?: string) => {
    switch (p) {
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'MEDIUM':
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  const getFrequencyStyle = (f?: string) => {
    switch (f) {
      case 'DAILY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WEEKLY':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'YEARLY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ONE_TIME':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">My Workspace Tasks</h1>
          <p className="text-ink-muted text-sm mt-1">Review your deliverables, self-allocate new tasks, and update progress.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg shadow-md shadow-purple-600/10 flex items-center justify-center gap-2 self-start sm:self-auto transition-all duration-200"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          <span>Self-Allocate Task</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in">
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
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2 shadow-sm">
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
                  <th className="py-3.5 px-6">Task Attributes</th>
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
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2.5 items-center">
                          {/* Priority Badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityStyle(task.priority)}`}>
                            {task.priority || 'MEDIUM'}
                          </span>
                          {/* Category Badge */}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {task.category || 'TECHNICAL'}
                          </span>
                          {/* Frequency Badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getFrequencyStyle(task.frequency)}`}>
                            {task.frequency === 'ONE_TIME' ? 'One-Time' : task.frequency || 'One-Time'}
                          </span>
                          {/* Est. Hours */}
                          {task.estimatedHours && (
                            <span className="text-[10px] text-ink-muted flex items-center gap-1 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-brand" />
                              <span>{task.estimatedHours}h est.</span>
                            </span>
                          )}
                        </div>
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
                          disabled={updateStatusMutation.isPending || task.status === 'COMPLETED'}
                          onChange={(e) => handleStatusChange(task, e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold bg-white text-ink focus:outline-none focus:border-brand cursor-pointer hover:border-brand-accent transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option className="bg-white text-ink" value="PENDING">Pending</option>
                          <option className="bg-white text-ink" value="IN_PROGRESS">In Progress</option>
                          <option className="bg-white text-ink" value="IN_REVIEW">Submit for Review</option>
                          {task.status === 'COMPLETED' && <option className="bg-white text-ink" value="COMPLETED">Completed (Approved)</option>}
                          <option className="bg-white text-ink" value="OVERDUE" disabled>
                            Overdue
                          </option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-6 text-center text-ink-muted text-sm">
                      You currently have no tasks. Click "Self-Allocate Task" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Premium Self-Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <PlusCircle className="w-6 h-6 text-brand" />
              <h2 className="text-lg font-bold text-ink">Self-Allocate New Task</h2>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Conduct corridor audit"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          priority === p
                            ? p === 'LOW'
                              ? 'bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-100'
                              : p === 'MEDIUM'
                              ? 'bg-sky-50 text-sky-700 border-sky-300 ring-2 ring-sky-100'
                              : p === 'HIGH'
                              ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-100'
                            : 'bg-white text-ink hover:bg-slate-50 border-border'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                    Task Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['ADMIN', 'TECHNICAL', 'SUPPORT', 'CREATIVE', 'OPERATIONS', 'OTHER'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          category === c
                            ? 'bg-brand-light text-brand border-brand-accent ring-2 ring-brand-light'
                            : 'bg-white text-ink hover:bg-slate-50 border-border'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                    Task Frequency
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['ONE_TIME', 'DAILY', 'WEEKLY', 'YEARLY'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          frequency === f
                            ? f === 'DAILY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100'
                              : f === 'WEEKLY'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-100'
                              : f === 'YEARLY'
                              ? 'bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-100'
                              : 'bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-100'
                            : 'bg-white text-ink hover:bg-slate-50 border-border'
                        }`}
                      >
                        {f === 'ONE_TIME' ? 'ONE TIME' : f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                    Estimated Time (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 4.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                    Task Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Detail the scope of work, key deliverables, and context..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2.5 border border-border hover:bg-slate-50 text-ink-muted font-semibold rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-sm shadow-md shadow-purple-600/10 disabled:opacity-75 flex items-center gap-2 transition-all"
                >
                  {createTaskMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Notes Modal */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => setSelectedTaskForReview(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-ink mb-2">Submit Task for Review</h2>
            <p className="text-xs text-ink-muted mb-4">
              Describe the completion details or key findings for the owner to review.
            </p>

            <form onSubmit={handleReviewNotesSubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. All reports generated and uploaded. Findings look solid..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm resize-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForReview(null)}
                  className="px-4 py-2 border border-border hover:bg-slate-50 text-ink-muted font-semibold rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-sm shadow-md shadow-purple-600/10"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
