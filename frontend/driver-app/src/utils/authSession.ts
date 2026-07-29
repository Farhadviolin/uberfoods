import { Driver } from '../types';

type RecordValue = Record<string, unknown>;

export interface DriverAuthSession {
  accessToken: string;
  refreshToken: string | null;
  driver: Driver;
  mustChangePassword: boolean;
}

const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
export const isUsableToken = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value !== 'undefined' && value !== 'null';

export const isDriver = (value: unknown): value is Driver =>
  isRecord(value) && typeof value.id === 'string' && value.id.trim() !== '' && typeof value.email === 'string' && value.email.trim() !== '' &&
  typeof value.name === 'string' && value.name.trim() !== '' && typeof value.phone === 'string' && value.phone.trim() !== '' &&
  typeof value.isActive === 'boolean' && (value.role === undefined || value.role === 'driver' || value.role === 'DRIVER');

export function parseDriverAuthEnvelope(value: unknown, fallbackDriver?: Driver | null): DriverAuthSession {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) throw new Error('Ungültige Auth-Antwort');
  const payload = value.data;
  if (!isUsableToken(payload.access_token)) throw new Error('Ungültiger Zugriffstoken');
  const candidate = isDriver(payload) ? payload : fallbackDriver;
  if (!isDriver(candidate)) throw new Error('Ungültige Fahrer-Identität');
  if (payload.refresh_token !== undefined && !isUsableToken(payload.refresh_token)) throw new Error('Ungültiger Refresh-Token');
  return { accessToken: payload.access_token, refreshToken: isUsableToken(payload.refresh_token) ? payload.refresh_token : null, driver: candidate, mustChangePassword: payload.mustChangePassword === true };
}
