import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import type { TaskItem } from '../../types/models';
import { Share2, CheckCircle2, AlertCircle, Check, FileSpreadsheet } from 'lucide-react';

interface ForwardedTaskItem extends TaskItem {
  forwardedFromName?: string;
}

export const EmployeeForwardedTasks: React.FC = () => {
  const { token } = useAuth();
  const { searchQuery } = useSearch();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GET /api/tasks/forwarded
  const { data: forwardedTasks, isLoading, isError, error } = useQuery<ForwardedTaskItem[]>({
    queryKey: ['forwardedTasks'],
    queryFn: () => fetchApi<ForwardedTaskItem[]>('/tasks/forwarded', {}, token),
  });

  // PATCH /api/tasks/:id/accept-forward
  const acceptForwardMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<TaskItem>(`/tasks/${id}/accept-forward`, { method: 'PATCH' }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forwardedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDashboard'] });
      setToastMessage(`Accepted task "${data.title}". It is now in your active tasks sheet.`);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to accept forwarded task.');
    },
  });

  const handleAccept = (id: string) => {
    setErrorMessage(null);
    setToastMessage(null);
    acceptForwardMutation.mutate(id);
  };

  const filteredForwardedTasks = (forwardedTasks || []).filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      task.title.toLowerCase().includes(q) ||
      (task.description && task.description.toLowerCase().includes(q)) ||
      (task.forwardedFromName && task.forwardedFromName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#107c41]" />
              <span>Forwarded Tasks</span>
            </h1>
          </div>
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

      {/* Forwarded Tasks Spreadsheet Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading forwarded tasks sheet...
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-50 text-red-700 text-xs">
            Failed to load forwarded tasks: {(error as Error).message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} className="text-center">#</th>
                  <th>Task Title & Instructions</th>
                  <th>Company</th>
                  <th>Staff 1 (Forwarded From)</th>
                  <th>Due Date</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredForwardedTasks && filteredForwardedTasks.length > 0 ? (
                  filteredForwardedTasks.map((task, idx) => (
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
                        {task.forwardedFromName || 'Colleague'}
                      </td>
                      <td className="text-slate-700">
                        {new Date(task.dueDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleAccept(task.id)}
                          disabled={acceptForwardMutation.isPending}
                          className="px-3.5 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept & Add to My Tasks</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No forwarded tasks pending your acceptance.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-[#f8fafc] px-4 py-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
          <span>Pending Forwarded Tasks: <strong className="text-[#107c41]">{filteredForwardedTasks.length}</strong></span>
          <span>Click any bottom sheet tab below to switch views</span>
        </div>
      </div>
    </div>
  );
};
