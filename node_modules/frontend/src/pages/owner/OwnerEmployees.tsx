import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import type { EmployeeItem } from '../../types/models';
import { StatusBadge } from '../../components/StatusBadge';
import { UserPlus, Users, CheckCircle2, AlertCircle, Check, Search, FileSpreadsheet } from 'lucide-react';

export const OwnerEmployees: React.FC = () => {
  const { token } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
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

  useEffect(() => {
    const handleCreateTrigger = () => {
      setActiveTab('add');
    };
    window.addEventListener('excel-create-trigger', handleCreateTrigger);
    return () => window.removeEventListener('excel-create-trigger', handleCreateTrigger);
  }, []);

  // GET /api/employees
  const { data: employees, isLoading, isError, error } = useQuery<EmployeeItem[]>({
    queryKey: ['employees'],
    queryFn: () => fetchApi<EmployeeItem[]>('/employees', {}, token),
  });

  // POST /api/employees
  const addEmployeeMutation = useMutation({
    mutationFn: (newEmployee: { name: string; username: string; phone: string; address: string; role: string }) =>
      fetchApi<EmployeeItem>('/employees', { method: 'POST', body: JSON.stringify(newEmployee) }, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setToastMessage(`Employee "${data.name}" added to staff sheet successfully.`);
      setFormError(null);

      // Reset Form
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setRole('');

      setActiveTab('all');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create employee account.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    addEmployeeMutation.mutate({ name, username: email, phone, address, role });
  };

  const filteredEmployees = (employees || []).filter((emp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      {/* Excel Sheet Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Staff & Employees Master</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#107c41] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff List ({employees?.length ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-[#107c41] text-white shadow-xs'
                : 'bg-emerald-100 text-[#107c41] hover:bg-emerald-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Staff</span>
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

      {activeTab === 'all' ? (
        <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
          {/* Search bar */}
          <div className="bg-[#f8fafc] px-3 py-2.5 border-b border-slate-300 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Search Staff:</span>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, username, or role..."
                  className="pl-7 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-[#107c41] w-64"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              </div>
            </div>
            <span className="text-slate-500">
              Total Staff: <strong className="text-[#107c41]">{filteredEmployees.length}</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading staff spreadsheet records...
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs">
              Failed to load staff list: {(error as Error).message}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="excel-grid-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} className="text-center">#</th>
                    <th>Full Name</th>
                    <th>Username / Login ID</th>
                    <th>Phone Number</th>
                    <th>Designation / Role</th>
                    <th className="text-center">Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees && filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp, idx) => (
                      <tr key={emp.id}>
                        <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="font-bold text-slate-900">{emp.name}</td>
                        <td className="text-slate-700">{emp.email}</td>
                        <td className="text-slate-600">{emp.phone || '-'}</td>
                        <td className="font-semibold text-[#107c41]">{emp.role}</td>
                        <td className="text-center">
                          <StatusBadge status={emp.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                        No employees found. Click <strong>"Add New Staff"</strong> to onboard an employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-[#f8fafc] px-4 py-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500">
            <span>Employees Worksheet</span>
            <span>Switch sheets anytime using the bottom tabs</span>
          </div>
        </div>
      ) : (
        /* Add Staff Form */
        <div className="bg-white rounded-lg border-2 border-[#107c41] p-4 shadow-md max-w-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-[#107c41] flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>Create New Staff Account</span>
            </h2>
          </div>

          {formError && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username / Login ID *</label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Designation / Role Title *</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Senior Accountant / Floor Manager"
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Address *</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Office or residential address..."
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addEmployeeMutation.isPending}
                className="px-5 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Employee Account</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
