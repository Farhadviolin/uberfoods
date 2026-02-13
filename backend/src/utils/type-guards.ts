/**
 * Type-safe utility functions for handling unknown types
 * Prevents TypeScript arithmetic and type errors
 */

export const safeNumber = (v: unknown, defaultValue = 0): number => {
  if (typeof v === "number" && isFinite(v) && !isNaN(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return defaultValue;
    const n = Number(s);
    return isFinite(n) && !isNaN(n) ? n : defaultValue;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return defaultValue;
};

export const safeString = (v: unknown, defaultValue = ""): string => {
  if (typeof v === "string") return v;
  if (v === undefined || v === null) return defaultValue;
  return String(v);
};

export const safeDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const safeISOString = (v: unknown): string => {
  const date = safeDate(v);
  return date ? date.toISOString() : new Date().toISOString();
};

export const safeBoolean = (v: unknown, defaultValue = false): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string")
    return ["true", "1", "yes"].includes(v.toLowerCase());
  return defaultValue;
};
