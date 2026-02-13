// Zentrale Env-Helfer, vermeiden direkten Zugriff auf import.meta in Tests/Node.
// Zur Laufzeit setzt main.tsx `globalThis.importMetaEnv = import.meta.env` (Vite).

type EnvRecord = Record<string, any> | undefined;

const resolveEnv = (): EnvRecord => {
  if ((globalThis as any).importMetaEnv) {
    return (globalThis as any).importMetaEnv as EnvRecord;
  }
  if (typeof process !== 'undefined') {
    return process.env as EnvRecord;
  }
  return undefined;
};

const env = resolveEnv() || {};

export const getEnvVar = <T = string>(key: string, fallback?: T): T | undefined => {
  const value = (env as any)[key];
  if (value === undefined) return fallback;
  return value as T;
};

export const getEnvBool = (key: string, fallback = false): boolean => {
  const value = getEnvVar<any>(key);
  if (value === true || value === false) return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
};

export const isDev = (): boolean => getEnvBool('DEV') || getEnvVar('MODE') === 'development';
export const isProd = (): boolean => getEnvBool('PROD') || getEnvVar('MODE') === 'production';


