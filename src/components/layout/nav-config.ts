import type { Role } from '@/types/roles';

export type NavItem = {
  href: string;
  label: string;
  roles?: Role[];
  showInNavigation?: boolean;
};

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
    href: '/client',
    label: 'Client',
    roles: ['client'],
    showInNavigation: false,
  },
  {
    href: '/self-service',
    label: 'Dashboard',
    roles: ['client'],
  },
  {
    href: '/self-service/profile',
    label: 'My profile',
    roles: ['client'],
  },
  {
    href: '/self-service/savings',
    label: 'My savings',
    roles: ['client'],
  },
  {
    href: '/self-service/loan-applications',
    label: 'Loan applications',
    roles: ['client'],
  },
  {
    href: '/self-service/loans',
    label: 'My loans',
    roles: ['client'],
  },
  {
    href: '/self-service/repayments',
    label: 'Repayments',
    roles: ['client'],
  },
  {
    href: '/self-service/transactions',
    label: 'Transactions',
    roles: ['client'],
  },
  {
    href: '/self-service/notifications',
    label: 'Notifications',
    roles: ['client'],
  },
  {
    href: '/admin',
    label: 'Admin',
    roles: ['super_admin', 'institution_admin'],
  },
  { href: '/staff', label: 'Staff', roles: staffRoles },
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
  {
    href: '/loans/repayments',
    label: 'Repayments',
    roles: staffRoles,
  },
  {
    href: '/notifications',
    label: 'Notifications',
    roles: staffRoles,
  },
  {
    href: '/transactions',
    label: 'Transactions',
    roles: staffRoles,
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
    label: 'Reports summary',
    roles: accountingRoles,
  },
  {
    href: '/reports/trial-balance',
    label: 'Trial balance',
    roles: accountingRoles,
  },
  {
    href: '/reports/general-ledger',
    label: 'General ledger',
    roles: accountingRoles,
  },
  {
    href: '/reports/cashflow-statement',
    label: 'Cashflow statement',
    roles: accountingRoles,
  },
  {
    href: '/reports/balance-sheet',
    label: 'Balance sheet',
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
