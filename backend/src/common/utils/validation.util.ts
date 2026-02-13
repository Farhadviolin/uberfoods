/**
 * Validation Utilities
 * Common validation patterns and helpers
 */

import { BadRequestException } from "@nestjs/common";

export class ValidationUtil {
  /**
   * Validates email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates phone number (international format)
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  /**
   * Validates URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates date range
   */
  static validateDateRange(
    startDate: Date | string,
    endDate: Date | string,
  ): void {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException("Invalid date format");
    }

    if (start > end) {
      throw new BadRequestException("Start date must be before end date");
    }
  }

  /**
   * Validates coordinates (latitude, longitude)
   */
  static validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90) {
      throw new BadRequestException("Latitude must be between -90 and 90");
    }
    if (lng < -180 || lng > 180) {
      throw new BadRequestException("Longitude must be between -180 and 180");
    }
  }

  /**
   * Validates price (must be positive)
   */
  static validatePrice(price: number): void {
    if (price < 0) {
      throw new BadRequestException("Price must be positive");
    }
  }

  /**
   * Validates percentage (0-100)
   */
  static validatePercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new BadRequestException("Percentage must be between 0 and 100");
    }
  }

  /**
   * Validates array length
   */
  static validateArrayLength<T>(array: T[], min: number, max?: number): void {
    if (array.length < min) {
      throw new BadRequestException(`Array must have at least ${min} items`);
    }
    if (max !== undefined && array.length > max) {
      throw new BadRequestException(`Array must have at most ${max} items`);
    }
  }

  /**
   * Validates string length
   */
  static validateStringLength(str: string, min: number, max?: number): void {
    if (str.length < min) {
      throw new BadRequestException(
        `String must be at least ${min} characters`,
      );
    }
    if (max !== undefined && str.length > max) {
      throw new BadRequestException(`String must be at most ${max} characters`);
    }
  }

  /**
   * Sanitizes string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, "");
  }

  /**
   * Validates UUID format
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
