import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { EmployeeItem } from '../../types/models';
import { Settings, Trash2, ShieldAlert, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const OwnerSettings: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation state locks
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // GET /api/employees
  const { data: employees } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: () => fetchApi<EmployeeItem[]>('/employees', {}, token),
  });

  // DELETE /api/employees/:id
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ message: string }>(`/employees/${id}`, { method: 'DELETE' }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setToastMessage(data.message || 'Staff member removed from worksheet.');
      setErrorMessage(null);
      setSelectedEmpId('');
      setIsDeleteConfirmOpen(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to delete staff member.');
    },
  });

  // POST /api/employees/reset-all
  const resetAllMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>('/employees/reset-all', { method: 'POST' }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setToastMessage(data.message || 'Worksheet data has been reset successfully.');
      setErrorMessage(null);
      setSelectedEmpId('');
      setIsResetConfirmOpen(false);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to reset system data.');
    },
  });

  const handleDeleteEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteEmployeeMutation.mutate(selectedEmpId);
  };

  const handleConfirmReset = () => {
    resetAllMutation.mutate();
  };

  const selectedEmp = employees?.find((emp) => emp.id === selectedEmpId);

  return (
    <div className="space-y-4 max-w-4xl font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#107c41]" />
              <span>System Settings & Database Control</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Delete Employee Card */}
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h2 className="text-sm font-bold text-slate-900">Delete Employee Record</h2>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Remove an employee profile, delete their login credentials, and clean up their associated tasks from the workbook.
            </p>

            <form onSubmit={handleDeleteEmployeeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Employee
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#107c41] text-xs bg-white"
                >
                  <option value="">-- Choose employee to delete --</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedEmpId || deleteEmployeeMutation.isPending}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Delete Selected Employee
              </button>
            </form>
          </div>
        </div>

        {/* Reset All Data */}
        <div className="bg-white rounded-lg border border-red-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h2 className="text-sm font-bold text-red-700">Reset System Database</h2>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Completely clear the database workbook. Deletes all tasks, checklist items, and employee directories. Your Owner account will be preserved.
            </p>
          </div>

          <div>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetAllMutation.isPending}
              className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Reset Database [Danger]
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Delete Employee */}
      {isDeleteConfirmOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-300 shadow-2xl p-5">
            <div className="text-center">
              <h3 className="text-base font-bold text-red-700">Confirm Deletion</h3>
              <p className="text-slate-600 text-xs mt-2">
                Are you sure you want to delete <strong className="text-slate-900">{selectedEmp.name}</strong>?
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteEmployeeMutation.isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset All Data */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-xl border border-red-400 shadow-2xl p-5">
            <div className="text-center">
              <h3 className="text-base font-bold text-red-700">Reset Entire Database?</h3>
              <p className="text-slate-600 text-xs mt-2">
                This will wipe all task sheets and employee records. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={resetAllMutation.isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
