const DEFAULT_API_BASE_URL = 'http://localhost:8000';

function normalizeApiBaseUrl(rawValue: string): string {
  return rawValue
    .trim()
    .replace(/\/$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/api$/, '');
}

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
const normalizedApiBaseUrl =
  normalizeApiBaseUrl(rawApiBaseUrl || DEFAULT_API_BASE_URL) ||
  DEFAULT_API_BASE_URL;

export const env = {
  apiBaseUrl: normalizedApiBaseUrl,
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
};
