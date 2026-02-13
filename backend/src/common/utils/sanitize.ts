import { BadRequestException } from "@nestjs/common";

/**
 * Sanitization Utilities für User-Input
 * Verhindert XSS-Angriffe durch HTML/JavaScript-Injection
 *
 * NOTE: Verwendet einfache String-Manipulation für Backend
 * (DOMPurify benötigt Browser-Umgebung)
 */

/**
 * Sanitisiert HTML-String (entfernt gefährliche Tags/Scripts)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  // Entferne alle HTML-Tags
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Sanitisiert Text-String (entfernt HTML-Tags)
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  // Entferne HTML-Tags
  const withoutHtml = text.replace(/<[^>]*>/g, "");
  // Entferne gefährliche Zeichen
  return withoutHtml.replace(/[<>]/g, "").trim();
}

/**
 * Sanitisiert SMS-Nachricht
 */
export function sanitizeSMS(message: string): string {
  if (!message) return "";
  // Entferne HTML
  let sanitized = sanitizeText(message);
  // Begrenze Länge
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }
  return sanitized;
}

/**
 * Sanitisiert Chat-Nachricht
 */
export function sanitizeChatMessage(message: string): string {
  if (!message) return "";
  // Entferne HTML-Tags, erlaube nur Text
  return sanitizeText(message);
}

/**
 * Validiert und sanitisiert E-Mail-Adresse
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";
  // Basis-Validierung
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestException("Ungültige E-Mail-Adresse");
  }
  return email.toLowerCase().trim();
}

/**
 * Validiert und sanitisiert Telefonnummer
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return "";
  // Entferne alle Zeichen außer Zahlen, +, Leerzeichen, Bindestriche
  return phone.replace(/[^\d+\s-]/g, "").trim();
}
