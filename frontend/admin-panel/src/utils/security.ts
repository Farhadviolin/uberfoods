/**
 * Security Utilities - XSS & SSRF Prevention
 */
import { logger } from './logger';

/**
 * Validiert und sanitized eine URL für sichere Verwendung
 * Verhindert SSRF-Angriffe durch Validierung der URL
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:'],
  allowedHosts?: string[]
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';
  const hostWhitelist = allowedHosts && allowedHosts.length > 0 ? allowedHosts : currentHost ? [currentHost] : [];

  try {
    // Parse URL um Protocol und Host zu prüfen
    const parsedUrl = new URL(url, currentOrigin || 'http://localhost');
    
    // Prüfe Protocol
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      logger.warn(`Unsafe URL protocol: ${parsedUrl.protocol}`);
      return null;
    }

    // Prüfe Host (standardmäßig nur Same-Origin)
    if (hostWhitelist.length > 0 && !hostWhitelist.includes(parsedUrl.host)) {
      logger.warn(`Blocked cross-origin URL: ${parsedUrl.host}`);
      return null;
    }

    // Prüfe auf localhost/private IPs (nur in Production)
    if (import.meta.env.PROD) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const privateHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (privateHosts.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        logger.warn(`Private/localhost URL blocked in production: ${hostname}`);
        return null;
      }
    }

    // Gib nur Pfad + Query zurück, um window.open/createObjectURL sicher zu halten
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    // Relative URLs sind ok
    if (url.startsWith('/')) {
      return url;
    }
    return null;
  }
}

/**
 * Sanitized einen Dateinamen für Downloads
 * Entfernt gefährliche Zeichen und Path-Traversal-Versuche
 */
export function sanitizeFilename(filename: string, defaultName: string = 'file'): string {
  if (!filename || typeof filename !== 'string') {
    return defaultName;
  }
  
  // Entferne Path-Traversal-Versuche
  let sanitized = filename.replace(/\.\./g, '').replace(/\//g, '-').replace(/\\/g, '-');
  
  // Entferne gefährliche Zeichen
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');
  
  // Begrenze Länge
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  return sanitized || defaultName;
}

/**
 * Escaped einen String für sichere Verwendung in HTML-Attributen
 * Verhindert XSS durch Escaping von HTML-Sonderzeichen
 */
export function escapeHtmlAttribute(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return value.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Validiert eine Image-URL
 */
export function validateImageUrl(url: string | null | undefined): string {
  if (!url) {
    return '';
  }
  
  // Wenn bereits vollständige URL, prüfe sie
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const sanitized = sanitizeUrl(url);
    return sanitized || '';
  }
  
  // Relative URLs sind ok
  if (url.startsWith('/')) {
    return url;
  }
  
  return '';
}

