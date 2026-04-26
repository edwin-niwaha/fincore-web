const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, '').replace(/\/api$/, '');

export const env = {
  apiBaseUrl: normalizedApiBaseUrl,
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
};
