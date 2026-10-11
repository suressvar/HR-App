import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import type { TaskItem, EmployeeItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { isTaskInTenPoints, isTaskInPending, DAYS_OF_WEEK } from '../../utils/taskRules';
import { PlusCircle, Filter, CheckCircle2, AlertCircle, Check, FileSpreadsheet, Search } from 'lucide-react';

export const OwnerAssignWork: React.FC = () => {
  const { token } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const queryClient = useQueryClient();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [company, setCompany] = useState('ICC Industries');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('ONE_TIME');
  const [classification, setClassification] = useState<string>('REGULAR');
  const [repeatDay, setRepeatDay] = useState<string>('MONDAY');

  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFrequency, setFilterFrequency] = useState<string>('ALL');

  // Classification active tab derived from route parameter
  const { tab } = useParams<{ tab: string }>();
  const activeTab: 'A_TO_Z' | 'TEN_POINTS' | 'PENDING' =
    tab === 'ten-points' ? 'TEN_POINTS' : tab === 'pending' ? 'PENDING' : 'A_TO_Z';

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const handleCreateTrigger = () => {
      setShowForm(true);
    };
    window.addEventListener('excel-create-trigger', handleCreateTrigger);
    return () => window.removeEventListener('excel-create-trigger', handleCreateTrigger);
  }, []);

  const getFrequencyStyle = (f?: string) => {
    switch (f) {
      case 'DAILY':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'WEEKLY':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'MONTHLY':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      case 'YEARLY':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'ONE_TIME':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // GET /api/employees
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
    mutationFn: (newTask: {
      employeeId: string;
      title: string;
      description: string;
      dueDate: string;
      company?: string;
      frequency?: string;
      classification?: string;
      repeatDay?: string;
    }) => fetchApi<TaskItem>('/tasks', { method: 'POST', body: JSON.stringify(newTask) }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDashboard'] });
      setToastMessage('Task assigned successfully to employee.');
      setFormError(null);

      // Reset form
      setEmployeeId('');
      setTitle('');
      setDescription('');
      setCompany('ICC Industries');
      setDueDate('');
      setFrequency('ONE_TIME');
      setClassification('REGULAR');
      setRepeatDay('MONDAY');
      setShowForm(false);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to assign task.');
    },
  });

  // PATCH /api/tasks/:id/classification mutation
  const updateClassificationMutation = useMutation({
    mutationFn: ({ id, classification, repeatDay }: { id: string; classification?: string; repeatDay?: string }) =>
      fetchApi<TaskItem>(
        `/tasks/${id}/classification`,
        { method: 'PATCH', body: JSON.stringify({ classification, repeatDay }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ownerDashboard'] });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update task category.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setFormError('Please choose an employee to assign this task to');
      return;
    }
    setFormError(null);
    createTaskMutation.mutate({
      employeeId,
      title,
      description,
      company: company || 'ICC Industries',
      dueDate: new Date(dueDate).toISOString(),
      frequency,
      classification,
      repeatDay: frequency === 'WEEKLY' ? repeatDay : undefined,
    });
  };

  const tenPointsCount = (tasks || []).filter((t) => isTaskInTenPoints(t)).length;
  const pendingCount = (tasks || []).filter((t) => isTaskInPending(t)).length;

  const filteredTasks = (tasks || []).filter((t) => {
    if (filterEmployeeId !== 'ALL' && t.employeeId !== filterEmployeeId) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterFrequency !== 'ALL' && (t.frequency || 'ONE_TIME') !== filterFrequency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.company && t.company.toLowerCase().includes(q)) ||
        (t.staff1Name && t.staff1Name.toLowerCase().includes(q)) ||
        (t.staff2Name && t.staff2Name.toLowerCase().includes(q)) ||
        (t.employee?.name && t.employee.name.toLowerCase().includes(q)) ||
        (t.status && t.status.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.classification && t.classification.toLowerCase().includes(q)) ||
        (t.repeatDay && t.repeatDay.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (activeTab === 'TEN_POINTS') {
      return isTaskInTenPoints(t);
    }
    if (activeTab === 'PENDING') {
      return isTaskInPending(t);
    }

    return true;
  });

  if (activeTab === 'A_TO_Z') {
    filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Excel Sheet Title Bar */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Task Worksheet: {activeTab === 'TEN_POINTS' ? '10 Points Priority' : activeTab === 'PENDING' ? 'Pending Approval' : 'A to Z Task Register'}
            </h1>
          </div>
        </div>

        {/* Quick Sheet Filter Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Link
              to="/owner/assign-work/a-to-z"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'A_TO_Z' ? 'bg-[#107c41] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A to Z ({tasks?.length || 0})
            </Link>
            <Link
              to="/owner/assign-work/ten-points"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'TEN_POINTS' ? 'bg-[#107c41] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10 Points ({tenPointsCount})
            </Link>
            <Link
              to="/owner/assign-work/pending"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'PENDING' ? 'bg-[#107c41] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </Link>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Hide Form' : 'Assign New Task'}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Task Creation Form (Clean, simple for noobs) */}
      {showForm && (
        <div className="bg-white rounded-lg border-2 border-[#107c41] p-4 shadow-md animate-fade-in">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-[#107c41] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>Assign New Task</span>
            </h2>
          </div>

          {formError && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Assign to Employee *
              </label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              >
                <option value="">-- Choose Employee --</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. ICC Industries"
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Due Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                required
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              >
                <option value="REGULAR">Regular (A to Z)</option>
                <option value="TEN_POINTS">10 Points Priority</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Repeat Frequency
              </label>
              <select
                required
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              >
                <option value="ONE_TIME">One-Time (No repeat)</option>
                <option value="DAILY">Daily (Repeats in 10 Points daily)</option>
                <option value="WEEKLY">Weekly (Repeats in 10 Points on selected day)</option>
                <option value="MONTHLY">Monthly (Repeats every month)</option>
                <option value="YEARLY">Yearly (Repeats in 10 Points 1 day before)</option>
              </select>
            </div>

            {frequency === 'WEEKLY' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Weekly Repeat Day *
                </label>
                <select
                  required
                  value={repeatDay}
                  onChange={(e) => setRepeatDay(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs font-semibold"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      Every {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={frequency === 'WEEKLY' ? 'md:col-span-2' : 'md:col-span-3'}>
              <label className="block font-bold text-slate-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Conduct monthly physical inventory verification and ledger audit"
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">
                Detailed Instructions / Notes
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write instructions and deliverables specification for the employee..."
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs resize-none"
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="px-5 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save & Assign Task</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Excel Spreadsheet Grid & Filters */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="bg-[#f8fafc] px-3 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#107c41]" />
            <span className="font-bold text-slate-700">Filter Sheet:</span>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search in sheet..."
                className="pl-7 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-[#107c41]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none"
            >
              <option value="ALL">All Staff</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none"
            >
              <option value="ALL">All Frequencies</option>
              <option value="ONE_TIME">One-Time</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>

        {/* Spreadsheet Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading tasks into worksheet...
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-50 text-red-700 text-xs">
            Error loading tasks: {(error as Error)?.message}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No tasks found in this sheet. Click <strong>"Assign New Task"</strong> to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} className="text-center">#</th>
                  <th>Task Title</th>
                  <th>Company</th>
                  <th>Staff 1 (Forwarded From)</th>
                  <th>Staff 2 (Forwarded To)</th>
                  <th>Frequency</th>
                  <th>Due Date</th>
                  <th className="text-center">Category</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => (
                  <tr key={task.id}>
                    <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="max-w-md">
                      <div className="font-bold text-slate-900">{task.title}</div>
                    </td>
                    <td className="font-semibold text-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {task.company || 'ICC Industries'}
                      </span>
                    </td>
                    <td className="font-semibold text-[#107c41]">
                      {task.staff1Name || task.forwardedFromName || 'Owner'}
                    </td>
                    <td className="font-semibold text-[#0066cc]">
                      {task.staff2Name || task.forwardedToName || '-'}
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getFrequencyStyle(task.frequency)}`}>
                        {task.frequency === 'WEEKLY' && task.repeatDay
                          ? `WEEKLY (${task.repeatDay})`
                          : (task.frequency || 'ONE_TIME')}
                      </span>
                    </td>
                    <td className="text-slate-700">
                      {new Date(task.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="text-center">
                      <select
                        value={task.classification || 'REGULAR'}
                        onChange={(e) =>
                          updateClassificationMutation.mutate({
                            id: task.id,
                            classification: e.target.value,
                          })
                        }
                        className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#107c41] cursor-pointer"
                      >
                        <option value="REGULAR">Regular (A to Z)</option>
                        <option value="TEN_POINTS">10 Points Priority</option>
                        <option value="PENDING">Pending</option>
                      </select>
                    </td>
                    <td className="text-center">
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sheet Footer */}
        <div className="bg-[#f8fafc] px-4 py-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
          <span>Total Rows in Sheet: <strong className="text-[#107c41]">{filteredTasks.length}</strong></span>
          <span>Click any bottom sheet tab below to switch views easily</span>
        </div>
      </div>
    </div>
  );
};
