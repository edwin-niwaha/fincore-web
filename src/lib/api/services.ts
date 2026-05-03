import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  AdminDashboardSummary,
  Branch,
  Client,
  ClientDashboardSummary,
  ClientLinkableUser,
  ClientProfile,
  Institution,
  JournalEntry,
  LedgerAccount,
  LoanApplication,
  LoanProduct,
  LoanPortfolioReport,
  LoanRepayment,
  LoginResponse,
  Notification,
  PaginatedResponse,
  RepaymentScheduleRow,
  SavingsBalancesReport,
  SavingsAccount,
  SavingsTransaction,
  SelfServiceDashboardSummary,
  SelfServiceLoanStatement,
  SelfServiceSavingsStatement,
  SelfServiceSavingsSummary,
  StaffDashboardSummary,
  TrialBalanceReport,
  Transaction,
  User,
  ShareProduct,
  ShareAccount,
  ShareTransaction,
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
export type ClientSelfServicePayload = {
  phone?: string;
  email?: string;
  address?: string;
  avatar?: File | null;
};
type SavingsAccountWritePayload = {
  client: string | number;
  status: string;
};
type SavingsOperationPayload = {
  amount: string | number;
  reference: string;
  notes?: string;
};
type ShareProductWritePayload = {
  institution: string | number;
  name: string;
  code: string;
  nominal_price: string | number;
  minimum_shares?: number;
  maximum_shares?: number | null;
  allow_dividends?: boolean;
  status?: string;
  description?: string;
};
type ShareAccountWritePayload = {
  client: string | number;
  product: string | number;
  status?: string;
};
type ShareOperationPayload = {
  shares: number;
  reference: string;
  notes?: string;
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
type LoanProductWritePayload = {
  institution: string | number;
  name: string;
  code: string;
  min_amount: string | number;
  max_amount: string | number;
  annual_interest_rate: string | number;
  interest_method?: string;
  repayment_frequency?: string;
  min_term_months: number;
  max_term_months: number;
  default_term_months?: number | null;
  penalty_rate?: string | number;
  penalty_flat_amount?: string | number;
  penalty_grace_days?: number;
  is_active?: boolean;
};
type LoanApplicationWritePayload = {
  client?: string | number;
  product: string | number;
  amount: string | number;
  term_months: number;
  purpose?: string;
  submit?: boolean;
};
type LoanDecisionPayload = {
  reason?: string;
  comment?: string;
  reference?: string;
  disbursement_method?: string;
  override?: boolean;
};
type LoanRepaymentWritePayload = {
  amount: string | number;
  reference: string;
  payment_method?: string;
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

async function listAllPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let nextPath: string | null = path;

  while (nextPath) {
    const page: ListResponse<T> = await apiClient.get<ListResponse<T>>(nextPath);

    if (Array.isArray(page)) {
      rows.push(...page);
      break;
    }

    rows.push(...(page.results ?? []));
    nextPath = page.next;
  }

  return rows;
}

export const resourcesApi = {
  clients: createResourceApi<Client>(endpoints.clients, endpoints.clientDetail),
  savingsAccounts: createResourceApi<SavingsAccount>(
    endpoints.savingsAccounts,
    endpoints.savingsAccountDetail,
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

export const loanApi = {
  products: createCrudResourceApi<LoanProduct, LoanProductWritePayload>(
    endpoints.loanProducts,
    endpoints.loanProductDetail,
  ),
  applications: {
    ...createCrudResourceApi<LoanApplication, LoanApplicationWritePayload>(
      endpoints.loanApplications,
      endpoints.loanApplicationDetail,
    ),
    submit: (id: string | number, payload?: LoanDecisionPayload) =>
      apiClient.post<LoanApplication>(endpoints.loanApplicationSubmit(id), payload ?? {}),
    startReview: (id: string | number, payload?: LoanDecisionPayload) =>
      apiClient.post<LoanApplication>(
        endpoints.loanApplicationStartReview(id),
        payload ?? {},
      ),
    recommend: (id: string | number, payload?: LoanDecisionPayload) =>
      apiClient.post<LoanApplication>(
        endpoints.loanApplicationRecommend(id),
        payload ?? {},
      ),
    approve: (id: string | number, payload?: LoanDecisionPayload) =>
      apiClient.post<LoanApplication>(endpoints.loanApplicationApprove(id), payload ?? {}),
    reject: (id: string | number, payload?: LoanDecisionPayload) =>
      apiClient.post<LoanApplication>(endpoints.loanApplicationReject(id), payload ?? {}),
    disburse: (id: string | number, payload: LoanDecisionPayload) =>
      apiClient.post<LoanApplication>(endpoints.loanApplicationDisburse(id), payload),
    repay: (id: string | number, payload: LoanRepaymentWritePayload) =>
      apiClient.post<LoanRepayment>(endpoints.loanApplicationRepay(id), payload),
    schedule: (id: string | number) =>
      apiClient.get<ListResponse<RepaymentScheduleRow>>(
        endpoints.loanApplicationSchedule(id),
      ),
    repayments: (id: string | number, query?: Query) =>
      apiClient.get<ListResponse<LoanRepayment>>(
        withQuery(endpoints.loanApplicationRepayments(id), query),
      ),
  },
  repayments: createResourceApi<LoanRepayment>(
    endpoints.loanRepayments,
    (id) => `/api/v1/loans/repayments/${id}/`,
  ),
};

export const savingsApi = {
  accounts: {
    ...createCrudResourceApi<SavingsAccount, SavingsAccountWritePayload>(
      endpoints.savingsAccounts,
      endpoints.savingsAccountDetail,
    ),
    deposit: (id: string | number, payload: SavingsOperationPayload) =>
      apiClient.post<SavingsTransaction>(endpoints.savingsAccountDeposit(id), payload),
    withdraw: (id: string | number, payload: SavingsOperationPayload) =>
      apiClient.post<SavingsTransaction>(endpoints.savingsAccountWithdraw(id), payload),
    transactions: (id: string | number, query?: Query) =>
      apiClient.get<ListResponse<SavingsTransaction>>(
        withQuery(endpoints.savingsAccountTransactions(id), query),
      ),
  },
  transactions: createResourceApi<SavingsTransaction>(
    endpoints.savingsTransactions,
    (id) => `/api/v1/savings/transactions/${id}/`,
  ),
};

export type StatementProfile = {
  name: string;
  logo_url: string;
  postal_address: string;
  physical_address: string;
  phone: string;
  email: string;
  website: string;
  statement_title: string;
  currency: string;
};

export const institutionsApi = {
  statementProfile: () =>
    apiClient.get<StatementProfile>(endpoints.institutionStatementProfile),
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

  listLinkableUsers: (query?: Query) =>
    apiClient.get<ListResponse<ClientLinkableUser>>(
      withQuery(endpoints.clientLinkableUsers, query),
    ),

  getProfile: (id: string | number) =>
    apiClient.get<ClientProfile>(endpoints.clientDetail(id)),

  me: () => apiClient.get<ClientProfile>(endpoints.clientMe),

  updateMe: (payload: ClientSelfServicePayload | FormData) =>
    apiClient.patch<ClientProfile>(endpoints.clientMe, payload),
};

export const sharesApi = {
  products: createCrudResourceApi<ShareProduct, ShareProductWritePayload>(
    endpoints.shareProducts,
    endpoints.shareProductDetail,
  ),
  accounts: {
    ...createCrudResourceApi<ShareAccount, ShareAccountWritePayload>(
      endpoints.shareAccounts,
      endpoints.shareAccountDetail,
    ),
    purchase: (id: string | number, payload: ShareOperationPayload) =>
      apiClient.post<ShareTransaction>(endpoints.shareAccountPurchase(id), payload),
    redeem: (id: string | number, payload: ShareOperationPayload) =>
      apiClient.post<ShareTransaction>(endpoints.shareAccountRedeem(id), payload),
    transactions: (id: string | number, query?: Query) =>
      apiClient.get<ListResponse<ShareTransaction>>(
        withQuery(endpoints.shareAccountTransactions(id), query),
      ),
  },
  transactions: createResourceApi<ShareTransaction>(
    endpoints.shareTransactions,
    (id) => `/api/v1/shares/transactions/${id}/`,
  ),
};

export const notificationsApi = {
  list: (query?: Query) =>
    apiClient.get<ListResponse<Notification>>(withQuery(endpoints.notifications, query)),
  markRead: (id: string | number) =>
    apiClient.post<Notification>(endpoints.notificationMarkRead(id)),
  markAllRead: () =>
    apiClient.post<{ detail: string }>(endpoints.notificationsMarkAllRead),
};

export const selfServiceApi = {
  dashboard: () =>
    apiClient.get<SelfServiceDashboardSummary>(endpoints.selfService.dashboard),

  profile: {
    get: () => apiClient.get<ClientProfile>(endpoints.selfService.profile),
    update: (payload: ClientSelfServicePayload | FormData) =>
      apiClient.patch<ClientProfile>(endpoints.selfService.profile, payload),
  },
  savings: {
    summary: () =>
      apiClient.get<SelfServiceSavingsSummary>(endpoints.selfService.savingsSummary),
    statement: (query?: Query) =>
      apiClient.get<SelfServiceSavingsStatement>(
        withQuery(endpoints.selfService.savingsStatement, query),
      ),
    list: (query?: Query) =>
      apiClient.get<ListResponse<SavingsAccount>>(
        withQuery(endpoints.selfService.savings, query),
      ),
    transactions: (query?: Query) =>
      apiClient.get<ListResponse<SavingsTransaction>>(
        withQuery(endpoints.selfService.savingsTransactions, query),
      ),
  },
  loanProducts: {
    list: (query?: Query) =>
      apiClient.get<ListResponse<LoanProduct>>(
        withQuery(endpoints.selfService.loanProducts, query),
      ),
  },
  loanApplications: {
    list: (query?: Query) =>
      apiClient.get<ListResponse<LoanApplication>>(
        withQuery(endpoints.selfService.loanApplications, query),
      ),
    create: (payload: LoanApplicationWritePayload) =>
      apiClient.post<LoanApplication>(endpoints.selfService.loanApplications, payload),
    get: (id: string | number) =>
      apiClient.get<LoanApplication>(endpoints.selfService.loanApplicationDetail(id)),
  },
  loans: {
    statement: (query?: Query) =>
      apiClient.get<SelfServiceLoanStatement>(
        withQuery(endpoints.selfService.loanStatement, query),
      ),
    list: (query?: Query) =>
      apiClient.get<ListResponse<LoanApplication>>(
        withQuery(endpoints.selfService.loans, query),
      ),
    get: (id: string | number) =>
      apiClient.get<LoanApplication>(endpoints.selfService.loanDetail(id)),
  },
  repayments: {
    list: (query?: Query) =>
      apiClient.get<ListResponse<LoanRepayment>>(
        withQuery(endpoints.selfService.repayments, query),
      ),
  },
  transactions: {
    list: (query?: Query) =>
      apiClient.get<ListResponse<Transaction>>(
        withQuery(endpoints.selfService.transactions, query),
      ),
  },
  notifications: {
    list: (query?: Query) =>
      apiClient.get<ListResponse<Notification>>(
        withQuery(endpoints.selfService.notifications, query),
      ),
    markRead: (id: string | number) =>
      apiClient.post<Notification>(endpoints.selfService.notificationMarkRead(id)),
    markAllRead: () =>
      apiClient.post<{ detail: string; updated?: number }>(
        endpoints.selfService.notificationsMarkAllRead,
      ),
  },
};

export const accountingApi = {
  accounts: {
    ...createCrudResourceApi<LedgerAccount, LedgerAccountWritePayload>(
      endpoints.accountingAccounts,
      endpoints.accountingAccountDetail,
    ),
    listAll: (query?: Query) =>
      listAllPages<LedgerAccount>(withQuery(endpoints.accountingAccounts, query)),
  },
  journalEntries: {
    ...createCrudResourceApi<JournalEntry, JournalEntryWritePayload>(
      endpoints.accountingJournalEntries,
      endpoints.accountingJournalEntryDetail,
    ),
    post: (id: string | number) =>
      apiClient.post<JournalEntry>(endpoints.accountingJournalEntryPost(id)),
    listAll: (query?: Query) =>
      listAllPages<JournalEntry>(
        withQuery(endpoints.accountingJournalEntries, query),
      ),
  },
  reports: {
    savingsBalances: (query?: Query) =>
      apiClient.get<SavingsBalancesReport>(
        withQuery(endpoints.reports.savingsBalances, query),
      ),
    loanPortfolio: (query?: Query) =>
      apiClient.get<LoanPortfolioReport>(
        withQuery(endpoints.reports.loanPortfolio, query),
      ),
    trialBalance: (query?: Query) =>
      apiClient.get<TrialBalanceReport>(
        withQuery(endpoints.reports.trialBalance, query),
      ),
  },
  trialBalance: (query?: Query) =>
    apiClient.get<TrialBalanceReport>(
      withQuery(endpoints.reports.trialBalance, query),
    ),
};
