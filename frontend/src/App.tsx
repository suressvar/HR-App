import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { RequireRole } from './components/RequireRole';
import { AppShell } from './components/AppShell';
import type { NavItem } from './components/AppShell';
import { Login } from './pages/Login';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { OwnerEmployees } from './pages/owner/OwnerEmployees';
import { OwnerAssignWork } from './pages/owner/OwnerAssignWork';
import { OwnerProfile } from './pages/owner/OwnerProfile';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeTasks } from './pages/employee/EmployeeTasks';
import { EmployeeProfile } from './pages/employee/EmployeeProfile';
import { LayoutDashboard, Users, CheckSquare, User } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ownerNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/owner/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Employees', path: '/owner/employees', icon: <Users className="w-4 h-4" /> },
  { label: 'Assign Work', path: '/owner/assign-work', icon: <CheckSquare className="w-4 h-4" /> },
  { label: 'Profile', path: '/owner/profile', icon: <User className="w-4 h-4" /> },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Tasks', path: '/employee/tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { label: 'Profile', path: '/employee/profile', icon: <User className="w-4 h-4" /> },
];

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Owner Protected Routes */}
            <Route
              path="/owner"
              element={
                <RequireRole role="OWNER">
                  <AppShell navItems={ownerNavItems} />
                </RequireRole>
              }
            >
              <Route path="dashboard" element={<OwnerDashboard />} />
              <Route path="employees" element={<OwnerEmployees />} />
              <Route path="assign-work" element={<OwnerAssignWork />} />
              <Route path="profile" element={<OwnerProfile />} />
            </Route>

            {/* Employee Protected Routes */}
            <Route
              path="/employee"
              element={
                <RequireRole role="EMPLOYEE">
                  <AppShell navItems={employeeNavItems} />
                </RequireRole>
              }
            >
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="tasks" element={<EmployeeTasks />} />
              <Route path="profile" element={<EmployeeProfile />} />
            </Route>

          {/* Root Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);
};

export default App;
