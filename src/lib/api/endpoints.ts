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

  clients: '/api/v1/clients/',
  clientDetail: (id: string | number) => `/api/v1/clients/${id}/`,
  savingsAccounts: '/api/v1/savings/accounts/',
  loanApplications: '/api/v1/loans/applications/',
  loanRepayments: '/api/v1/loans/repayments/',
  transactions: '/api/v1/transactions/',
};
