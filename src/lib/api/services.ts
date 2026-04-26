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

/**
 * Generic list response (array OR paginated)
 */
type ListResponse<T> = T[] | PaginatedResponse<T>;

/**
 * Optional query params support (future-proof)
 */
type Query = Record<string, string | number | boolean | undefined>;

function withQuery(path: string, query?: Query) {
  if (!query) return path;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/* =========================
   AUTH API
========================= */
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>(
      endpoints.auth.login,
      { username: email, email, password },
      { skipAuth: true }
    ),

  profile: () =>
    apiClient.get<User>(endpoints.auth.profile),

  logout: (refresh: string) =>
    apiClient.post<void>(
      endpoints.auth.logout,
      { refresh }
    ),
};

/* =========================
   DASHBOARD API
========================= */
export const dashboardApi = {
  admin: () =>
    apiClient.get<AdminDashboardSummary>(endpoints.dashboards.admin),

  staff: () =>
    apiClient.get<StaffDashboardSummary>(endpoints.dashboards.staff),

  client: () =>
    apiClient.get<ClientDashboardSummary>(endpoints.dashboards.client),
};

/* =========================
   RESOURCE API FACTORY
========================= */
function createResourceApi<T>(basePath: string, detailPath: (id: string | number) => string) {
  return {
    list: (query?: Query) =>
      apiClient.get<ListResponse<T>>(withQuery(basePath, query)),

    get: (id: string | number) =>
      apiClient.get<T>(detailPath(id)),
  };
}

/* =========================
   RESOURCES API
========================= */
export const resourcesApi = {
  clients: createResourceApi<Client>(
    endpoints.clients,
    endpoints.clientDetail
  ),

  savingsAccounts: createResourceApi<SavingsAccount>(
    endpoints.savingsAccounts,
    (id) => `${endpoints.savingsAccounts}/${id}/`
  ),

  loanApplications: createResourceApi<LoanApplication>(
    endpoints.loanApplications,
    (id) => `${endpoints.loanApplications}/${id}/`
  ),

  loanRepayments: createResourceApi<LoanRepayment>(
    endpoints.loanRepayments,
    (id) => `${endpoints.loanRepayments}/${id}/`
  ),

  transactions: createResourceApi<Transaction>(
    endpoints.transactions,
    (id) => `${endpoints.transactions}/${id}/`
  ),
};