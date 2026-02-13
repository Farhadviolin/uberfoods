/**
 * Sichere Storage-Helfer: nutzt bevorzugt sessionStorage.
 * Fällt bei fehlender Verfügbarkeit (SSR, Safari ITP, Privacy-Modus) auf In-Memory zurück.
 * Kein localStorage, um Risiko durch persistente Tokens zu reduzieren.
 */

const memoryStore = new Map<string, string>();

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const testKey = '__secure_storage_test__';
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const session = getSessionStorage();

export function setSessionItem(key: string, value: string | null | undefined) {
  if (value === null || value === undefined) {
    removeSessionItem(key);
    return;
  }
  if (session) {
    session.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

export function getSessionItem(key: string): string | null {
  if (session) {
    return session.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

export function removeSessionItem(key: string) {
  if (session) {
    session.removeItem(key);
  }
  memoryStore.delete(key);
}

export function clearSessionItems(keys: string[]) {
  keys.forEach(removeSessionItem);
}

