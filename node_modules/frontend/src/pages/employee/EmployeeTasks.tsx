import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import type { TaskItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { isTaskInTenPoints, isTaskInPending, DAYS_OF_WEEK } from '../../utils/taskRules';
import { CheckCircle2, AlertCircle, PlusCircle, X, Share2, Search, Check, FileSpreadsheet } from 'lucide-react';

export const EmployeeTasks: React.FC = () => {
  const { token, user } = useAuth();
  const { searchQuery } = useSearch();
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Task creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [company, setCompany] = useState('ICC Industries');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [classification, setClassification] = useState('REGULAR');
  const [frequency, setFrequency] = useState<'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('ONE_TIME');
  const [repeatDay, setRepeatDay] = useState('MONDAY');

  // Task submission notes modal state
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Allocate Task assignee options
  const [assigneeOption, setAssigneeOption] = useState<'MYSELF' | 'FORWARD'>('MYSELF');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');

  // Three entry boxes states
  const [noOfEntry, setNoOfEntry] = useState('');
  const [timePerEntry, setTimePerEntry] = useState('');
  const [totalTime, setTotalTime] = useState('');

  // Forwarding task states
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTask, setForwardTask] = useState<TaskItem | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Classification active tab derived from route parameter
  const { tab } = useParams<{ tab: string }>();
  const activeTab: 'A_TO_Z' | 'TEN_POINTS' | 'PENDING' =
    tab === 'ten-points' ? 'TEN_POINTS' : tab === 'pending' ? 'PENDING' : 'A_TO_Z';

  useEffect(() => {
    const handleCreateTrigger = () => {
      setIsModalOpen(true);
    };
    window.addEventListener('excel-create-trigger', handleCreateTrigger);
    return () => window.removeEventListener('excel-create-trigger', handleCreateTrigger);
  }, []);

  // GET /api/tasks/mine
  const { data: tasks, isLoading, isError, error } = useQuery<TaskItem[]>({
    queryKey: ['myTasks'],
    queryFn: () => fetchApi<TaskItem[]>('/tasks/mine', {}, token),
  });

  // GET /api/tasks/employees-list
  const { data: employeesList } = useQuery<any[]>({
    queryKey: ['employeesList'],
    queryFn: () => fetchApi<any[]>('/tasks/employees-list', {}, token),
  });

  // PATCH /api/tasks/:id/forward
  const forwardTaskMutation = useMutation({
    mutationFn: ({ id, forwardedToId }: { id: string; forwardedToId: string }) =>
      fetchApi<TaskItem>(
        `/tasks/${id}/forward`,
        { method: 'PATCH', body: JSON.stringify({ forwardedToId }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      setToastMessage(`Task forwarded to team member successfully.`);
      setErrorMessage(null);
      setIsForwardModalOpen(false);
      setForwardTask(null);
      setEmployeeSearch('');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to forward task.');
    },
  });

  // PATCH /api/tasks/:id/accept-forward
  const acceptForwardMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<TaskItem>(`/tasks/${id}/accept-forward`, { method: 'PATCH' }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setToastMessage(`Task "${data.title}" accepted and added to your A to Z worksheet.`);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to accept forwarded task.');
    },
  });

  // PATCH /api/tasks/:id/status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, completionNotes }: { id: string; status: string; completionNotes?: string }) =>
      fetchApi<TaskItem>(
        `/tasks/${id}/status`,
        { method: 'PATCH', body: JSON.stringify({ status, completionNotes }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update task status.');
    },
  });

  // PATCH /api/tasks/:id/classification
  const updateClassificationMutation = useMutation({
    mutationFn: ({ id, classification, repeatDay }: { id: string; classification?: string; repeatDay?: string }) =>
      fetchApi<TaskItem>(
        `/tasks/${id}/classification`,
        { method: 'PATCH', body: JSON.stringify({ classification, repeatDay }) },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update task category.');
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
      classification?: string;
      company?: string;
      frequency: string;
      repeatDay?: string;
      forwardedToId?: string;
      forwardedFromId?: string;
      noOfEntry?: number;
      timePerEntry?: number;
      totalTime?: number;
    }) => fetchApi<TaskItem>('/tasks', { method: 'POST', body: JSON.stringify(newTask) }, token),
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setToastMessage(`Task "${createdTask.title}" allocated to your worksheet.`);
      setErrorMessage(null);
      setIsModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewDueDate('');
      setCompany('ICC Industries');
      setPriority('MEDIUM');
      setEstimatedHours('');
      setCategory('TECHNICAL');
      setClassification('REGULAR');
      setFrequency('ONE_TIME');
      setRepeatDay('MONDAY');
      setAssigneeOption('MYSELF');
      setTargetEmployeeId('');
      setNoOfEntry('');
      setTimePerEntry('');
      setTotalTime('');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to allocate task.');
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
      completionNotes: completionNotes.trim() ? completionNotes : (null as any),
    });
    setSelectedTaskForReview(null);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) {
      setErrorMessage('Please fill in title and due date.');
      return;
    }

    if (assigneeOption === 'FORWARD' && !targetEmployeeId) {
      setErrorMessage('Please select a recipient employee.');
      return;
    }

    createTaskMutation.mutate({
      employeeId: user?.profile?.id || '',
      title: newTitle,
      description: newTitle,
      dueDate: new Date(newDueDate).toISOString(),
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      category,
      classification,
      company: company || 'ICC Industries',
      frequency,
      repeatDay: frequency === 'WEEKLY' ? repeatDay : undefined,
      forwardedToId: assigneeOption === 'FORWARD' ? targetEmployeeId : undefined,
      forwardedFromId: assigneeOption === 'FORWARD' ? user?.profile?.id || '' : undefined,
      noOfEntry: noOfEntry ? parseInt(noOfEntry) : undefined,
      timePerEntry: timePerEntry ? parseFloat(timePerEntry) : undefined,
      totalTime: totalTime ? parseFloat(totalTime) : undefined,
    });
  };

  const tenPointsCount = (tasks || []).filter((t) => isTaskInTenPoints(t)).length;
  const pendingCount = (tasks || []).filter((t) => isTaskInPending(t)).length;

  // Filter and sort tasks based on activeTab and searchQuery
  const getFilteredTasks = () => {
    if (!tasks) return [];
    let filtered = [...tasks];
    if (activeTab === 'TEN_POINTS') {
      filtered = filtered.filter((t) => isTaskInTenPoints(t));
    } else if (activeTab === 'PENDING') {
      filtered = filtered.filter((t) => isTaskInPending(t));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.company && t.company.toLowerCase().includes(q)) ||
        (t.staff1Name && t.staff1Name.toLowerCase().includes(q)) ||
        (t.staff2Name && t.staff2Name.toLowerCase().includes(q)) ||
        (t.status && t.status.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.classification && t.classification.toLowerCase().includes(q)) ||
        (t.frequency && t.frequency.toLowerCase().includes(q)) ||
        (t.repeatDay && t.repeatDay.toLowerCase().includes(q)) ||
        (t.employee?.name && t.employee.name.toLowerCase().includes(q))
      );
    }

    if (activeTab === 'A_TO_Z') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Task Worksheet: {activeTab === 'TEN_POINTS' ? '10 Points Priority' : activeTab === 'PENDING' ? 'Pending Execution' : 'A to Z Task Register'}
            </h1>
          </div>
        </div>

        {/* Quick Filter Tabs & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Link
              to="/employee/tasks/a-to-z"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'A_TO_Z' ? 'bg-[#107c41] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A to Z ({tasks?.length || 0})
            </Link>
            <Link
              to="/employee/tasks/ten-points"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'TEN_POINTS' ? 'bg-[#107c41] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10 Points ({tenPointsCount})
            </Link>
            <Link
              to="/employee/tasks/pending"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'PENDING' ? 'bg-[#107c41] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </Link>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Allocate Task</span>
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

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {tasks && tasks.some(t => t.forwardedToId === user?.profile?.id && t.employeeId !== user?.profile?.id) && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              You have <strong>{tasks.filter(t => t.forwardedToId === user?.profile?.id && t.employeeId !== user?.profile?.id).length}</strong> incoming forwarded task(s). Click <strong>"Accept Task"</strong> below to add directly into your active A to Z worksheet.
            </span>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading tasks into worksheet...
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-50 text-red-700 text-xs">
            Failed to load tasks: {(error as Error).message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} className="text-center">#</th>
                  <th>Task Title & Details</th>
                  <th>Company</th>
                  <th>Staff 1 (Forwarded From)</th>
                  <th>Staff 2 (Forwarded To)</th>
                  <th className="text-center">Entries</th>
                  <th className="text-center">Time/Entry</th>
                  <th className="text-center">Total Time</th>
                  <th>Due Date</th>
                  <th className="text-center">Category</th>
                  <th className="text-center">Current Status</th>
                  <th className="text-center">Update Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks && filteredTasks.length > 0 ? (
                  filteredTasks.map((task, idx) => {
                    const isIncomingPending = task.forwardedToId === user?.profile?.id && task.employeeId !== user?.profile?.id;
                    return (
                      <tr key={task.id} className={isIncomingPending ? 'bg-amber-50/50' : ''}>
                        <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="max-w-sm">
                          <div className="font-bold text-slate-900">{task.title}</div>
                        </td>
                        <td className="font-semibold text-slate-800">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {task.company || 'ICC Industries'}
                          </span>
                        </td>
                        <td className="font-semibold text-[#107c41]">
                          {task.staff1Name || task.forwardedFromName || task.employee?.name || user?.profile?.name || '-'}
                        </td>
                        <td className="font-semibold text-[#0066cc]">
                          {task.staff2Name || task.forwardedToName || '-'}
                        </td>
                        <td className="text-center font-semibold text-slate-700">
                          {task.noOfEntry ?? '-'}
                        </td>
                        <td className="text-center font-semibold text-slate-700">
                          {task.timePerEntry ? `${task.timePerEntry}m` : '-'}
                        </td>
                        <td className="text-center font-bold text-[#107c41]">
                          {task.totalTime ? `${task.totalTime}m` : '-'}
                        </td>
                        <td className="text-slate-700">
                          {new Date(task.dueDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="text-center">
                          <select
                            value={task.classification || 'REGULAR'}
                            disabled={updateClassificationMutation.isPending || isIncomingPending}
                            onChange={(e) => updateClassificationMutation.mutate({ id: task.id, classification: e.target.value })}
                            className="px-2 py-1 rounded border border-slate-300 text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none focus:border-[#107c41] cursor-pointer disabled:opacity-60"
                          >
                            <option value="REGULAR">Regular</option>
                            <option value="TEN_POINTS">10-Points</option>
                            <option value="PENDING">Pending</option>
                          </select>
                        </td>
                        <td className="text-center">
                          {isIncomingPending ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Incoming Forward
                            </span>
                          ) : (
                            <StatusBadge status={task.status} />
                          )}
                        </td>
                        <td className="text-center">
                          {isIncomingPending ? (
                            <button
                              onClick={() => acceptForwardMutation.mutate(task.id)}
                              disabled={acceptForwardMutation.isPending}
                              className="px-3 py-1 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept Task</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <select
                                value={task.status === 'PENDING' ? '' : task.status}
                                disabled={updateStatusMutation.isPending || task.status === 'COMPLETED'}
                                onChange={(e) => {
                                  if (e.target.value) handleStatusChange(task, e.target.value);
                                }}
                                className="px-2.5 py-1 rounded border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:border-[#107c41] cursor-pointer disabled:opacity-60"
                              >
                                {task.status === 'PENDING' && (
                                  <option value="" disabled>
                                    Select Progress
                                  </option>
                                )}
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="IN_REVIEW">Submit for Review</option>
                                {task.status === 'COMPLETED' && <option value="COMPLETED">Completed (Approved)</option>}
                                {task.status === 'OVERDUE' && <option value="OVERDUE">Overdue</option>}
                              </select>

                              <button
                                onClick={() => { setForwardTask(task); setIsForwardModalOpen(true); }}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                                title="Forward task to colleague"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500 text-xs">
                      No tasks found in this section. Click <strong>"Allocate Task"</strong> to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-[#f8fafc] px-4 py-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
          <span>Total Tasks: <strong className="text-[#107c41]">{filteredTasks.length}</strong></span>
          <span>Click any bottom sheet tab below to switch views</span>
        </div>
      </div>

      {/* Self-Allocation Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-300 shadow-2xl p-5 relative animate-scale-up">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-[#107c41] flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <span>Allocate Task to Workspace</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Who should do this?
                  </label>
                  <select
                    value={assigneeOption}
                    onChange={(e) => {
                      setAssigneeOption(e.target.value as 'MYSELF' | 'FORWARD');
                      if (e.target.value === 'MYSELF') {
                        setTargetEmployeeId('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
                  >
                    <option value="MYSELF">Assign to Myself</option>
                    <option value="FORWARD">Forward to Colleague</option>
                  </select>
                </div>

                {assigneeOption === 'FORWARD' ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Choose Colleague *
                    </label>
                    <select
                      required
                      value={targetEmployeeId}
                      onChange={(e) => setTargetEmployeeId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employeesList?.filter(emp => emp.id !== user?.profile?.id).map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      required
                      value={classification}
                      onChange={(e) => setClassification(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs font-semibold"
                    >
                      <option value="REGULAR">Regular (A to Z)</option>
                      <option value="TEN_POINTS">10 Points Priority</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Conduct monthly physical inventory verification"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Due Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={company}
                    placeholder="e.g. ICC Industries"
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Repeat Frequency
                  </label>
                  <select
                    required
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
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
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs font-semibold"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.value} value={d.value}>
                          Every {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Entry details */}
                <div className="md:col-span-2 grid grid-cols-3 gap-2 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <div>
                    <label className="block text-[16px] font-bold text-slate-700 mb-1">
                      No. of Entries
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={noOfEntry}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNoOfEntry(val);
                        if (val && timePerEntry) {
                          setTotalTime((parseFloat(val) * parseFloat(timePerEntry)).toString());
                        }
                      }}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-300 focus:border-[#107c41] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[16px] font-bold text-slate-700 mb-1">
                      Time / Entry (m)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g. 15"
                      value={timePerEntry}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTimePerEntry(val);
                        if (noOfEntry && val) {
                          setTotalTime((parseFloat(noOfEntry) * parseFloat(val)).toString());
                        }
                      }}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-300 focus:border-[#107c41] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[16px] font-bold text-slate-700 mb-1">
                      Total Time (m)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g. 75"
                      value={totalTime}
                      onChange={(e) => setTotalTime(e.target.value)}
                      className="w-full px-2 py-1 bg-white rounded border border-slate-300 focus:border-[#107c41] text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>Allocate Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Notes Modal */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-300 shadow-2xl p-5 relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Submit Task for Review</h2>
              <button onClick={() => setSelectedTaskForReview(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Describe what you completed so the owner can verify and approve it:
            </p>

            <form onSubmit={handleReviewNotesSubmit} className="space-y-3 text-xs">
              <textarea
                rows={3}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Finished all tasks and verified the counts."
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForReview(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit for Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forward Task Modal */}
      {isForwardModalOpen && forwardTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-300 shadow-2xl p-5 relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#107c41]" />
                <span>Forward Task</span>
              </h2>
              <button
                onClick={() => { setIsForwardModalOpen(false); setForwardTask(null); setEmployeeSearch(''); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 mb-2">
              Task: <strong className="text-slate-900">{forwardTask.title}</strong>
            </p>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search colleague by name..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs"
              />
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white mb-3">
              {employeesList && employeesList.filter(emp => emp.id !== user?.profile?.id && emp.name.toLowerCase().includes(employeeSearch.toLowerCase())).length > 0 ? (
                employeesList
                  .filter(emp => emp.id !== user?.profile?.id && emp.name.toLowerCase().includes(employeeSearch.toLowerCase()))
                  .map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        forwardTaskMutation.mutate({ id: forwardTask.id, forwardedToId: emp.id });
                      }}
                      className="p-2.5 flex items-center justify-between hover:bg-emerald-50 cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[16px] text-slate-500 capitalize">{emp.role}</p>
                      </div>
                      <span className="text-xs text-[#107c41] font-bold">Select</span>
                    </div>
                  ))
              ) : (
                <p className="p-4 text-center text-xs text-slate-500">No matching employees found.</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setIsForwardModalOpen(false); setForwardTask(null); setEmployeeSearch(''); }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
