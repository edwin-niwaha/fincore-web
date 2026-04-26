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
  role: Role;
  institution?: UUID | null;
  branch?: UUID | null;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user?: User;
};

export type Client = {
  id: UUID;
  member_number?: string;
  member_no?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  status?: string;
  kyc_status?: string;
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
  details?: unknown;
};