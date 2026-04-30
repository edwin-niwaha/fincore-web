import type { Role } from '@/types/roles';

export const organizationStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
] as const;

export const activityFilterOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export const userRoleOptions: Array<{ value: Role; label: string }> = [
  { value: 'super_admin', label: 'Super admin' },
  { value: 'institution_admin', label: 'Institution admin' },
  { value: 'branch_manager', label: 'Branch manager' },
  { value: 'loan_officer', label: 'Loan officer' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'teller', label: 'Teller' },
  { value: 'client', label: 'Client' },
];

export const formSelectClassName =
  'form-select w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm outline-none transition focus:border-[#127D61] focus:ring-4 focus:ring-emerald-100';

export function statusLabel(status?: string) {
  if (!status) return 'Unknown';
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function statusPillClassName(status?: string) {
  if (status === 'active') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (['approved', 'paid', 'posted', 'completed', 'open'].includes(status ?? '')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (status === 'inactive') {
    return 'bg-slate-200 text-slate-700';
  }
  if (['draft', 'new', 'processing'].includes(status ?? '')) {
    return 'bg-sky-100 text-sky-800';
  }
  if (status === 'pending') {
    return 'bg-amber-100 text-amber-800';
  }
  if (
    ['submitted', 'review', 'under_review', 'partially_paid'].includes(
      status ?? '',
    )
  ) {
    return 'bg-amber-100 text-amber-800';
  }
  if (['recommended', 'disbursed'].includes(status ?? '')) {
    return 'bg-teal-100 text-teal-800';
  }
  if (status === 'closed') {
    return 'bg-rose-100 text-rose-800';
  }
  if (['rejected', 'failed', 'reversed', 'overdue', 'cancelled'].includes(status ?? '')) {
    return 'bg-rose-100 text-rose-800';
  }
  return 'bg-slate-100 text-slate-700';
}

export function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('en-UG', {
      dateStyle: 'medium',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function roleLabel(role?: string) {
  if (!role) return 'Unknown role';
  return role
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function roleOptionsForActor(actorRole?: Role | null) {
  if (actorRole === 'super_admin') return userRoleOptions;
  if (actorRole === 'institution_admin') {
    return userRoleOptions.filter((option) => option.value !== 'super_admin');
  }
  if (actorRole === 'branch_manager') {
    return userRoleOptions.filter((option) =>
      ['loan_officer', 'accountant', 'teller', 'client'].includes(option.value),
    );
  }
  return [];
}

export function roleRequiresBranch(role?: string) {
  return ['branch_manager', 'loan_officer', 'accountant', 'teller'].includes(
    role ?? '',
  );
}

export function roleRequiresInstitution(role?: string) {
  return Boolean(role) && role !== 'super_admin';
}
