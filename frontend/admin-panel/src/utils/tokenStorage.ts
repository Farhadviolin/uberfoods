import { clearSessionItems, getSessionItem, removeSessionItem, setSessionItem } from './secureStorage';

// Safe env access for Jest/CommonJS without import.meta
function getImportMetaEnv(): any {
  // Check if we're in a Vite environment with import.meta
  if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
    return (globalThis as any).import.meta.env;
  }
  // Fallback for Node.js/CommonJS environments (Jest, etc.)
  return process?.env ?? {};
}

const APP_KEY_PREFIX = getImportMetaEnv().VITE_STORAGE_PREFIX ?? 'uberfoods';
const TOKEN_KEY = `${APP_KEY_PREFIX}_auth_token`;
const REFRESH_KEY = `${APP_KEY_PREFIX}_auth_refresh_token`;
const USER_KEY = `${APP_KEY_PREFIX}_auth_user`;

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function getAccessToken(): string | null {
  return getSessionItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return getSessionItem(REFRESH_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = getSessionItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    removeSessionItem(USER_KEY);
    return null;
  }
}

export function setAuthData(params: { accessToken: string; refreshToken?: string | null; user?: StoredUser | null }) {
  setSessionItem(TOKEN_KEY, params.accessToken);
  if (params.refreshToken !== undefined) {
    setSessionItem(REFRESH_KEY, params.refreshToken ?? null);
  }
  if (params.user !== undefined) {
    if (params.user) {
      setSessionItem(USER_KEY, JSON.stringify(params.user));
    } else {
      removeSessionItem(USER_KEY);
    }
  }
}

export function clearAuthData() {
  clearSessionItems([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
}

