import type { Role } from '@/types/roles';

export type NavItem = { href: string; label: string; roles?: Role[] };

const staffRoles: Role[] = ['super_admin', 'institution_admin', 'branch_manager', 'loan_officer', 'accountant', 'teller'];

export const navItems: NavItem[] = [
  { href: '/admin', label: 'Admin', roles: ['super_admin', 'institution_admin'] },
  { href: '/staff', label: 'Staff', roles: staffRoles },
  { href: '/client', label: 'Client', roles: ['client'] },
  { href: '/clients', label: 'Clients', roles: staffRoles },
  { href: '/savings', label: 'Savings', roles: staffRoles },
  { href: '/loans/applications', label: 'Loan applications', roles: staffRoles },
  { href: '/loans/repayments', label: 'Repayments', roles: staffRoles },
  { href: '/transactions', label: 'Transactions', roles: staffRoles.concat(['client']) },
  { href: '/reports', label: 'Reports', roles: ['super_admin', 'institution_admin', 'branch_manager', 'accountant'] },
  { href: '/users', label: 'Users', roles: ['super_admin', 'institution_admin'] },
  { href: '/audit-logs', label: 'Audit logs', roles: ['super_admin', 'institution_admin'] },
  { href: '/settings', label: 'Settings', roles: ['super_admin', 'institution_admin'] },
];
