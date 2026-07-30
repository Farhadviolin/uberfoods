import { StoredUser } from './tokenStorage';

type RecordValue = Record<string, unknown>;

export interface AdminAuthSession {
  accessToken: string;
  refreshToken: string | null;
  user: StoredUser;
}

const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value !== 'undefined' && value !== 'null';

const adminRole = (value: unknown): boolean => value === 'admin' || value === 'ADMIN';

type AdminUserRecord = StoredUser & { userType?: unknown };

export const isAdminUser = (value: unknown): value is AdminUserRecord =>
  isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.email) && nonEmptyString(value.name) &&
  (adminRole(value.role) || adminRole(value.userType));

export const isUsableToken = (value: unknown): value is string => nonEmptyString(value);

export function parseAdminAuthEnvelope(value: unknown, fallbackUser?: StoredUser | null): AdminAuthSession {
  if (!isRecord(value)) {
    throw new Error('Ungültige Auth-Antwort');
  }
  const payload = value.success === true && isRecord(value.data) ? value.data : value;
  if (!isUsableToken(payload.access_token)) throw new Error('Ungültiger Zugriffstoken');
  const candidate = isAdminUser(payload.user) ? payload.user : isAdminUser(payload) ? payload : fallbackUser;
  if (!isAdminUser(candidate)) throw new Error('Ungültige Admin-Identität');
  if (payload.refresh_token !== undefined && !isUsableToken(payload.refresh_token)) throw new Error('Ungültiger Refresh-Token');
  return {
    accessToken: payload.access_token,
    refreshToken: isUsableToken(payload.refresh_token) ? payload.refresh_token : null,
    user: { id: candidate.id, email: candidate.email, name: candidate.name, role: adminRole(candidate.role) ? candidate.role : candidate.userType as string },
  };
}
