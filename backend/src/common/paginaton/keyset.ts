import { BadRequestException } from "@nestjs/common";

export interface CursorPaginationDto {
  cursor?: string;
  limit?: number;
  status?: string;
  restaurantId?: string;
  driverId?: string;
  customerId?: string;
}

export interface CursorResponseDto<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function clampLimit(limit?: number): number {
  const defaultLimit = 25;
  const maxLimit = 100;

  if (!limit || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(limit, maxLimit);
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    // Expected format: base64("<ISO_CREATED_AT>:<ID>")
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [createdAtStr, id] = decoded.split(":");

    if (!createdAtStr || !id) {
      throw new Error("Invalid cursor format");
    }

    const createdAt = new Date(createdAtStr);
    if (isNaN(createdAt.getTime())) {
      throw new Error("Invalid date in cursor");
    }

    return { createdAt, id };
  } catch (error) {
    throw new BadRequestException("INVALID_CURSOR");
  }
}

export function encodeCursor(createdAt: Date, id: string): string {
  // Format: base64("<ISO_CREATED_AT>:<ID>")
  const cursorData = `${createdAt.toISOString()}:${id}`;
  return Buffer.from(cursorData, "utf-8").toString("base64");
}
