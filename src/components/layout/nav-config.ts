import type { Role } from '@/types/roles';

export type NavItem = {
  href: string;
  label: string;
  roles?: Role[];
  showInNavigation?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
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

export const navGroups: NavGroup[] = [
  {
    label: 'Self Service',
    items: [
      { href: '/client', label: 'Client', roles: ['client'], showInNavigation: false },
      { href: '/self-service', label: 'Dashboard', roles: ['client'] },
      { href: '/self-service/profile', label: 'My profile', roles: ['client'] },
      { href: '/self-service/savings', label: 'My savings', roles: ['client'] },
      { href: '/self-service/loan-applications', label: 'Loan applications', roles: ['client'] },
      { href: '/self-service/loans', label: 'My loans', roles: ['client'] },
      { href: '/self-service/repayments', label: 'Repayments', roles: ['client'] },
      { href: '/self-service/transactions', label: 'Transactions', roles: ['client'] },
      { href: '/self-service/notifications', label: 'Notifications', roles: ['client'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/admin', label: 'Admin', roles: ['super_admin', 'institution_admin'] },
      { href: '/staff', label: 'Staff', roles: staffRoles },
      { href: '/clients', label: 'Clients', roles: staffRoles },
      { href: '/institutions', label: 'Institutions', roles: ['super_admin', 'institution_admin'] },
      { href: '/branches', label: 'Branches', roles: ['super_admin', 'institution_admin'] },
      { href: '/users', label: 'Users', roles: ['super_admin', 'institution_admin', 'branch_manager'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/savings', label: 'Savings', roles: staffRoles },
      { href: '/shares', label: 'Shares', roles: staffRoles },
      { href: '/notifications', label: 'Notifications', roles: staffRoles },
      { href: '/transactions', label: 'Transactions', roles: staffRoles },
    ],
  },
  {
    label: 'Loans',
    collapsible: true,
    items: [
      { href: '/loans/products', label: 'Loan products', roles: staffRoles },
      { href: '/loans/applications', label: 'Applications', roles: staffRoles },
      { href: '/loans/repayments', label: 'Repayments', roles: staffRoles },
    ],
  },
  {
    label: 'Accounting',
    collapsible: true,
    items: [
      { href: '/accounting/chart-of-accounts', label: 'Chart of accounts', roles: accountingRoles },
      { href: '/accounting/journal-entries', label: 'Journal entries', roles: accountingRoles },
    ],
  },
  {
    label: 'Reports',
    collapsible: true,
    items: [
      { href: '/reports', label: 'Reports summary', roles: accountingRoles },
      { href: '/reports/loan-portfolio', label: 'Loan portfolio', roles: staffRoles },
      { href: '/reports/loan-disbursements', label: 'Loan disbursements', roles: staffRoles },
      { href: '/reports/loan-collections', label: 'Loan collections', roles: staffRoles },
      { href: '/reports/loan-arrears-aging', label: 'Loan arrears aging', roles: staffRoles },
      { href: '/reports/trial-balance', label: 'Trial balance', roles: accountingRoles },
      { href: '/reports/general-ledger', label: 'General ledger', roles: accountingRoles },
      { href: '/reports/cashflow-statement', label: 'Cashflow statement', roles: accountingRoles },
      { href: '/reports/balance-sheet', label: 'Balance sheet', roles: accountingRoles },
      { href: '/reports/profit-and-loss', label: 'Profit and loss', roles: accountingRoles },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/audit-logs', label: 'Audit logs', roles: ['super_admin', 'institution_admin'] },
      { href: '/settings', label: 'Settings', roles: ['super_admin', 'institution_admin'] },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);
