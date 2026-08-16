export interface EmployeeItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: string;
  createdAt: string;
  _count?: {
    tasks: number;
  };
}

export interface TaskItem {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'OVERDUE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedHours?: number | null;
  category?: string | null;
  completionNotes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  frequency?: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'YEARLY';
  employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface EmployeeProgressItem {
  id: string;
  name: string;
  role: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
}

export interface DashboardSummary {
  totalEmployees: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  employeeProgress?: EmployeeProgressItem[];
  recentSelfAllocatedTasks?: TaskItem[];
}
