// Safe access to environment variables that works in both Vite and Jest
export function getEnvVar(key: string, defaultValue: any = undefined): any {
  try {
    // Try global import.meta first (Vite/browser)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalMeta = (globalThis as any).import?.meta;
    if (globalMeta?.env) {
      return globalMeta.env[key] ?? defaultValue;
    }

    // Try window import.meta (browser fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowMeta = (window as any).import?.meta;
    if (windowMeta?.env) {
      return windowMeta.env[key] ?? defaultValue;
    }

    // Try global import.meta (Node.js fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeMeta = (global as any).import?.meta;
    if (nodeMeta?.env) {
      return nodeMeta.env[key] ?? defaultValue;
    }

    // Fallback for Jest/test environment - use process.env or globals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jestMeta = (global as any).importMeta;
    if (jestMeta?.env) {
      return jestMeta.env[key] ?? defaultValue;
    }

    // Final fallback
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

export function isProduction(): boolean {
  return getEnvVar('PROD', false) || getEnvVar('NODE_ENV') === 'production';
}

export function isDevelopment(): boolean {
  return getEnvVar('DEV', false) || getEnvVar('NODE_ENV') === 'development';
}
