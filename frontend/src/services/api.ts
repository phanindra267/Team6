import axios from 'axios';

// Fallback to local server port if environment variable is not defined
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export interface OnboardingRequest {
  id: string;
  request_id: string;
  employee_email: string;
  sf_employee_id: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  department: string;
  designation: string;
  manager: string;
  joining_date: string;
  initiated_by: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  sf_write_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  team_slack_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  hr_slack_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalRequests: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
  failureCount: number;
  retryCount: number;
}

export interface RecentActivity {
  id: string;
  name: string;
  email: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  recentActivities: RecentActivity[];
}

export interface HealthResponse {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  services: {
    database: 'UP' | 'DOWN';
    redis: 'UP' | 'DOWN';
    successFactors: 'UP' | 'DOWN';
  };
}

// Service methods
export const getDashboardData = async (): Promise<DashboardResponse> => {
  const res = await apiClient.get('/dashboard');
  return res.data.data;
};

export const getRequests = async (): Promise<OnboardingRequest[]> => {
  const res = await apiClient.get('/onboarding');
  return res.data.data;
};

export const getRequestDetails = async (id: string): Promise<OnboardingRequest> => {
  const res = await apiClient.get(`/onboarding/${id}`);
  return res.data.data;
};

export const createRequest = async (payload: any): Promise<OnboardingRequest> => {
  const res = await apiClient.post('/onboarding', payload);
  return res.data.data;
};

export const retryRequest = async (id: string): Promise<OnboardingRequest> => {
  const res = await apiClient.post(`/onboarding/${id}/retry`);
  return res.data.data;
};

export const getFailures = async (): Promise<OnboardingRequest[]> => {
  const res = await apiClient.get('/failures');
  return res.data.data;
};

export const getHealthCheck = async (): Promise<HealthResponse> => {
  const res = await apiClient.get('/health');
  return res.data;
};
