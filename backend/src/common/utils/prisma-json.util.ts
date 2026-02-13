import { Prisma } from "@prisma/client";

/**
 * Normalizes unknown values to Prisma InputJsonValue for safe JSON field assignment.
 * Handles arrays, objects, dates, primitives, and undefined values.
 */
export function normalizePrismaJson(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizePrismaJson) as Prisma.InputJsonArray;
  }

  if (typeof value === "object") {
    const normalizedObj: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const normalizedValue = normalizePrismaJson(val);
      if (normalizedValue !== undefined) {
        normalizedObj[key] = normalizedValue;
      }
    }
    return normalizedObj as Prisma.InputJsonObject;
  }

  // For any other type (including unknown), convert to string representation
  return String(value);
}

/**
 * Safely normalizes a value for Prisma JSON fields, returning null for undefined.
 * Use this for optional JSON fields where undefined should not be stored.
 */
export function normalizePrismaJsonOptional(
  value: unknown,
): Prisma.InputJsonValue | null {
  if (value === undefined) {
    return null;
  }
  return normalizePrismaJson(value);
}
