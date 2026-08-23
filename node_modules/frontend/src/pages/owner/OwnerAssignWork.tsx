import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { TaskItem, EmployeeItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { PlusCircle, Filter, CheckCircle2, AlertCircle } from 'lucide-react';

export const OwnerAssignWork: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'YEARLY'>('ONE_TIME');

  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFrequency, setFilterFrequency] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'A_TO_Z' | 'TEN_POINTS' | 'PENDING'>('A_TO_Z');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  // GET /api/employees for dropdown
  const { data: employees } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: () => fetchApi<EmployeeItem[]>('/employees', {}, token),
  });

  // GET /api/tasks
  const { data: tasks, isLoading, isError, error } = useQuery<TaskItem[]>({
    queryKey: ['tasks'],
    queryFn: () => fetchApi<TaskItem[]>('/tasks', {}, token),
  });

  // POST /api/tasks mutation
  const createTaskMutation = useMutation({
    mutationFn: (newTask: { employeeId: string; title: string; description: string; dueDate: string; frequency?: string }) =>
      fetchApi<TaskItem>('/tasks', { method: 'POST', body: JSON.stringify(newTask) }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDashboard'] });
      setToastMessage('Task assigned successfully!');
      setFormError(null);

      // Reset form
      setEmployeeId('');
      setTitle('');
      setDescription('');
      setDueDate('');
      setFrequency('ONE_TIME');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to assign task');
    },
  });

  // PATCH /api/tasks/:id/classification mutation
  const updateClassificationMutation = useMutation({
    mutationFn: ({ id, classification }: { id: string; classification: string }) =>
      fetchApi<TaskItem>(
        `/tasks/${id}/classification`,
        { method: 'PATCH', body: JSON.stringify({ classification }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDashboard'] });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update task classification');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setFormError('Please select an employee');
      return;
    }
    setFormError(null);
    createTaskMutation.mutate({
      employeeId,
      title,
      description,
      dueDate: new Date(dueDate).toISOString(),
      frequency,
    });
  };

  // Client-side filtering
  const filteredTasks = tasks?.filter((t) => {
    if (filterEmployeeId !== 'ALL' && t.employeeId !== filterEmployeeId) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterFrequency !== 'ALL' && (t.frequency || 'ONE_TIME') !== filterFrequency) return false;
    
    if (activeTab === 'TEN_POINTS' && t.classification !== 'TEN_POINTS') return false;
    if (activeTab === 'PENDING' && (t.classification || 'PENDING') !== 'PENDING') return false;
    
    return true;
  });

  if (filteredTasks && activeTab === 'A_TO_Z') {
    filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Work & Task Assignment</h1>
        <p className="text-ink-muted text-sm mt-1">Assign deliverables to staff members and track completion.</p>
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

      {/* Task Creation Form Card */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-ink">Assign New Deliverable</h2>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Assign to Employee</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm bg-white"
            >
              <option value="">-- Select Employee --</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Due Date</label>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Task Frequency</label>
            <select
              required
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm bg-white"
            >
              <option value="ONE_TIME">One-Time</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Conduct Q3 Safety Audit & Compliance Report"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Task Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions and requirements for the employee..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm resize-none"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-sm shadow-md shadow-purple-600/20 disabled:opacity-70 flex items-center gap-2"
            >
              {createTaskMutation.isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>Assign Task</span>
            </button>
          </div>
        </form>
      </div>

      {/* Task List Section */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Navigation Tabs for A-Z, 10-Points, and Pending */}
        <div className="border-b border-border bg-slate-50 flex items-center px-4">
          <button
            onClick={() => setActiveTab('A_TO_Z')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === 'A_TO_Z'
                ? 'border-brand text-brand font-extrabold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            A to Z ({tasks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('TEN_POINTS')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === 'TEN_POINTS'
                ? 'border-brand text-brand font-extrabold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            10 Points ({tasks?.filter(t => t.classification === 'TEN_POINTS').length || 0})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === 'PENDING'
                ? 'border-brand text-brand font-extrabold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Pending ({tasks?.filter(t => (t.classification || 'PENDING') === 'PENDING').length || 0})
          </button>
        </div>

        {/* Filters Header */}
        <div className="p-4 border-b border-border bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-muted" />
            <h3 className="text-sm font-bold text-ink">Filtered Tasks</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Employee */}
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium bg-white focus:outline-none focus:border-brand"
            >
              <option value="ALL">All Employees</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium bg-white focus:outline-none focus:border-brand"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Filter by Frequency */}
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium bg-white focus:outline-none focus:border-brand"
            >
              <option value="ALL">All Frequencies</option>
              <option value="ONE_TIME">One-Time</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>

        {/* Table */}
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
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Task Title & Description</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6">Classification</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-ink">
                {filteredTasks && filteredTasks.length > 0 ? (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-ink">
                        {t.employee?.name || 'Unassigned'}
                        <div className="text-xs font-normal text-ink-muted">{t.employee?.role}</div>
                      </td>
                      <td className="py-4 px-6 max-w-xs">
                        <div className="font-semibold text-ink">{t.title}</div>
                        <div className="text-xs text-ink-muted line-clamp-2 mt-0.5 mb-1.5">{t.description}</div>
                        <div className="flex gap-1.5 items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getFrequencyStyle(t.frequency)}`}>
                            {t.frequency === 'ONE_TIME' ? 'One-Time' : t.frequency || 'One-Time'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-ink-muted whitespace-nowrap text-xs">
                        {new Date(t.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <select
                          value={t.classification || 'PENDING'}
                          disabled={updateClassificationMutation.isPending}
                          onChange={(e) => updateClassificationMutation.mutate({ id: t.id, classification: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold bg-white text-ink focus:outline-none focus:border-brand cursor-pointer hover:border-brand-accent transition-all disabled:opacity-75"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="TEN_POINTS">10-points</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-6 text-center text-ink-muted text-sm">
                      No tasks found matching your filters.
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
