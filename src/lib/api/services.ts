import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  AdminDashboardSummary,
  Branch,
  Client,
  ClientProfile,
  ClientDashboardSummary,
  Institution,
  JournalEntry,
  LedgerAccount,
  LoanApplication,
  LoanRepayment,
  LoginResponse,
  PaginatedResponse,
  SavingsAccount,
  StaffDashboardSummary,
  TrialBalanceReport,
  Transaction,
  User,
} from '@/types/api';

type ListResponse<T> = T[] | PaginatedResponse<T>;
type Query = Record<string, string | number | boolean | undefined>;
type InstitutionWritePayload = {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  currency: string;
  status: string;
};
type BranchWritePayload = {
  institution: string | number;
  name: string;
  code: string;
  address?: string;
  status: string;
};
type UserWritePayload = {
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  institution?: string | number | null;
  branch?: string | number | null;
  is_active?: boolean;
  password?: string;
};
type ClientWritePayload = {
  user?: string | number | null;
  institution: string | number;
  branch: string | number;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  national_id?: string;
  date_of_birth?: string;
  address?: string;
  occupation?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  status: string;
};
type ClientSelfServicePayload = {
  phone?: string;
  email?: string;
  date_of_birth?: string;
  address?: string;
  occupation?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
};
type LedgerAccountWritePayload = {
  institution: string | number;
  code: string;
  name: string;
  type: string;
  description?: string;
  is_active?: boolean;
  allow_manual_entries?: boolean;
};
type JournalEntryLinePayload = {
  account: string | number;
  description?: string;
  debit: string | number;
  credit: string | number;
};
type JournalEntryWritePayload = {
  institution: string | number;
  branch?: string | number | null;
  reference: string;
  description?: string;
  entry_date?: string;
  status?: string;
  lines: JournalEntryLinePayload[];
};

function withQuery(path: string, query?: Query) {
  if (!query) return path;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null)
      params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const authApi = {
  register: (payload: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
  }) =>
    apiClient.post<LoginResponse>(endpoints.auth.register, payload, {
      skipAuth: true,
    }),

  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>(
      endpoints.auth.login,
      { email, password },
      { skipAuth: true },
    ),

  loginWithGoogle: (accessToken: string) =>
    apiClient.post<LoginResponse>(
      endpoints.auth.google,
      { access_token: accessToken },
      { skipAuth: true },
    ),

  profile: () => apiClient.get<User>(endpoints.auth.profile),

  logout: (refresh: string) =>
    apiClient.post<void>(endpoints.auth.logout, { refresh }),

  refresh: (refresh: string) =>
    apiClient.post<{ access: string; refresh?: string }>(
      endpoints.auth.refresh,
      { refresh },
      { skipAuth: true },
    ),

  sendEmailVerification: () =>
    apiClient.post<{ detail: string }>(endpoints.auth.sendEmailVerification),

  verifyEmail: (code: string) =>
    apiClient.post<{ detail: string; user: User }>(endpoints.auth.verifyEmail, {
      code,
    }),

  forgotPassword: (email: string) =>
    apiClient.post<{ detail: string }>(
      endpoints.auth.forgotPassword,
      { email },
      { skipAuth: true },
    ),

  resetPassword: (payload: {
    email: string;
    code: string;
    password: string;
    password_confirm: string;
  }) =>
    apiClient.post<{ detail: string }>(endpoints.auth.resetPassword, payload, {
      skipAuth: true,
    }),

  updateProfile: (payload: {
    username?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => apiClient.patch<User>(endpoints.auth.profile, payload),

  changePassword: (payload: {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
  }) =>
    apiClient.post<{ detail: string }>(endpoints.auth.changePassword, payload),
};

export const dashboardApi = {
  admin: () => apiClient.get<AdminDashboardSummary>(endpoints.dashboards.admin),
  staff: () => apiClient.get<StaffDashboardSummary>(endpoints.dashboards.staff),
  client: () =>
    apiClient.get<ClientDashboardSummary>(endpoints.dashboards.client),
};

function createResourceApi<T>(
  basePath: string,
  detailPath: (id: string | number) => string,
) {
  return {
    list: (query?: Query) =>
      apiClient.get<ListResponse<T>>(withQuery(basePath, query)),
    get: (id: string | number) => apiClient.get<T>(detailPath(id)),
  };
}

function createCrudResourceApi<T, TPayload extends Record<string, unknown>>(
  basePath: string,
  detailPath: (id: string | number) => string,
) {
  return {
    list: (query?: Query) =>
      apiClient.get<ListResponse<T>>(withQuery(basePath, query)),
    get: (id: string | number) => apiClient.get<T>(detailPath(id)),
    create: (payload: TPayload) => apiClient.post<T>(basePath, payload),
    update: (id: string | number, payload: Partial<TPayload>) =>
      apiClient.patch<T>(detailPath(id), payload),
    remove: (id: string | number) => apiClient.delete<void>(detailPath(id)),
  };
}

export const resourcesApi = {
  clients: createResourceApi<Client>(endpoints.clients, endpoints.clientDetail),
  savingsAccounts: createResourceApi<SavingsAccount>(
    endpoints.savingsAccounts,
    (id) => `/api/v1/savings/accounts/${id}/`,
  ),
  loanApplications: createResourceApi<LoanApplication>(
    endpoints.loanApplications,
    (id) => `/api/v1/loans/applications/${id}/`,
  ),
  loanRepayments: createResourceApi<LoanRepayment>(
    endpoints.loanRepayments,
    (id) => `/api/v1/loans/repayments/${id}/`,
  ),
  transactions: createResourceApi<Transaction>(
    endpoints.transactions,
    (id) => `/api/v1/transactions/${id}/`,
  ),
};

export const adminApi = {
  institutions: createCrudResourceApi<Institution, InstitutionWritePayload>(
    endpoints.institutions,
    endpoints.institutionDetail,
  ),
  branches: createCrudResourceApi<Branch, BranchWritePayload>(
    endpoints.branches,
    endpoints.branchDetail,
  ),
  users: createCrudResourceApi<User, UserWritePayload>(
    endpoints.users,
    endpoints.userDetail,
  ),
};

export const clientsApi = {
  ...createCrudResourceApi<Client, ClientWritePayload>(
    endpoints.clients,
    endpoints.clientDetail,
  ),
  getProfile: (id: string | number) =>
    apiClient.get<ClientProfile>(endpoints.clientDetail(id)),
  me: () => apiClient.get<ClientProfile>(endpoints.clientMe),
  updateMe: (payload: ClientSelfServicePayload) =>
    apiClient.patch<ClientProfile>(endpoints.clientMe, payload),
};

export const accountingApi = {
  accounts: createCrudResourceApi<LedgerAccount, LedgerAccountWritePayload>(
    endpoints.accountingAccounts,
    endpoints.accountingAccountDetail,
  ),
  journalEntries: {
    ...createCrudResourceApi<JournalEntry, JournalEntryWritePayload>(
      endpoints.accountingJournalEntries,
      endpoints.accountingJournalEntryDetail,
    ),
    post: (id: string | number) =>
      apiClient.post<JournalEntry>(endpoints.accountingJournalEntryPost(id)),
  },
  trialBalance: (query?: Query) =>
    apiClient.get<TrialBalanceReport>(
      withQuery(endpoints.reports.trialBalance, query),
    ),
};
