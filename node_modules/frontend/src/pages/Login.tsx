import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Lock, User, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      if (user.role === 'OWNER') {
        navigate('/owner/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f3f4f6] font-sans select-none">
      {/* Excel Top Bar */}
      <div className="bg-[#107c41] text-white px-4 py-2 flex items-center justify-between text-xs shadow-md">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
          <span className="font-bold text-sm">ICC Employee Management</span>
        </div>
        <span className="text-emerald-100 hidden sm:inline">Version 2026 • Single Click Access</span>
      </div>

      {/* Center Excel Login Dialog */}
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#107c41] text-white px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0b5a2f] flex items-center justify-center text-white font-bold text-lg shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white">Sign In to Workbook</h1>
              <p className="text-xs text-emerald-100">ICC INDUSTRIES COMPANY</p>
            </div>
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Username / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username (e.g. owner or sur)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:border-[#107c41] focus:ring-2 focus:ring-emerald-100 text-sm text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:border-[#107c41] focus:ring-2 focus:ring-emerald-100 text-sm text-slate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-[#107c41] hover:bg-[#0b5a2f] text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
                >
                  {isSubmitting ? (
                    <span>Opening Workbook...</span>
                  ) : (
                    <>
                      <span>Open Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-100 px-6 py-2.5 border-t border-slate-200 text-xs text-slate-500 text-center">
            Authorized Personnel Only • ICC Industries
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="bg-white border-t border-slate-300 px-4 py-1.5 flex items-center justify-between text-xs text-slate-500">
        <span>ICC Industries Management</span>
        <span>Ready • Excel Sheet Model</span>
      </div>
    </div>
  );
};
