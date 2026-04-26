export const endpoints = {
  auth: {
    login: '/api/v1/auth/login/',
    refresh: '/api/v1/auth/refresh/',
    logout: '/api/v1/auth/logout/',
    profile: '/api/v1/auth/profile/',
  },

  dashboards: {
    admin: '/api/v1/dashboards/admin/',
    staff: '/api/v1/dashboards/staff/',
    client: '/api/v1/dashboards/client/',
  },

  clients: '/api/v1/clients/',
  clientDetail: (id: string | number) => `/api/v1/clients/${id}/`,
};