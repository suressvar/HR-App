import React from 'react';
import { Outlet } from 'react-router-dom';
import { ExcelHeader } from './ExcelHeader';
import { ExcelBottomTabBar } from './ExcelBottomTabBar';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  navItems: NavItem[];
}

export const AppShell: React.FC<AppShellProps> = ({ navItems: _navItems }) => {
  return (
    <div className="flex flex-col h-screen bg-[#f3f4f6] text-[#1f2937] overflow-hidden font-sans">
      {/* 1. Excel Top Ribbon Header */}
      <ExcelHeader />

      {/* 2. Main Spreadsheet Content Workspace */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#f8fafc]">
        <Outlet />
      </main>

      {/* 3. Horizontal Bottom Sheet Tabs Bar (Just like Excel) */}
      <ExcelBottomTabBar />
    </div>
  );
};
