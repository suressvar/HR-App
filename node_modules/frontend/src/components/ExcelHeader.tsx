import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { FileSpreadsheet, Download, Printer, LogOut, Search, Clock, Save, X } from 'lucide-react';

interface ExcelHeaderProps {
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
}

export const ExcelHeader: React.FC<ExcelHeaderProps> = ({ onSearchChange: propOnSearchChange, searchQuery: propSearchQuery }) => {
  const { user, logout } = useAuth();
  const searchCtx = useSearch();
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : searchCtx.searchQuery;
  const onSearchChange = propOnSearchChange || searchCtx.setSearchQuery;
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Do you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    window.dispatchEvent(new CustomEvent('excel-export-trigger'));
    alert('Exporting sheet data to Excel (.xlsx / .csv)...');
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="bg-[#107c41] text-white select-none text-xs font-sans shadow-md shrink-0 z-30">
      {/* Main Top Ribbon */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#0b5a2f]">
        {/* Left: Excel Workbook Badge & Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0b5a2f] px-2.5 py-1 rounded shadow-inner border border-[#1b7e45]">
            <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            <span className="font-bold text-sm tracking-wide text-white">
              ICC Employee Management
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-100 bg-[#0d6937] px-2.5 py-1 rounded border border-[#187540]">
            <span className="font-semibold text-white">Workbook:</span>
            <span>ICC_Workforce_2026.xlsx</span>
            <span className="text-emerald-300 font-bold">• {isSaved ? 'Saved' : 'Auto-Saved'}</span>
          </div>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            title="Save changes"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[#0b5a2f] hover:bg-[#084624] text-white font-semibold rounded border border-[#1b7e45] transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-300" />
            <span>{isSaved ? 'Saved!' : 'Save'}</span>
          </button>

          <button
            onClick={handleExport}
            title="Export to Excel"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[#0b5a2f] hover:bg-[#084624] text-white font-semibold rounded border border-[#1b7e45] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span>Export</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print sheet"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[#0b5a2f] hover:bg-[#084624] text-white font-semibold rounded border border-[#1b7e45] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-300" />
            <span>Print</span>
          </button>
        </div>

        {/* Right: User Profile & Log Out */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block text-emerald-100">
            <div className="font-bold text-white text-xs">
              {user?.profile?.name || user?.email}
              <span className="ml-1.5 text-[15px] bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded uppercase">
                {user?.role}
              </span>
            </div>
            <div className="text-[15px] flex items-center justify-end gap-1 text-emerald-200">
              <Clock className="w-3 h-3" />
              <span>{formattedDate} • {formattedTime}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out of application"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition-colors cursor-pointer text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Formula & Search Bar (Excel fx Bar) */}
      <div className="bg-[#f8fafc] text-slate-700 px-3 py-1.5 flex items-center gap-2 border-b border-slate-300 shadow-inner">
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-300 font-mono text-xs font-bold text-slate-500 shrink-0">
          <span className="text-[#107c41] font-black italic">fx</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">SEARCH:</span>
        </div>

        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, employee names, status, or to-do notes..."
            className="w-full pl-8 pr-8 py-1 bg-white rounded border border-slate-300 focus:outline-none focus:border-[#107c41] text-xs font-sans text-slate-800 placeholder-slate-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
