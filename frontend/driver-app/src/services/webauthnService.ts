/**
 * Lightweight WebAuthn/Passkey Vorbereitungs-Service.
 * Aktuell nur Support-Detection und Platzhalter-Flow.
 */
export const webauthnService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      'credentials' in navigator &&
      'PublicKeyCredential' in window;
  },

  // Platzhalter für zukünftige Registration
  async startRegistration(): Promise<void> {
    // Hier könnten später Challenge/Options vom Backend geladen werden.
    return Promise.resolve();
  },

  // Platzhalter für zukünftige Authentifizierung
  async startAuthentication(): Promise<void> {
    return Promise.resolve();
  },
};
