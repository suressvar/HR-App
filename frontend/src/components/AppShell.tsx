import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LiveClock } from './LiveClock';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building2 } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  navItems: NavItem[];
}

export const AppShell: React.FC<AppShellProps> = ({ navItems }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-white text-ink overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col justify-between z-20 shrink-0">
        <div>
          {/* Logo / Company Header */}
          <div className="h-16 flex items-center px-6 border-b border-border gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-ink tracking-tight">ICC INDUSTRIES</h1>
              <p className="text-[11px] text-ink-muted font-medium">HR Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-brand-light text-brand font-semibold shadow-sm'
                      : 'text-ink-muted hover:bg-brand-light/50 hover:text-brand'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-ink truncate">
                {user?.profile?.name || user?.email}
              </p>
              <p className="text-[11px] text-ink-muted font-medium capitalize">
                {user?.role?.toLowerCase()} Account
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-ink-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-light text-brand">
              {user?.role} PORTAL
            </span>
          </div>

          {/* Live Clock pinned top-right */}
          <LiveClock />
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#FAF8FF]/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
