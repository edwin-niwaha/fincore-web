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

  institutions: '/api/v1/institutions/',
  institutionDetail: (id: string | number) => `/api/v1/institutions/${id}/`,
  branches: '/api/v1/branches/',
  branchDetail: (id: string | number) => `/api/v1/branches/${id}/`,
  users: '/api/v1/users/',
  userDetail: (id: string | number) => `/api/v1/users/${id}/`,
  clients: '/api/v1/clients/',
  clientDetail: (id: string | number) => `/api/v1/clients/${id}/`,
  clientMe: '/api/v1/clients/me/',
  accountingAccounts: '/api/v1/accounting/accounts/',
  accountingAccountDetail: (id: string | number) =>
    `/api/v1/accounting/accounts/${id}/`,
  accountingJournalEntries: '/api/v1/accounting/journal-entries/',
  accountingJournalEntryDetail: (id: string | number) =>
    `/api/v1/accounting/journal-entries/${id}/`,
  accountingJournalEntryPost: (id: string | number) =>
    `/api/v1/accounting/journal-entries/${id}/post/`,
  reports: {
    trialBalance: '/api/v1/reports/trial-balance/',
  },
  savingsAccounts: '/api/v1/savings/accounts/',
  loanApplications: '/api/v1/loans/applications/',
  loanRepayments: '/api/v1/loans/repayments/',
  transactions: '/api/v1/transactions/',
};
