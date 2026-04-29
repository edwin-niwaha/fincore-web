export type Role =
  | 'super_admin'
  | 'institution_admin'
  | 'branch_manager'
  | 'loan_officer'
  | 'accountant'
  | 'teller'
  | 'client';

export function normalizeRole(role?: string): Role {
  const value = (role ?? '')
    .toLowerCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  if (value === 'super_admin') return 'super_admin';
  if (value === 'institution_admin' || value === 'admin')
    return 'institution_admin';
  if (value === 'branch_manager' || value === 'manager')
    return 'branch_manager';
  if (value === 'loan_officer') return 'loan_officer';
  if (value === 'accountant') return 'accountant';
  if (value === 'teller' || value === 'cashier' || value === 'teller_cashier')
    return 'teller';

  return 'client';
}
