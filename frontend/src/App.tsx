import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
import { RequireRole } from './components/RequireRole';
import { AppShell } from './components/AppShell';
import type { NavItem } from './components/AppShell';
import { Login } from './pages/Login';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { OwnerEmployees } from './pages/owner/OwnerEmployees';
import { OwnerAssignWork } from './pages/owner/OwnerAssignWork';
import { OwnerProfile } from './pages/owner/OwnerProfile';
import { OwnerSettings } from './pages/owner/OwnerSettings';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeTasks } from './pages/employee/EmployeeTasks';
import { EmployeeProfile } from './pages/employee/EmployeeProfile';
import { TodoPage } from './pages/TodoPage';
import { LayoutDashboard, Users, User, ListTodo, ArrowUpDown, Star, Clock, Settings } from 'lucide-react';

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
  { label: 'A to Z', path: '/owner/assign-work/a-to-z', icon: <ArrowUpDown className="w-4 h-4" /> },
  { label: '10 Points', path: '/owner/assign-work/ten-points', icon: <Star className="w-4 h-4" /> },
  { label: 'Pending', path: '/owner/assign-work/pending', icon: <Clock className="w-4 h-4" /> },
  { label: 'To-Do List', path: '/owner/todos', icon: <ListTodo className="w-4 h-4" /> },
  { label: 'Profile', path: '/owner/profile', icon: <User className="w-4 h-4" /> },
  { label: 'Settings', path: '/owner/settings', icon: <Settings className="w-4 h-4" /> },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'A to Z', path: '/employee/tasks/a-to-z', icon: <ArrowUpDown className="w-4 h-4" /> },
  { label: '10 Points', path: '/employee/tasks/ten-points', icon: <Star className="w-4 h-4" /> },
  { label: 'Pending', path: '/employee/tasks/pending', icon: <Clock className="w-4 h-4" /> },
  { label: 'To-Do List', path: '/employee/todos', icon: <ListTodo className="w-4 h-4" /> },
  { label: 'Profile', path: '/employee/profile', icon: <User className="w-4 h-4" /> },
];

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchProvider>
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
                <Route path="assign-work/:tab" element={<OwnerAssignWork />} />
                <Route path="assign-work" element={<Navigate to="a-to-z" replace />} />
                <Route path="todos" element={<TodoPage />} />
                <Route path="profile" element={<OwnerProfile />} />
                <Route path="settings" element={<OwnerSettings />} />
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
                <Route path="tasks/:tab" element={<EmployeeTasks />} />
                <Route path="tasks" element={<Navigate to="a-to-z" replace />} />
                <Route path="forwarded-tasks" element={<Navigate to="/employee/tasks/a-to-z" replace />} />
                <Route path="todos" element={<TodoPage />} />
                <Route path="profile" element={<EmployeeProfile />} />
              </Route>

              {/* Root Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </SearchProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
