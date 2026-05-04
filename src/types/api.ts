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
  profile_type?: string;
  linked_client_id?: UUID | null;
  linked_client_member_number?: string | null;
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
  user_username?: string | null;
  user_full_name?: string | null;
  institution?: UUID | null;
  institution_name?: string | null;
  institution_code?: string | null;
  branch?: UUID | null;
  branch_name?: string | null;
  branch_code?: string | null;
  member_number?: string;
  client_number?: string;
  member_no?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  gender?: string;
  gender_display?: string;
  date_of_birth?: string | null;
  address?: string;
  occupation?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  status?: string;
  kyc_status?: string;
  created_by?: UUID | null;
  created_by_email?: string | null;
  updated_by?: UUID | null;
  updated_by_email?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClientLinkableUser = {
  id: UUID;
  email: string;
  username?: string;
  full_name?: string;
  institution?: UUID | null;
  institution_name?: string | null;
  institution_code?: string | null;
  branch?: UUID | null;
  branch_name?: string | null;
  branch_code?: string | null;
  is_active?: boolean;
  is_email_verified?: boolean;
  linked_client_id?: UUID | null;
  linked_client_member_number?: string | null;
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
  avatar_url?: string | null;
  avatar?: string | null;

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

export type LoanProduct = {
  id: UUID;
  institution?: UUID | null;
  institution_name?: string | null;
  name: string;
  code: string;
  description?: string;
  min_amount?: string | number;
  max_amount?: string | number;
  annual_interest_rate?: string | number;
  interest_method?: string;
  repayment_frequency?: string;
  min_term_months?: number;
  max_term_months?: number;
  default_term_months?: number | null;
  grace_period_days?: number;
  penalty_rate?: string | number;
  penalty_flat_amount?: string | number;
  penalty_grace_days?: number;
  minimum_savings_balance?: string | number;
  minimum_share_capital?: string | number;
  max_outstanding_loans?: number | null;
  max_amount_to_savings_ratio?: string | number | null;
  max_amount_to_share_ratio?: string | number | null;
  debt_to_income_limit?: string | number | null;
  receivable_account?: UUID | null;
  receivable_account_name?: string | null;
  funding_account?: UUID | null;
  funding_account_name?: string | null;
  interest_income_account?: UUID | null;
  interest_income_account_name?: string | null;
  is_active?: boolean;
  application_count?: number;
  total_requested_amount?: string | number;
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

export type SavingsBalancesReport = {
  total_balance?: string | number;
  accounts?: number;
};

export type LoanPortfolioStatusBreakdown = {
  status: string;
  count: number;
  requested_amount?: string | number;
  outstanding_balance?: string | number;
};

export type LoanPortfolioProductBreakdown = {
  product_id?: UUID | null;
  product_name?: string;
  product_code?: string;
  loan_count?: number;
  requested_amount?: string | number;
  outstanding_balance?: string | number;
};

export type LoanPortfolioReportRow = LoanApplication & {
  oldest_due_date?: string | null;
  days_past_due?: number;
  overdue_installments?: number;
  overdue_amount?: string | number;
};

export type LoanPortfolioReport = {
  generated_at?: string;
  as_of?: string;
  institution?: string | null;
  branch?: string | null;
  product?: string | null;
  status?: string | null;
  principal_outstanding?: string | number;
  interest_outstanding?: string | number;
  portfolio_balance?: string | number;
  arrears_balance?: string | number;
  loans?: number;
  pending?: number;
  appraised?: number;
  recommended?: number;
  approved?: number;
  active?: number;
  overdue_loans?: number;
  closed?: number;
  rejected?: number;
  withdrawn?: number;
  written_off?: number;
  status_breakdown?: LoanPortfolioStatusBreakdown[];
  product_breakdown?: LoanPortfolioProductBreakdown[];
  rows?: LoanPortfolioReportRow[];
};

export type LoanDisbursementReportRow = {
  loan_id: UUID;
  client_name?: string;
  client_member_number?: string;
  branch_name?: string;
  product_name?: string;
  product_code?: string;
  status?: string;
  approved_at?: string | null;
  disbursed_at?: string | null;
  amount?: string | number;
  principal_balance?: string | number;
  interest_balance?: string | number;
  outstanding_balance?: string | number;
  disbursement_reference?: string;
  disbursement_method?: string;
};

export type LoanDisbursementReport = {
  generated_at?: string;
  date_from?: string | null;
  date_to?: string | null;
  institution?: string | null;
  branch?: string | null;
  product?: string | null;
  totals?: {
    count?: number;
    amount?: string | number;
    principal_outstanding?: string | number;
    interest_outstanding?: string | number;
    portfolio_balance?: string | number;
  };
  rows: LoanDisbursementReportRow[];
};

export type LoanCollectionsReportRow = {
  repayment_id: UUID;
  loan_id: UUID;
  client_name?: string;
  client_member_number?: string;
  branch_name?: string;
  product_name?: string;
  product_code?: string;
  recorded_at?: string | null;
  reference?: string;
  payment_method?: string;
  amount?: string | number;
  principal_component?: string | number;
  interest_component?: string | number;
  penalty_component?: string | number;
  remaining_balance_after?: string | number;
  received_by_email?: string;
};

export type LoanCollectionsReport = {
  generated_at?: string;
  date_from?: string | null;
  date_to?: string | null;
  institution?: string | null;
  branch?: string | null;
  product?: string | null;
  totals?: {
    count?: number;
    amount?: string | number;
    principal_component?: string | number;
    interest_component?: string | number;
    penalty_component?: string | number;
  };
  rows: LoanCollectionsReportRow[];
};

export type LoanArrearsAgingReportRow = {
  loan_id: UUID;
  client_name?: string;
  client_member_number?: string;
  branch_name?: string;
  product_name?: string;
  product_code?: string;
  status?: string;
  disbursed_at?: string | null;
  next_due_date?: string | null;
  oldest_due_date?: string | null;
  days_past_due?: number;
  overdue_installments?: number;
  overdue_amount?: string | number;
  outstanding_balance?: string | number;
  bucket_1_30?: string | number;
  bucket_31_60?: string | number;
  bucket_61_90?: string | number;
  bucket_91_plus?: string | number;
};

export type LoanArrearsAgingReport = {
  generated_at?: string;
  as_of?: string;
  institution?: string | null;
  branch?: string | null;
  product?: string | null;
  totals?: {
    loans_in_arrears?: number;
    overdue_balance?: string | number;
    portfolio_balance?: string | number;
    par_ratio?: string | number;
    bucket_1_30?: string | number;
    bucket_31_60?: string | number;
    bucket_61_90?: string | number;
    bucket_91_plus?: string | number;
  };
  rows: LoanArrearsAgingReportRow[];
};

export type SavingsAccount = {
  id: UUID;
  account_number?: string;
  account_no?: string;
  client?: Ref<Client>;
  client_name?: string;
  client_member_number?: string;
  client_phone?: string;
  branch_id?: UUID | null;
  branch_name?: string;
  institution_id?: UUID | null;
  institution_name?: string;
  balance: string | number;
  status?: string;
  transaction_count?: number;
  last_transaction_at?: string | null;
  recent_transactions?: SavingsTransaction[];
  created_at?: string;
  updated_at?: string;
};

export type SavingsTransaction = {
  id: UUID;
  account?: UUID | null;
  account_number?: string;
  client_id?: UUID | null;
  client_name?: string;
  client_phone?: string;
  branch_name?: string;
  institution_name?: string;
  type?: string;
  type_label?: string;
  status?: string;
  transaction_date?: string;
  amount: string | number;
  balance_after?: string | number;
  reference?: string;
  performed_by?: UUID | null;
  performed_by_email?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type SelfServiceSavingsStatementEntry = {
  id: UUID;
  date?: string;
  reference?: string;
  transaction_type?: string;
  transaction_type_label?: string;
  amount: string | number;
  balance?: string | number;
  status?: string;
  recorded_by?: UUID | null;
  recorded_by_email?: string | null;
  account?: UUID | null;
  account_number?: string | null;
  notes?: string;
};

export type SelfServiceSavingsSummary = {
  client_id?: UUID | null;
  client_name?: string;
  member_number?: string;
  currency?: string | null;
  total_balance?: string | number;
  account_count?: number;
  accounts?: SavingsAccount[];
  recent_activity?: SelfServiceSavingsStatementEntry[];
};

export type SelfServiceSavingsStatement = {
  client_id?: UUID | null;
  client_name?: string;
  member_number?: string;
  currency?: string | null;
  total_balance?: string | number;
  date_from?: string | null;
  date_to?: string | null;
  transactions: SelfServiceSavingsStatementEntry[];
};

export type RepaymentScheduleRow = {
  id: UUID;
  loan?: UUID | null;
  due_date?: string;
  principal_due?: string | number;
  interest_due?: string | number;
  paid_amount?: string | number;
  is_paid?: boolean;
  total_due?: string | number;
  outstanding_amount?: string | number;
  created_at?: string;
  updated_at?: string;
};

export type LoanApplication = {
  id: UUID;
  client?: Ref<Client>;
  client_name?: string;
  client_member_number?: string;
  branch_name?: string;
  institution_id?: UUID | null;
  institution_name?: string | null;
  product?: UUID | string;
  product_name?: string;
  product_code?: string;
  annual_interest_rate?: string | number;
  interest_method?: string;
  repayment_frequency?: string;
  amount?: string | number;
  requested_amount?: string | number;
  term_months?: number;
  purpose?: string;
  repayment_source?: string;
  created_by?: UUID | null;
  created_by_email?: string | null;
  submitted_by?: UUID | null;
  submitted_by_email?: string | null;
  principal_balance?: string | number;
  interest_balance?: string | number;
  outstanding_balance?: string | number;
  next_due_date?: string | null;
  status: string;
  submitted_at?: string;
  reviewed_at?: string | null;
  appraised_by?: UUID | null;
  appraised_by_email?: string | null;
  appraised_at?: string | null;
  recommended_by?: UUID | null;
  recommended_by_email?: string | null;
  recommended_at?: string | null;
  approved_by?: UUID | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  rejected_by?: UUID | null;
  rejected_by_email?: string | null;
  rejected_at?: string | null;
  rejected_reason?: string;
  withdrawn_by?: UUID | null;
  withdrawn_by_email?: string | null;
  withdrawn_at?: string | null;
  withdrawal_reason?: string;
  disbursed_at?: string | null;
  disbursed_by?: UUID | null;
  disbursed_by_email?: string | null;
  disbursement_method?: string;
  disbursement_reference?: string;
  eligibility_snapshot?: LoanEligibilitySnapshot | null;
  repayment_count?: number;
  schedule_count?: number;
  schedule?: RepaymentScheduleRow[];
  repayments?: LoanRepayment[];
  action_history?: LoanApplicationAction[];
  appraisals?: LoanAppraisal[];
  created_at?: string;
  updated_at?: string;
};

export type LoanRepayment = {
  id: UUID;
  loan?: UUID | null;
  loan_application?: Ref<LoanApplication>;
  loan_client_name?: string;
  loan_client_member_number?: string;
  amount: string | number;
  principal_component?: string | number;
  interest_component?: string | number;
  penalty_component?: string | number;
  remaining_balance_after?: string | number;
  payment_method?: string;
  principal_amount?: string | number;
  interest_amount?: string | number;
  reference?: string;
  received_by?: UUID | null;
  received_by_email?: string | null;
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
};

export type SelfServiceLoanStatementRepayment = {
  id: UUID;
  loan?: UUID | null;
  date?: string;
  amount: string | number;
  principal?: string | number;
  interest?: string | number;
  penalty?: string | number;
  payment_method?: string;
  reference?: string;
  remaining_balance?: string | number;
  received_by?: UUID | null;
  received_by_email?: string | null;
};

export type LoanApplicationAction = {
  id: UUID;
  application?: UUID | null;
  action?: string;
  action_label?: string;
  from_status?: string;
  to_status?: string;
  acted_by?: UUID | null;
  acted_by_email?: string | null;
  comment?: string;
  reference?: string;
  created_at?: string;
  updated_at?: string;
};

export type LoanEligibilityCheck = {
  code: string;
  label?: string;
  passed: boolean;
  message?: string;
  value?: string | number | null;
  threshold?: string | number | null;
};

export type LoanEligibilitySnapshot = {
  eligible: boolean;
  checks: LoanEligibilityCheck[];
  summary?: {
    requested_amount?: string | number;
    estimated_installment?: string | number;
    savings_balance?: string | number;
    share_capital?: string | number;
    outstanding_loans_count?: number;
    overdue_loans_count?: number;
    monthly_income?: string | number | null;
    monthly_expenses?: string | number;
    existing_debt_payments?: string | number;
  };
  errors?: string[];
};

export type LoanAppraisal = {
  id: UUID;
  application?: UUID | null;
  performed_by?: UUID | null;
  performed_by_email?: string | null;
  recommendation?: string;
  recommendation_label?: string | null;
  recommended_amount?: string | number | null;
  recommended_term_months?: number | null;
  monthly_income?: string | number;
  monthly_expenses?: string | number;
  existing_debt_payments?: string | number;
  affordability_amount?: string | number;
  estimated_installment?: string | number;
  risk_score?: number | null;
  savings_balance_snapshot?: string | number;
  share_capital_snapshot?: string | number;
  outstanding_loans_snapshot?: number;
  overdue_loans_snapshot?: number;
  eligibility_passed?: boolean;
  collateral_notes?: string;
  guarantor_notes?: string;
  credit_comments?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Transaction = {
  id: UUID;
  date?: string;
  created_at?: string;
  reference?: string;
  client_name?: string;
  category?: string;
  category_label?: string;
  direction?: string;
  direction_label?: string;
  type?: string;
  type_label?: string;
  source?: string;
  amount: string | number;
  status?: string;
  running_balance?: string | number | null;
  description?: string;
  account_number?: string | null;
  loan_id?: UUID | null;
};

export type Notification = {
  id: UUID;
  title: string;
  message: string;
  category?: string;
  is_read?: boolean;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type AdminDashboardSummary = {
  clients_count?: number;
  active_clients?: number;
  total_clients?: number;
  total_deposits?: string | number;
  total_savings_balance?: string | number;
  loan_portfolio?: string | number;
  active_loan_principal?: string | number;
  repayment_performance?: string | number;
  pending_loans?: number;
  pending_loan_applications?: number;
  approved_loans?: number;
  active_loans?: number;
  overdue_loans?: number;
  portfolio_balance?: string | number;
  repayments_collected?: string | number;
  todays_deposits?: string | number;
  todays_withdrawals?: string | number;
  todays_repayments?: string | number;
  institutions_count?: number;
  branches_count?: number;
  active_branches?: number;
  recent_transactions?: Transaction[];
};

export type StaffDashboardSummary = {
  todays_collections?: string | number;
  pending_loan_applications?: number;
  active_clients?: number;
  portfolio_summary?: string | number;
  clients_count?: number;
  savings_accounts_count?: number;
  total_savings_balance?: string | number;
  recommended_loans?: number;
  approved_loans?: number;
  active_loans?: number;
  overdue_loans?: number;
  portfolio_balance?: string | number;
  repayments_collected?: string | number;
  todays_deposits?: string | number;
  todays_withdrawals?: string | number;
  todays_repayments?: string | number;
  recent_transactions?: Transaction[];
};

export type ClientDashboardSummary = {
  client?: {
    id?: UUID;
    member_number?: string;
    first_name?: string;
    last_name?: string;
    status?: string;
    branch_id?: UUID | null;
    branch__name?: string | null;
  };
  savings_accounts_count?: number;
  total_savings_balance?: string | number;
  active_loan_balance?: string | number;
  active_loans?: LoanApplication[];
  recent_applications?: LoanApplication[];
  repayment_schedule?: RepaymentScheduleRow[];
  recent_transactions?: Transaction[];
  notifications?: Notification[];
  loan_applications?: number;
};

export type SelfServiceDashboardSummary = {
  profile_summary?: ClientProfile | null;
  total_savings_balance?: string | number;
  active_savings_accounts_count?: number;
  active_loans_count?: number;
  pending_loan_applications_count?: number;
  outstanding_loan_balance?: string | number;
  total_repayments_made?: string | number;
  recent_savings_transactions?: SavingsTransaction[];
  recent_loan_applications?: LoanApplication[];
  recent_repayments?: LoanRepayment[];
  unread_notifications_count?: number;
  recent_notifications?: Notification[];
};

export type SelfServiceLoanStatementBalances = {
  principal_balance?: string | number;
  interest_balance?: string | number;
  outstanding_balance?: string | number;
  total_repaid?: string | number;
};

export type SelfServiceLoanStatement = {
  currency?: string | null;
  selected_loan_id?: UUID | null;
  available_loans?: LoanApplication[];
  loan_summary?: LoanApplication | null;
  balances?: SelfServiceLoanStatementBalances | null;
  repayments?: SelfServiceLoanStatementRepayment[];
  repayment_schedule?: RepaymentScheduleRow[];
};

export type ApiProblem = {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, unknown>;
  path?: string | null;
  details?: unknown;
};

export type ShareProduct = {
  id: UUID;
  institution: UUID;
  institution_name?: string | null;
  name: string;
  code: string;
  nominal_price: string | number;
  minimum_shares?: number;
  maximum_shares?: number | null;
  allow_dividends?: boolean;
  status?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

export type ShareAccount = {
  id: UUID;
  client: UUID;
  client_name?: string;
  client_member_number?: string;
  branch_id?: UUID | null;
  branch_name?: string | null;
  institution_id?: UUID | null;
  institution_name?: string | null;
  product: UUID;
  product_name?: string;
  product_code?: string;
  nominal_price?: string | number;
  account_number?: string;
  shares?: number;
  total_value?: string | number;
  status?: string;
  transaction_count?: number;
  last_transaction_at?: string | null;
  recent_transactions?: ShareTransaction[];
  created_at?: string;
  updated_at?: string;
};

export type ShareTransaction = {
  id: UUID;
  account: UUID;
  account_number?: string;
  client_id?: UUID | null;
  client_name?: string;
  client_member_number?: string;
  branch_name?: string | null;
  institution_name?: string | null;
  product?: UUID | null;
  product_name?: string;
  product_code?: string;
  type: string;
  type_label?: string;
  status?: string;
  shares: number;
  amount: string | number;
  balance_after?: number;
  reference: string;
  performed_by?: UUID | null;
  performed_by_email?: string | null;
  recorded_by?: UUID | null;
  recorded_by_email?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};
