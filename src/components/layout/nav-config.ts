import type { Role } from '@/types/roles';

export type NavItem = { href: string; label: string; roles?: Role[] };

const staffRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'loan_officer',
  'accountant',
  'teller',
];

const accountingRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
];

export const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Admin',
    roles: ['super_admin', 'institution_admin'],
  },
  { href: '/staff', label: 'Staff', roles: staffRoles },
  { href: '/client', label: 'Client', roles: ['client'] },
  { href: '/clients', label: 'Clients', roles: staffRoles },
  {
    href: '/institutions',
    label: 'Institutions',
    roles: ['super_admin', 'institution_admin'],
  },
  {
    href: '/branches',
    label: 'Branches',
    roles: ['super_admin', 'institution_admin'],
  },
  { href: '/savings', label: 'Savings', roles: staffRoles },
  {
    href: '/loans/applications',
    label: 'Loan applications',
    roles: staffRoles,
  },
  { href: '/loans/repayments', label: 'Repayments', roles: staffRoles },
  {
    href: '/transactions',
    label: 'Transactions',
    roles: staffRoles.concat(['client']),
  },
  {
    href: '/accounting/chart-of-accounts',
    label: 'Chart of accounts',
    roles: accountingRoles,
  },
  {
    href: '/accounting/journal-entries',
    label: 'Journal entries',
    roles: accountingRoles,
  },
  {
    href: '/reports',
    label: 'Trial balance',
    roles: accountingRoles,
  },
  {
    href: '/users',
    label: 'Users',
    roles: ['super_admin', 'institution_admin', 'branch_manager'],
  },
  {
    href: '/audit-logs',
    label: 'Audit logs',
    roles: ['super_admin', 'institution_admin'],
  },
  {
    href: '/settings',
    label: 'Settings',
    roles: ['super_admin', 'institution_admin'],
  },
];
