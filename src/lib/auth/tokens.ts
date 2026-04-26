const ACCESS_TOKEN_KEY = 'fincore.accessToken';
const REFRESH_TOKEN_KEY = 'fincore.refreshToken';

let memoryAccessToken: string | null = null;

function canUseStorage() {
  return typeof window !== 'undefined';
}

export const tokenStore = {
  getAccess() {
    if (memoryAccessToken) return memoryAccessToken;
    const token = canUseStorage() ? sessionStorage.getItem(ACCESS_TOKEN_KEY) : null;
    memoryAccessToken = token;
    return token;
  },
  getRefresh() {
    return canUseStorage() ? sessionStorage.getItem(REFRESH_TOKEN_KEY) : null;
  },
  set(access: string, refresh?: string) {
    memoryAccessToken = access;
    if (!canUseStorage()) return;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  setAccess(access: string) {
    memoryAccessToken = access;
    if (canUseStorage()) sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
  },
  clear() {
    memoryAccessToken = null;
    if (!canUseStorage()) return;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
