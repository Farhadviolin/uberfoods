import { StoredUser } from './tokenStorage';

type RecordValue = Record<string, unknown>;

export interface AdminAuthSession {
  accessToken: string;
  refreshToken: string | null;
  user: StoredUser;
}

const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value !== 'undefined' && value !== 'null';

export const isAdminUser = (value: unknown): value is StoredUser =>
  isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.email) && nonEmptyString(value.name) &&
  typeof value.role === 'string' && value.role.toLowerCase() === 'admin';

export const isUsableToken = (value: unknown): value is string => nonEmptyString(value);

export function parseAdminAuthEnvelope(value: unknown, fallbackUser?: StoredUser | null): AdminAuthSession {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    throw new Error('Ungültige Auth-Antwort');
  }
  const payload = value.data;
  if (!isUsableToken(payload.access_token)) throw new Error('Ungültiger Zugriffstoken');
  const candidate = isAdminUser(payload) ? payload : fallbackUser;
  if (!isAdminUser(candidate)) throw new Error('Ungültige Admin-Identität');
  if (payload.refresh_token !== undefined && !isUsableToken(payload.refresh_token)) throw new Error('Ungültiger Refresh-Token');
  return { accessToken: payload.access_token, refreshToken: isUsableToken(payload.refresh_token) ? payload.refresh_token : null, user: candidate };
}
