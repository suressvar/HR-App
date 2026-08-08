export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role?: string;
  personalInfo?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'OWNER' | 'EMPLOYEE';
  profile?: UserProfile;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ApiError {
  error: string;
}
