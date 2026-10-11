import React, { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ArrowUpDown,
  Star,
  Clock,
  ListTodo,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SheetTab {
  label: string;
  shortLabel: string;
  path: string;
  icon: React.ReactNode;
}

export const ExcelBottomTabBar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === 'OWNER';

  const ownerTabs: SheetTab[] = [
    { label: 'Dashboard Overview', shortLabel: 'Dashboard', path: '/owner/dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { label: 'A to Z Tasks', shortLabel: 'A to Z Tasks', path: '/owner/assign-work/a-to-z', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
    { label: '10 Points Priority', shortLabel: '10 Points', path: '/owner/assign-work/ten-points', icon: <Star className="w-3.5 h-3.5" /> },
    { label: 'Pending Approval', shortLabel: 'Pending', path: '/owner/assign-work/pending', icon: <Clock className="w-3.5 h-3.5" /> },
    { label: 'Staff / Employees', shortLabel: 'Staff Master', path: '/owner/employees', icon: <Users className="w-3.5 h-3.5" /> },
    { label: 'To-Do Checklist', shortLabel: 'To-Do List', path: '/owner/todos', icon: <ListTodo className="w-3.5 h-3.5" /> },
    { label: 'System Settings', shortLabel: 'Settings', path: '/owner/settings', icon: <Settings className="w-3.5 h-3.5" /> },
    { label: 'My Profile', shortLabel: 'Profile', path: '/owner/profile', icon: <User className="w-3.5 h-3.5" /> },
  ];

  const employeeTabs: SheetTab[] = [
    { label: 'Dashboard Overview', shortLabel: 'Dashboard', path: '/employee/dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { label: 'A to Z Tasks', shortLabel: 'A to Z Tasks', path: '/employee/tasks/a-to-z', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
    { label: '10 Points Priority', shortLabel: '10 Points', path: '/employee/tasks/ten-points', icon: <Star className="w-3.5 h-3.5" /> },
    { label: 'Pending Execution', shortLabel: 'Pending', path: '/employee/tasks/pending', icon: <Clock className="w-3.5 h-3.5" /> },
    { label: 'To-Do Checklist', shortLabel: 'To-Do List', path: '/employee/todos', icon: <ListTodo className="w-3.5 h-3.5" /> },
    { label: 'My Profile', shortLabel: 'Profile', path: '/employee/profile', icon: <User className="w-3.5 h-3.5" /> },
  ];

  const tabs = isOwner ? ownerTabs : employeeTabs;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -150, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 150, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#e2e8f0] border-t-2 border-[#cbd5e1] text-xs font-sans select-none shrink-0 z-30 shadow-lg">
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        {/* Left: Tab scroll buttons + Horizontal Sheet Tabs */}
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
          {/* Sheet Scroll Left/Right arrows */}
          <div className="flex items-center gap-0.5 bg-slate-300 rounded p-0.5 shrink-0">
            <button
              onClick={scrollLeft}
              title="Scroll sheet tabs left"
              className="p-1 hover:bg-white rounded text-slate-700 hover:text-[#107c41] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={scrollRight}
              title="Scroll sheet tabs right"
              className="p-1 hover:bg-white rounded text-slate-700 hover:text-[#107c41] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Horizontal Scrollable Tabs List */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-1"
          >
            {tabs.map((tab) => {
              const isActive = location.pathname.startsWith(tab.path);
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  title={`Open sheet: ${tab.label}`}
                  className={`excel-tab ${isActive ? 'active' : ''}`}
                >
                  {tab.icon}
                  <span className="font-semibold">{tab.shortLabel}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};
