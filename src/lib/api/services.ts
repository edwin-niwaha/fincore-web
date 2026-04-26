import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  AdminDashboardSummary,
  Client,
  ClientDashboardSummary,
  LoanApplication,
  LoanRepayment,
  LoginResponse,
  PaginatedResponse,
  SavingsAccount,
  StaffDashboardSummary,
  Transaction,
  User,
} from '@/types/api';

type ListResponse<T> = T[] | PaginatedResponse<T>;
type Query = Record<string, string | number | boolean | undefined>;

function withQuery(path: string, query?: Query) {
  if (!query) return path;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const authApi = {
  register: (payload: { email: string; username: string; password: string; password_confirm: string }) =>
    apiClient.post<LoginResponse>(endpoints.auth.register, payload, { skipAuth: true }),

  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>(endpoints.auth.login, { email, password }, { skipAuth: true }),

  loginWithGoogle: (accessToken: string) =>
    apiClient.post<LoginResponse>(endpoints.auth.google, { access_token: accessToken }, { skipAuth: true }),

  profile: () => apiClient.get<User>(endpoints.auth.profile),

  logout: (refresh: string) => apiClient.post<void>(endpoints.auth.logout, { refresh }),

  sendEmailVerification: () =>
    apiClient.post<{ detail: string }>(endpoints.auth.sendEmailVerification),

  verifyEmail: (code: string) =>
    apiClient.post<{ detail: string; user: User }>(endpoints.auth.verifyEmail, { code }),

  forgotPassword: (email: string) =>
    apiClient.post<{ detail: string }>(endpoints.auth.forgotPassword, { email }, { skipAuth: true }),

  resetPassword: (payload: { email: string; code: string; password: string; password_confirm: string }) =>
    apiClient.post<{ detail: string }>(endpoints.auth.resetPassword, payload, { skipAuth: true }),
};

export const dashboardApi = {
  admin: () => apiClient.get<AdminDashboardSummary>(endpoints.dashboards.admin),
  staff: () => apiClient.get<StaffDashboardSummary>(endpoints.dashboards.staff),
  client: () => apiClient.get<ClientDashboardSummary>(endpoints.dashboards.client),
};

function createResourceApi<T>(basePath: string, detailPath: (id: string | number) => string) {
  return {
    list: (query?: Query) => apiClient.get<ListResponse<T>>(withQuery(basePath, query)),
    get: (id: string | number) => apiClient.get<T>(detailPath(id)),
  };
}

export const resourcesApi = {
  clients: createResourceApi<Client>(endpoints.clients, endpoints.clientDetail),
  savingsAccounts: createResourceApi<SavingsAccount>(
    endpoints.savingsAccounts,
    (id) => `/api/v1/savings/accounts/${id}/`
  ),
  loanApplications: createResourceApi<LoanApplication>(
    endpoints.loanApplications,
    (id) => `/api/v1/loans/applications/${id}/`
  ),
  loanRepayments: createResourceApi<LoanRepayment>(
    endpoints.loanRepayments,
    (id) => `/api/v1/loans/repayments/${id}/`
  ),
  transactions: createResourceApi<Transaction>(
    endpoints.transactions,
    (id) => `/api/v1/transactions/${id}/`
  ),
};
