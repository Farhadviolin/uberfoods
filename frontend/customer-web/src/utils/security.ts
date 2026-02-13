/**
 * Security Utilities - XSS & SSRF Prevention
 */

/**
 * Validiert und sanitized eine URL für sichere Verwendung
 * Verhindert SSRF-Angriffe durch Validierung der URL
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:', 'mailto:', 'tel:'],
  allowedHosts?: string[]
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  // Blockiere Steuerzeichen ohne Regex (vermeidet no-control-regex)
  const hasControlChars = [...trimmed].some((char) => char < ' ');
  if (!trimmed || hasControlChars) {
    return null;
  }
  // Blockiere protokoll-relative URLs (//example.com)
  if (trimmed.startsWith('//')) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return null;
  }
  // Erlaube In-Page Anker und relative Pfade
  if (trimmed.startsWith('#')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;

  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const parsedUrl = new URL(trimmed, currentOrigin || 'http://localhost');

    // Nur explizit erlaubte Protokolle zulassen
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      console.warn('Unsafe URL protocol:', parsedUrl.protocol);
      return null;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const privateHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

    // In Production keine privaten Hosts oder abweichenden Hosts zulassen
    if (globalThis.import?.meta?.env?.PROD) {
      if (
        privateHosts.includes(hostname) ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        parsedUrl.origin !== currentOrigin
      ) {
        console.warn('Blocked non-allowed URL in production:', parsedUrl.origin);
        return null;
      }
    } else {
      // Im Dev nur Protokoll-check, aber keine javascript:/data:
      if (parsedUrl.protocol === 'javascript:' || parsedUrl.protocol === 'data:') {
        return null;
      }
    }

    // Gleich-Origin oder relative URLs: nur Pfad+Query zurückgeben
    if (parsedUrl.origin === currentOrigin) {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }

    // Optional: Whitelist externer Hosts per ENV oder Parameter
    const allowedHostsEnv = globalThis.import?.meta?.env?.VITE_ALLOWED_EXTERNAL_HOSTS || '';
    const envHosts = allowedHostsEnv.split(',').map((h: string) => h.trim().toLowerCase()).filter(Boolean);
    const hostWhitelist = allowedHosts && allowedHosts.length > 0 ? allowedHosts.map(h => h.toLowerCase()) : envHosts;
    if (hostWhitelist.length > 0 && hostWhitelist.includes(hostname)) {
      return parsedUrl.toString();
    }

    // Standard: blocke fremde Hosts
    return null;
  } catch {
    // Relative URLs sind ok (werden durch window.location.origin aufgelöst)
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    return null;
  }
}

/**
 * Sanitized eine Telefonnummer für tel:-Links
 * Entfernt alle nicht-numerischen Zeichen außer +, -, (, ), Leerzeichen
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  // Erlaube nur Zahlen, +, -, (, ), Leerzeichen
  return phone.replace(/[^\d+\-() ]/g, '');
}

/**
 * Sanitized eine E-Mail-Adresse für mailto:-Links
 * Validiert grundlegende E-Mail-Format
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  // Einfache E-Mail-Validierung
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '';
  }
  // Entferne gefährliche Zeichen
  return email.replace(/[<>"']/g, '');
}

/**
 * Sanitized HTML-Content für dangerouslySetInnerHTML
 * Entfernt script-Tags und gefährliche Attribute
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Erstelle temporäres DOM-Element
  const div = document.createElement('div');
  div.textContent = html; // Text-Content ist sicher
  
  // Erlaube nur bestimmte HTML-Tags (p, br, strong, em, ul, ol, li, a, h1-h6)
  const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Entferne alle nicht-erlaubten Tags
  const walker = document.createTreeWalker(
    tempDiv,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const nodesToRemove: Element[] = [];
  let node: Node | null = walker.currentNode;

  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        nodesToRemove.push(element);
      } else {
        // Entferne gefährliche Attribute
        Array.from(element.attributes).forEach(attr => {
          const attrName = attr.name.toLowerCase();
          const rawValue = attr.value ?? '';
          const normalizedValue = rawValue.trim().toLowerCase();

          // Remove event handler attributes and style/srcset
          if (attrName.startsWith('on') || attrName === 'style' || attrName === 'srcset') {
            element.removeAttribute(attrName);
            return;
          }

          // Sanitize href/src values
          if (attrName === 'href' || attrName === 'src') {
            const safe = sanitizeUrl(rawValue);
            if (!safe) {
              element.removeAttribute(attrName);
            } else {
              element.setAttribute(attrName, safe);
            }
            return;
          }

          // Remove javascript:/data: protocols anywhere else
          if (normalizedValue.startsWith('javascript:') || normalizedValue.startsWith('data:') || normalizedValue.startsWith('vbscript:')) {
            element.removeAttribute(attrName);
          }
        });
      }
    }
    node = walker.nextNode();
  }

  nodesToRemove.forEach(el => el.remove());

  return tempDiv.innerHTML;
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

