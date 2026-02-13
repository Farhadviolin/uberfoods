/**
 * Security Utilities - XSS & SSRF Prevention
 */

/**
 * Validiert und sanitized eine URL für sichere Verwendung
 * Verhindert SSRF-Angriffe durch Validierung der URL
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ["http:", "https:", "mailto:", "tel:"],
  allowedHosts?: string[],
): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  // Blockiere Steuerzeichen ohne Regex (vermeidet no-control-regex)
  const hasControlChars = Array.from(trimmed).some((char) => char < " ");
  if (!trimmed || hasControlChars) {
    return null;
  }
  // Blockiere protokoll-relative URLs (//example.com)
  if (trimmed.startsWith("//")) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }
  // Erlaube In-Page Anker und relative Pfade
  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const currentOrigin =
      typeof window !== "undefined" ? window.location.origin : "";
    const parsedUrl = new URL(trimmed, currentOrigin || "http://localhost");

    // Nur explizit erlaubte Protokolle zulassen
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      console.warn("Unsafe URL protocol:", parsedUrl.protocol);
      return null;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const privateHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

    // In Production keine privaten Hosts oder abweichenden Hosts zulassen
    if (globalThis.import?.meta?.env?.PROD) {
      if (
        privateHosts.includes(hostname) ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        parsedUrl.origin !== currentOrigin
      ) {
        console.warn(
          "Blocked non-allowed URL in production:",
          parsedUrl.origin,
        );
        return null;
      }
    } else {
      // Im Dev nur Protokoll-check, aber keine javascript:/data:
      if (
        parsedUrl.protocol === "javascript:" ||
        parsedUrl.protocol === "data:"
      ) {
        return null;
      }
    }

    // Gleich-Origin oder relative URLs: nur Pfad+Query zurückgeben
    if (parsedUrl.origin === currentOrigin) {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }

    // Optional: Whitelist externer Hosts per ENV oder Parameter
    const allowedHostsEnv =
      globalThis.import?.meta?.env?.VITE_ALLOWED_EXTERNAL_HOSTS || "";
    const envHosts = allowedHostsEnv
      .split(",")
      .map((h: string) => h.trim().toLowerCase())
      .filter(Boolean);
    const hostWhitelist =
      allowedHosts && allowedHosts.length > 0
        ? allowedHosts.map((h) => h.toLowerCase())
        : envHosts;
    if (hostWhitelist.length > 0 && hostWhitelist.includes(hostname)) {
      return parsedUrl.toString();
    }

    // Standard: blocke fremde Hosts
    return null;
  } catch {
    // Relative URLs sind ok (werden durch window.location.origin aufgelöst)
    if (trimmed.startsWith("/")) {
      return trimmed;
    }
    return null;
  }
}

/**
 * Validiert eine Image-URL
 */
export function validateImageUrl(url: string | null | undefined): string {
  if (!url) {
    return "";
  }

  // Wenn bereits vollständige URL, prüfe sie
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const sanitized = sanitizeUrl(url);
    return sanitized || "";
  }

  // Relative URLs sind ok
  if (url.startsWith("/")) {
    return url;
  }

  return "";
}
