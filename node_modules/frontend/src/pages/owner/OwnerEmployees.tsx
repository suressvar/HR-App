import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { EmployeeItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { UserPlus, Users, CheckCircle2, AlertCircle } from 'lucide-react';

export const OwnerEmployees: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // GET /api/employees
  const { data: employees, isLoading, isError, error } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: () => fetchApi<EmployeeItem[]>('/employees', {}, token),
  });

  // POST /api/employees
  const addEmployeeMutation = useMutation({
    mutationFn: (newEmployee: { name: string; email: string; phone: string; address: string; role: string }) =>
      fetchApi<EmployeeItem>('/employees', { method: 'POST', body: JSON.stringify(newEmployee) }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setToastMessage(`Employee created — credentials emailed to ${data.email}`);
      setFormError(null);

      // Reset Form
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setRole('');

      // Switch back to list after short delay
      setTimeout(() => {
        setActiveTab('all');
      }, 1500);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create employee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    addEmployeeMutation.mutate({ name, email, phone, address, role });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Employee Directory</h1>
          <p className="text-ink-muted text-sm mt-1">Manage company staff records and onboard new employees.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'all' ? 'bg-white text-brand shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Employees ({employees?.length ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'add' ? 'bg-white text-brand shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Confirmation Toast */}
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

      {/* Content Tabs */}
      {activeTab === 'all' ? (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : isError ? (
            <div className="p-6 text-red-600 text-sm">Failed to load employees: {(error as Error).message}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-border text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Phone</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm text-ink">
                  {employees && employees.length > 0 ? (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-ink">{emp.name}</td>
                        <td className="py-4 px-6 text-ink-muted">{emp.email}</td>
                        <td className="py-4 px-6 text-ink-muted">{emp.phone}</td>
                        <td className="py-4 px-6 font-medium text-brand">{emp.role}</td>
                        <td className="py-4 px-6">
                          <StatusBadge status={emp.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-ink-muted text-sm">
                        No employees registered yet. Click "Add Employee" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Add Employee Form */
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm max-w-2xl">
          <h2 className="text-lg font-bold text-ink mb-4">Onboard New Employee</h2>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@iccindustries.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Role Title</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="HR Specialist / Senior Engineer"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Industry Blvd, Suite 400"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="px-4 py-2.5 border border-border text-ink-muted hover:bg-slate-50 font-semibold rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addEmployeeMutation.isPending}
                className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-sm shadow-md shadow-purple-600/20 disabled:opacity-70 flex items-center gap-2"
              >
                {addEmployeeMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Create Employee Account</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
