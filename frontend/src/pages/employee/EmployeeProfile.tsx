import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';

interface EmployeeProfileData {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const EmployeeProfile: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // GET /api/profile
  const { data: profile, isLoading, isError, error } = useQuery<EmployeeProfileData>({
    queryKey: ['employeeProfile'],
    queryFn: () => fetchApi<EmployeeProfileData>('/profile', {}, token),
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  // PATCH /api/profile
  const updateProfileMutation = useMutation({
    mutationFn: (updatedData: { name: string; email: string; phone: string; address: string }) =>
      fetchApi<EmployeeProfileData>('/profile', { method: 'PATCH', body: JSON.stringify(updatedData) }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeProfile'] });
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
      setToastMessage('Your profile has been updated successfully.');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update profile.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    updateProfileMutation.mutate({ name, email, phone, address });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        Failed to load profile: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">My Profile</h1>
        <p className="text-ink-muted text-sm mt-1">Manage your personal contact details and employment information.</p>
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

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">{profile?.name}</h2>
            <p className="text-xs text-brand font-semibold">{profile?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Role Title (Read-Only)</label>
              <input
                type="text"
                disabled
                value={profile?.role || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-slate-50 text-ink-muted text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase mb-1">Residential Address</label>
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:border-brand text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg text-sm shadow-md shadow-purple-600/20 disabled:opacity-70 flex items-center gap-2"
            >
              {updateProfileMutation.isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>Update Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
