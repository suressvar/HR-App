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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completedAt?: string | null;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface DashboardSummary {
  totalEmployees: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}
