import type { Role } from '@/types/roles';

export type NavItem = {
  href: string;
  label: string;
  roles?: Role[];
  showInNavigation?: boolean;
  description?: string;
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

const shareViewerRoles: Role[] = [...staffRoles];

const shareTransactionRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
  'teller',
];

const shareApprovalRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
  'accountant',
];

const shareSettingsRoles: Role[] = [
  'super_admin',
  'institution_admin',
  'branch_manager',
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
      { href: '/self-service', label: 'Dashboard', roles: ['client'], description: 'Your member workspace overview.' },
      { href: '/self-service/profile', label: 'My profile', roles: ['client'], description: 'Personal details and contact profile.' },
      { href: '/self-service/savings', label: 'My savings', roles: ['client'], description: 'Savings balances and statements.' },
      { href: '/self-service/loan-applications', label: 'Loan applications', roles: ['client'], description: 'New and pending loan requests.' },
      { href: '/self-service/loans', label: 'My loans', roles: ['client'], description: 'Approved and disbursed loan accounts.' },
      { href: '/self-service/repayments', label: 'Repayments', roles: ['client'], description: 'Loan repayments and schedules.' },
      { href: '/self-service/transactions', label: 'Transactions', roles: ['client'], description: 'Your posted savings and loan activity.' },
      { href: '/self-service/notifications', label: 'Notifications', roles: ['client'], description: 'Unread alerts and updates.' },
    ],
  },
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', roles: staffRoles, description: 'Operations overview and quick stats.' },
      { href: '/admin', label: 'Admin dashboard', roles: ['super_admin', 'institution_admin'], showInNavigation: false },
      { href: '/staff', label: 'Staff dashboard', roles: staffRoles, showInNavigation: false },
      { href: '/notifications', label: 'Notifications', roles: staffRoles, description: 'System and workflow alerts.' },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/clients', label: 'Member register', roles: staffRoles, description: 'Member records, KYC, and lifecycle.' },
    ],
  },
  {
    label: 'Savings',
    items: [
      { href: '/savings', label: 'Savings', roles: staffRoles, description: 'Savings accounts, balances, and policy.' },
      { href: '/transactions', label: 'Transactions', roles: staffRoles, description: 'Posted cash, savings, and member transactions.' },
    ],
  },
  {
    label: 'Shares',
    collapsible: true,
    items: [
      { href: '/shares/dashboard', label: 'Dashboard', roles: shareViewerRoles, description: 'Share capital and approvals summary.' },
      { href: '/shares/products', label: 'Share products', roles: shareViewerRoles, description: 'Configure share classes and pricing.' },
      { href: '/shares/accounts', label: 'Share accounts', roles: shareViewerRoles, description: 'Member share holdings and balances.' },
      { href: '/shares/transactions', label: 'Share transactions', roles: shareViewerRoles, description: 'Share purchases, redemptions, and dividends.' },
      { href: '/shares/purchase', label: 'Purchase shares', roles: shareTransactionRoles, description: 'Post new share purchases.' },
      { href: '/shares/additional', label: 'Additional shares', roles: shareViewerRoles, description: 'Requests and approvals for extra shares.' },
      { href: '/shares/transfers', label: 'Share transfers', roles: shareViewerRoles, description: 'Initiate and review share transfers.' },
      { href: '/shares/redemption', label: 'Share redemption', roles: shareTransactionRoles, description: 'Redeem member shares.' },
      { href: '/shares/dividends', label: 'Dividends', roles: shareViewerRoles, description: 'Declare and review dividend activity.' },
      { href: '/shares/certificates', label: 'Share certificates', roles: shareViewerRoles, description: 'Generate and track certificates.' },
      { href: '/shares/reports', label: 'Reports', roles: shareViewerRoles, description: 'Share statements and summaries.' },
      { href: '/shares/approvals', label: 'Approvals', roles: shareApprovalRoles, description: 'Pending share workflow approvals.' },
      { href: '/shares/settings', label: 'Settings', roles: shareSettingsRoles, description: 'Shares thresholds and configuration.' },
    ],
  },
  {
    label: 'Loans',
    collapsible: true,
    items: [
      { href: '/loans/products', label: 'Loan products', roles: staffRoles, description: 'Configure loan terms and eligibility.' },
      { href: '/loans/applications', label: 'Applications', roles: staffRoles, description: 'Review the full loan pipeline.' },
      { href: '/loans/repayments', label: 'Repayments', roles: staffRoles, description: 'Record and review loan collections.' },
    ],
  },
  {
    label: 'Accounting',
    collapsible: true,
    items: [
      { href: '/accounting/chart-of-accounts', label: 'Chart of accounts', roles: accountingRoles, description: 'Ledger account structure and status.' },
      { href: '/accounting/journal-entries', label: 'Journal entries', roles: accountingRoles, description: 'Manual and generated journal activity.' },
    ],
  },
  {
    label: 'Reports',
    collapsible: true,
    items: [
      { href: '/reports', label: 'Reports summary', roles: accountingRoles, description: 'Available finance and loan reports.' },
      { href: '/reports/loan-portfolio', label: 'Loan portfolio', roles: staffRoles, description: 'Portfolio quality and balance summary.' },
      { href: '/reports/loan-disbursements', label: 'Loan disbursements', roles: staffRoles, description: 'Disbursement totals and history.' },
      { href: '/reports/loan-collections', label: 'Loan collections', roles: staffRoles, description: 'Repayment collections and components.' },
      { href: '/reports/loan-arrears-aging', label: 'Loan arrears aging', roles: staffRoles, description: 'Days-past-due and arrears buckets.' },
      { href: '/reports/trial-balance', label: 'Trial balance', roles: accountingRoles, description: 'Balanced account totals.' },
      { href: '/reports/general-ledger', label: 'General ledger', roles: accountingRoles, description: 'Ledger movement and balances.' },
      { href: '/reports/cashflow-statement', label: 'Cashflow statement', roles: accountingRoles, description: 'Cash movements by activity.' },
      { href: '/reports/balance-sheet', label: 'Balance sheet', roles: accountingRoles, description: 'Assets, liabilities, and equity.' },
      { href: '/reports/profit-and-loss', label: 'Profit and loss', roles: accountingRoles, description: 'Income and expense performance.' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/institutions', label: 'Institutions', roles: ['super_admin', 'institution_admin'], description: 'Institution profile and status.' },
      { href: '/branches', label: 'Branches', roles: ['super_admin', 'institution_admin'], description: 'Branch directory and scope.' },
      { href: '/users', label: 'Users', roles: ['super_admin', 'institution_admin', 'branch_manager'], description: 'User accounts and role assignments.' },
      { href: '/audit-logs', label: 'Audit logs', roles: ['super_admin', 'institution_admin'], description: 'System audit and activity history.' },
      { href: '/settings', label: 'Settings', roles: ['super_admin', 'institution_admin'], description: 'Institution branding, policies, and security.' },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

export type NavMatch = {
  group: NavGroup;
  item: NavItem;
};

export function isNavItemVisibleToRole(item: NavItem, role?: Role | null) {
  if (item.showInNavigation === false) return false;
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

export function visibleNavGroupsForRole(role?: Role | null) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemVisibleToRole(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

export function visibleNavItemsForRole(role?: Role | null) {
  return visibleNavGroupsForRole(role).flatMap((group) => group.items);
}

export function findNavMatch(
  pathname: string,
  role?: Role | null,
): NavMatch | null {
  const matches = visibleNavGroupsForRole(role)
    .flatMap((group) =>
      group.items
        .filter(
          (item) =>
            pathname === item.href || pathname.startsWith(`${item.href}/`),
        )
        .map((item) => ({ group, item })),
    )
    .sort((left, right) => right.item.href.length - left.item.href.length);

  return matches[0] ?? null;
}
