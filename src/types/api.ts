export type { Role } from './roles';

import type { Role } from './roles';

export type UUID = string | number;

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ListResponse<T> = T[] | PaginatedResponse<T>;

export type Ref<T> = UUID | T;

export type User = {
  id: UUID;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string | null;
  role: Role;
  role_display?: string;
  institution?: UUID | null;
  institution_name?: string | null;
  institution_code?: string | null;
  branch?: UUID | null;
  branch_name?: string | null;
  branch_code?: string | null;
  is_active?: boolean;
  is_email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

export type LoginResponse = {
  user: User;
  tokens: TokenPair;
};

export type TokenRefreshResponse = {
  access: string;
  refresh?: string;
};

export type Client = {
  id: UUID;
  user?: UUID | null;
  user_email?: string | null;
  institution?: UUID | null;
  institution_name?: string | null;
  institution_code?: string | null;
  branch?: UUID | null;
  branch_name?: string | null;
  branch_code?: string | null;
  member_number?: string;
  member_no?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  date_of_birth?: string | null;
  address?: string;
  occupation?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  status?: string;
  kyc_status?: string;
  created_at?: string;
  updated_at?: string;
};

export type ClientSavingsSummary = {
  account_count?: number;
  active_account_count?: number;
  total_balance?: string | number;
  transaction_count?: number;
};

export type ClientLoansSummary = {
  application_count?: number;
  open_application_count?: number;
  disbursed_loan_count?: number;
  total_requested_amount?: string | number;
  outstanding_principal_balance?: string | number;
  outstanding_interest_balance?: string | number;
};

export type ClientTransactionsSummary = {
  count?: number;
  total_credits?: string | number;
  total_debits?: string | number;
  net_flow?: string | number;
};

export type ClientSavingsActivity = {
  id: UUID;
  account?: UUID | null;
  account_number?: string;
  type?: string;
  amount?: string | number;
  balance_after?: string | number;
  reference?: string;
  notes?: string;
  created_at?: string;
};

export type ClientLoanSnapshot = {
  id: UUID;
  product?: UUID | string;
  product_name?: string;
  amount?: string | number;
  term_months?: number;
  status?: string;
  principal_balance?: string | number;
  interest_balance?: string | number;
  disbursed_at?: string | null;
  created_at?: string;
};

export type ClientProfile = Client & {
  savings_summary?: ClientSavingsSummary;
  loans_summary?: ClientLoansSummary;
  transactions_summary?: ClientTransactionsSummary;
  recent_savings_transactions?: ClientSavingsActivity[];
  recent_loans?: ClientLoanSnapshot[];
  recent_transactions?: Transaction[];
};

export type Institution = {
  id: UUID;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  currency?: string;
  status?: string;
  display_name?: string;
  branch_count?: number;
  active_branch_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type Branch = {
  id: UUID;
  institution?: Ref<Institution>;
  institution_name?: string;
  institution_code?: string;
  name: string;
  code: string;
  address?: string;
  status?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type LedgerAccount = {
  id: UUID;
  institution?: UUID | null;
  institution_name?: string;
  code: string;
  name: string;
  type: string;
  normal_balance?: string;
  description?: string;
  system_code?: string;
  is_system?: boolean;
  is_active?: boolean;
  allow_manual_entries?: boolean;
  journal_line_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type JournalEntryLine = {
  id?: UUID;
  account: UUID | string;
  account_code?: string;
  account_name?: string;
  description?: string;
  debit: string | number;
  credit: string | number;
};

export type JournalEntry = {
  id: UUID;
  institution?: UUID | null;
  institution_name?: string;
  branch?: UUID | null;
  branch_name?: string;
  reference: string;
  source_reference?: string;
  description?: string;
  entry_date?: string;
  status?: string;
  source?: string;
  posted_by?: UUID | null;
  posted_by_email?: string | null;
  posted_at?: string | null;
  total_debit?: string | number;
  total_credit?: string | number;
  is_balanced?: boolean;
  lines?: JournalEntryLine[];
  created_at?: string;
  updated_at?: string;
};

export type TrialBalanceRow = {
  id?: UUID;
  account?: UUID | null;
  code: string;
  name: string;
  type: string;
  normal_balance?: string;
  total_debit: string | number;
  total_credit: string | number;
  balance: string | number;
};

export type TrialBalanceReport = {
  generated_at?: string;
  as_of?: string;
  institution?: string | null;
  branch?: string | null;
  rows: TrialBalanceRow[];
  totals?: {
    debit?: string | number;
    credit?: string | number;
    difference?: string | number;
  };
};

export type SavingsAccount = {
  id: UUID;
  account_number?: string;
  account_no?: string;
  client?: Ref<Client>;
  client_name?: string;
  balance: string | number;
  status?: string;
};

export type LoanApplication = {
  id: UUID;
  client?: Ref<Client>;
  client_name?: string;
  product?: UUID | string;
  amount?: string | number;
  requested_amount?: string | number;
  principal_balance?: string | number;
  status: string;
  submitted_at?: string;
  created_at?: string;
};

export type LoanRepayment = {
  id: UUID;
  loan_application?: Ref<LoanApplication>;
  amount: string | number;
  principal_amount?: string | number;
  interest_amount?: string | number;
  paid_at?: string;
  created_at?: string;
  status?: string;
};

export type Transaction = {
  id: UUID;
  date?: string;
  created_at?: string;
  reference?: string;
  client_name?: string;
  category?: string;
  direction?: string;
  type?: string;
  amount: string | number;
  status?: string;
};

export type AdminDashboardSummary = {
  clients_count?: number;
  total_clients?: number;
  total_deposits?: string | number;
  total_savings_balance?: string | number;
  loan_portfolio?: string | number;
  active_loan_principal?: string | number;
  repayment_performance?: string | number;
  pending_loans?: number;
};

export type StaffDashboardSummary = {
  todays_collections?: string | number;
  pending_loan_applications?: number;
  active_clients?: number;
  portfolio_summary?: string | number;
  recent_transactions?: Transaction[];
};

export type ClientDashboardSummary = {
  total_savings_balance?: string | number;
  active_loan_balance?: string | number;
  active_loans?: LoanApplication[];
  repayment_schedule?: unknown[];
  recent_transactions?: Transaction[];
  notifications?: unknown[];
};

export type ApiProblem = {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, unknown>;
  path?: string | null;
  details?: unknown;
};
