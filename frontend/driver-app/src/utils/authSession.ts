import { Driver } from '../types';

type RecordValue = Record<string, unknown>;

export interface DriverAuthSession {
  accessToken: string;
  refreshToken: string | null;
  driver: Driver;
  mustChangePassword: boolean;
}

export const DRIVER_AUTH_STORAGE_KEYS = [
  'driver_token',
  'driver_refresh_token',
  'driver_data',
  'driver_user',
] as const;

export const DRIVER_AUTH_RESET_EVENT = 'uberfoods:driver-auth-reset';

const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
export const isUsableToken = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && value !== 'undefined' && value !== 'null';
const driverRole = (value: unknown): boolean => value === 'driver' || value === 'DRIVER';

export const isDriver = (value: unknown): value is Driver =>
  isRecord(value) && typeof value.id === 'string' && value.id.trim() !== '' && typeof value.email === 'string' && value.email.trim() !== '' &&
  typeof value.name === 'string' && value.name.trim() !== '' && typeof value.phone === 'string' && value.phone.trim() !== '' &&
  value.isActive === true && (driverRole(value.role) || driverRole(value.userType));

const sameDriverIdentity = (left: Driver, right: Driver): boolean =>
  left.id === right.id &&
  left.email === right.email &&
  left.name === right.name &&
  left.phone === right.phone &&
  left.isActive === right.isActive &&
  left.role === right.role &&
  left.currentStatus === right.currentStatus;

export function clearDriverAuthArtifacts(): void {
  DRIVER_AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function resetDriverAuthSession(): void {
  clearDriverAuthArtifacts();
  window.dispatchEvent(new Event(DRIVER_AUTH_RESET_EVENT));
}

export interface PersistedDriverSession {
  accessToken: string;
  refreshToken: string | null;
  driver: Driver;
}

export function readPersistedDriverSession(): PersistedDriverSession | null {
  const accessToken = localStorage.getItem('driver_token');
  const refreshToken = localStorage.getItem('driver_refresh_token');
  const rawProfiles = ['driver_data', 'driver_user']
    .map((key) => localStorage.getItem(key))
    .filter((value): value is string => value !== null);

  if (!isUsableToken(accessToken) || rawProfiles.length === 0) return null;
  if (refreshToken !== null && !isUsableToken(refreshToken)) return null;

  try {
    const profiles = rawProfiles.map((rawProfile) => JSON.parse(rawProfile) as unknown);
    if (!profiles.every(isDriver)) return null;
    const driver = profiles[0];
    if (!profiles.every((profile) => sameDriverIdentity(driver, profile))) return null;
    return {
      accessToken,
      refreshToken: isUsableToken(refreshToken) ? refreshToken : null,
      driver,
    };
  } catch {
    return null;
  }
}

export function parseDriverAuthEnvelope(value: unknown, fallbackDriver?: Driver | null): DriverAuthSession {
  if (!isRecord(value)) throw new Error('Ungültige Auth-Antwort');
  const payload = value.success === true && isRecord(value.data) ? value.data : value;
  if (!isUsableToken(payload.access_token)) throw new Error('Ungültiger Zugriffstoken');
  const rawCandidate = isRecord(payload.user) ? payload.user : payload;
  const candidateWithRole =
    !('role' in rawCandidate) && !('userType' in rawCandidate)
      ? { ...rawCandidate, role: 'driver' }
      : rawCandidate;
  const candidate = isDriver(candidateWithRole)
    ? candidateWithRole
    : fallbackDriver;
  if (!isDriver(candidate)) throw new Error('Ungültige Fahrer-Identität');
  if (payload.refresh_token !== undefined && !isUsableToken(payload.refresh_token)) throw new Error('Ungültiger Refresh-Token');
  return { accessToken: payload.access_token, refreshToken: isUsableToken(payload.refresh_token) ? payload.refresh_token : null, driver: candidate, mustChangePassword: payload.mustChangePassword === true };
}
