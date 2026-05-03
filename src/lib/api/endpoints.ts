export const endpoints = {
  auth: {
    register: '/api/v1/auth/register/',
    login: '/api/v1/auth/login/',
    refresh: '/api/v1/auth/refresh/',
    verifyToken: '/api/v1/auth/verify/',
    logout: '/api/v1/auth/logout/',
    profile: '/api/v1/auth/me/',
    google: '/api/v1/auth/social/google/',
    forgotPassword: '/api/v1/auth/forgot-password/',
    resetPassword: '/api/v1/auth/reset-password/',
    changePassword: '/api/v1/auth/change-password/',
    sendEmailVerification: '/api/v1/auth/send-email-verification/',
    verifyEmail: '/api/v1/auth/verify-email/',
  },

  dashboards: {
    admin: '/api/v1/dashboards/admin/',
    staff: '/api/v1/dashboards/staff/',
    client: '/api/v1/dashboards/client/',
  },

  selfService: {
    profile: '/api/v1/self-service/profile/',
    dashboard: '/api/v1/self-service/dashboard/',
    savings: '/api/v1/self-service/savings/',
    savingsSummary: '/api/v1/self-service/savings/summary/',
    savingsStatement: '/api/v1/self-service/savings/statement/',
    savingsTransactions: '/api/v1/self-service/savings/transactions/',
    loanProducts: '/api/v1/self-service/loan-products/',
    loanApplications: '/api/v1/self-service/loan-applications/',
    loanApplicationDetail: (id: string | number) =>
      `/api/v1/self-service/loan-applications/${id}/`,
    loans: '/api/v1/self-service/loans/',
    loanStatement: '/api/v1/self-service/loans/statement/',
    loanDetail: (id: string | number) => `/api/v1/self-service/loans/${id}/`,
    repayments: '/api/v1/self-service/repayments/',
    transactions: '/api/v1/self-service/transactions/',
    notifications: '/api/v1/self-service/notifications/',
    notificationMarkRead: (id: string | number) =>
      `/api/v1/self-service/notifications/${id}/mark-read/`,
    notificationsMarkAllRead: '/api/v1/self-service/notifications/mark-all-read/',
  },

  institutions: '/api/v1/institutions/',
  institutionStatementProfile: '/api/v1/institutions/statement-profile/',
  institutionDetail: (id: string | number) => `/api/v1/institutions/${id}/`,
  branches: '/api/v1/branches/',
  branchDetail: (id: string | number) => `/api/v1/branches/${id}/`,
  users: '/api/v1/users/',
  userDetail: (id: string | number) => `/api/v1/users/${id}/`,
  clients: '/api/v1/clients/',
  clientDetail: (id: string | number) => `/api/v1/clients/${id}/`,
  clientMe: '/api/v1/clients/me/',
  clientLinkableUsers: '/api/v1/clients/linkable-users/',
  loanProducts: '/api/v1/loans/products/',
  loanProductDetail: (id: string | number) => `/api/v1/loans/products/${id}/`,
  accountingAccounts: '/api/v1/accounting/accounts/',
  accountingAccountDetail: (id: string | number) =>
    `/api/v1/accounting/accounts/${id}/`,
  accountingJournalEntries: '/api/v1/accounting/journal-entries/',
  accountingJournalEntryDetail: (id: string | number) =>
    `/api/v1/accounting/journal-entries/${id}/`,
  accountingJournalEntryPost: (id: string | number) =>
    `/api/v1/accounting/journal-entries/${id}/post/`,
  reports: {
    savingsBalances: '/api/v1/reports/savings-balances/',
    loanPortfolio: '/api/v1/reports/loan-portfolio/',
    trialBalance: '/api/v1/reports/trial-balance/',
    balanceSheet: '/api/v1/reports/balance-sheet/',
  },
  savingsAccounts: '/api/v1/savings/accounts/',
  savingsAccountDetail: (id: string | number) => `/api/v1/savings/accounts/${id}/`,
  savingsAccountDeposit: (id: string | number) =>
    `/api/v1/savings/accounts/${id}/deposit/`,
  savingsAccountWithdraw: (id: string | number) =>
    `/api/v1/savings/accounts/${id}/withdraw/`,
  savingsAccountTransactions: (id: string | number) =>
    `/api/v1/savings/accounts/${id}/transactions/`,
  savingsTransactions: '/api/v1/savings/transactions/',
  loanApplications: '/api/v1/loans/applications/',
  loanApplicationDetail: (id: string | number) => `/api/v1/loans/applications/${id}/`,
  loanApplicationSubmit: (id: string | number) =>
    `/api/v1/loans/applications/${id}/submit/`,
  loanApplicationStartReview: (id: string | number) =>
    `/api/v1/loans/applications/${id}/start-review/`,
  loanApplicationRecommend: (id: string | number) =>
    `/api/v1/loans/applications/${id}/recommend/`,
  loanApplicationApprove: (id: string | number) =>
    `/api/v1/loans/applications/${id}/approve/`,
  loanApplicationReject: (id: string | number) =>
    `/api/v1/loans/applications/${id}/reject/`,
  loanApplicationDisburse: (id: string | number) =>
    `/api/v1/loans/applications/${id}/disburse/`,
  loanApplicationRepay: (id: string | number) =>
    `/api/v1/loans/applications/${id}/repay/`,
  loanApplicationSchedule: (id: string | number) =>
    `/api/v1/loans/applications/${id}/schedule/`,
  loanApplicationRepayments: (id: string | number) =>
    `/api/v1/loans/applications/${id}/repayments/`,
  loanRepayments: '/api/v1/loans/repayments/',
  notifications: '/api/v1/notifications/',
  notificationDetail: (id: string | number) => `/api/v1/notifications/${id}/`,
  notificationMarkRead: (id: string | number) =>
    `/api/v1/notifications/${id}/mark_read/`,
  notificationsMarkAllRead: '/api/v1/notifications/mark-all-read/',
  transactions: '/api/v1/transactions/',
  shareProducts: '/api/v1/shares/products/',
  shareProductDetail: (id: string | number) => `/api/v1/shares/products/${id}/`,
  shareAccounts: '/api/v1/shares/accounts/',
  shareAccountDetail: (id: string | number) => `/api/v1/shares/accounts/${id}/`,
  shareAccountPurchase: (id: string | number) => `/api/v1/shares/accounts/${id}/purchase/`,
  shareAccountRedeem: (id: string | number) => `/api/v1/shares/accounts/${id}/redeem/`,
  shareAccountTransactions: (id: string | number) => `/api/v1/shares/accounts/${id}/transactions/`,
  shareTransactions: '/api/v1/shares/transactions/',
};
