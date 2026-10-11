import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Check,
  FileSpreadsheet,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Calendar,
  Key,
  BadgeCheck,
  FileText
} from 'lucide-react';

interface OwnerProfileData {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  personalInfo?: string | null;
  user?: {
    id: string;
    email: string;
    role: string;
    createdAt?: string;
  };
}

export const OwnerProfile: React.FC = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [personalInfo, setPersonalInfo] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // GET /api/profile
  const { data: profile, isLoading, isError, error } = useQuery<OwnerProfileData>({
    queryKey: ['ownerProfile'],
    queryFn: () => fetchApi<OwnerProfileData>('/profile', {}, token),
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setPersonalInfo(profile.personalInfo || '');
    }
  }, [profile]);

  // PATCH /api/profile
  const updateProfileMutation = useMutation({
    mutationFn: (updatedData: { name: string; email: string; phone: string; personalInfo: string }) =>
      fetchApi<OwnerProfileData>('/profile', { method: 'PATCH', body: JSON.stringify(updatedData) }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
      setToastMessage('Profile changes saved successfully.');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update profile.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    updateProfileMutation.mutate({ name, email, phone, personalInfo });
  };

  const getInitials = (str?: string) => {
    if (!str) return 'OP';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-xs">
        <div className="w-8 h-8 border-4 border-[#107c41] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
        Failed to load profile: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans">
      {/* Title Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#107c41] flex items-center justify-center text-white font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#107c41]" />
              <span>Executive Profile</span>
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

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Profile Card & Quick Overview */}
        <div className="space-y-4">
          {/* Identity Card */}
          <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-full h-16 bg-[#107c41] absolute top-0 left-0"></div>
            
            <div className="relative mt-4 mb-3">
              <div className="w-20 h-20 rounded-full bg-white p-1 shadow-md border border-slate-200">
                <div className="w-full h-full rounded-full bg-[#107c41] text-white flex items-center justify-center font-bold text-2xl tracking-wider">
                  {getInitials(profile?.name)}
                </div>
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Active Account"></span>
            </div>

            <h2 className="text-lg font-bold text-slate-900">{profile?.name}</h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#107c41] text-xs font-bold mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>System Administrator & Owner</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{profile?.email}</p>

            <div className="w-full border-t border-slate-200 mt-4 pt-3 space-y-2 text-xs text-left">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Building2 className="w-3.5 h-3.5" /> Company
                </span>
                <span className="font-semibold text-slate-900">ICC Industries</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <BadgeCheck className="w-3.5 h-3.5" /> Account Status
                </span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" /> Access Tier
                </span>
                <span className="font-semibold text-slate-900">Executive Master</span>
              </div>
            </div>
          </div>

          {/* Security & Access Overview */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs text-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#107c41]" />
              <span>Security & Access Details</span>
            </h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Account Role:</span>
                <span className="font-bold text-slate-800">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span>Authentication:</span>
                <span className="font-semibold text-emerald-700">JWT Session Token</span>
              </div>
              <div className="flex justify-between">
                <span>Workspace Access:</span>
                <span className="font-semibold text-slate-800">Full System Control</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs">
            <div className="border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#107c41]" />
                <span>Executive Contact Information</span>
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Primary Contact Phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Organization Unit
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      disabled
                      value="Executive Administration"
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-500 text-xs font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Executive Bio & Memo Notes
                </label>
                <textarea
                  rows={4}
                  value={personalInfo}
                  onChange={(e) => setPersonalInfo(e.target.value)}
                  placeholder="Executive communication preferences, office hours, or general notes..."
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:border-[#107c41] focus:bg-white text-xs resize-none text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-5 py-2.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
