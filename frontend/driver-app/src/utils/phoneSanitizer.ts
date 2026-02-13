/**
 * Utility für sichere Telefonnummer-Sanitization
 * Verhindert XSS und Injection-Angriffe
 */

export function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Entferne alle Zeichen außer Ziffern und Plus
  const cleaned = phone.trim().replace(/[^\d+]/g, '');

  // Stelle sicher, dass Plus nur am Anfang steht
  const hasPlus = cleaned.startsWith('+');
  const digits = hasPlus ? cleaned.slice(1) : cleaned;
  const normalized = hasPlus ? `+${digits.replace(/\+/g, '')}` : digits.replace(/\+/g, '');

  // Begrenze auf 15 Zeichen (ITU-T E.164 Standard)
  return normalized.slice(0, 15);
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || phone.length < 5) {
    return false;
  }

  const sanitized = sanitizePhoneNumber(phone);
  // Mindestens 5 Ziffern (inkl. Ländercode)
  return sanitized.length >= 5 && /^\+?\d+$/.test(sanitized);
}

export function formatPhoneForDisplay(phone: string): string {
  const sanitized = sanitizePhoneNumber(phone);
  if (!sanitized) return '';

  // Einfaches Formatting für Anzeige (optional)
  if (sanitized.startsWith('+49')) {
    // Deutsche Nummer: +49 123 4567890
    const rest = sanitized.slice(3);
    if (rest.length >= 10) {
      return `+49 ${rest.slice(0, 3)} ${rest.slice(3)}`;
    }
  }

  return sanitized;
}
