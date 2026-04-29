export const accountTypeOptions = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
] as const;

export const accountStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
] as const;

export const journalStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
] as const;

export const journalSourceOptions = [
  { value: 'all', label: 'All sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'savings_deposit', label: 'Savings deposit' },
  { value: 'savings_withdrawal', label: 'Savings withdrawal' },
  { value: 'loan_disbursement', label: 'Loan disbursement' },
  { value: 'loan_repayment', label: 'Loan repayment' },
] as const;

export function sourceLabel(source?: string | null) {
  if (!source) return 'Unknown';
  return source
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function normalBalanceLabel(value?: string | null) {
  if (!value) return '-';
  return value === 'debit' ? 'Debit' : 'Credit';
}

export function balanceBadgeClassName(status?: string | null) {
  if (status === 'posted') return 'bg-emerald-100 text-emerald-800';
  if (status === 'draft') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}
