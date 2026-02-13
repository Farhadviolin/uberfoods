/**
 * Test Helpers for DTOs
 * Provides utilities for testing DTO validation
 */

import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

/**
 * Validates a DTO instance
 * @param dtoClass The DTO class to validate
 * @param data The data to validate
 * @returns Validation errors (empty array if valid)
 */
export async function validateDto<T extends object>(
  dtoClass: new () => T,
  data: any,
): Promise<string[]> {
  const dto = plainToInstance(dtoClass, data);
  const errors = await validate(dto);
  return errors.map((error) =>
    Object.values(error.constraints || {}).join(", "),
  );
}

/**
 * Creates a valid DTO instance for testing
 * @param dtoClass The DTO class
 * @param data The data to create the instance from
 * @returns The DTO instance
 */
export function createDtoInstance<T extends object>(
  dtoClass: new () => T,
  data: any,
): T {
  return plainToInstance(dtoClass, data);
}

/**
 * Asserts that a DTO is valid
 * @param dtoClass The DTO class
 * @param data The data to validate
 * @throws Error if validation fails
 */
export async function assertValidDto<T extends object>(
  dtoClass: new () => T,
  data: any,
): Promise<void> {
  const errors = await validateDto(dtoClass, data);
  if (errors.length > 0) {
    throw new Error(`DTO validation failed: ${errors.join("; ")}`);
  }
}

/**
 * Asserts that a DTO is invalid
 * @param dtoClass The DTO class
 * @param data The data to validate
 * @param expectedErrors Optional array of expected error messages
 * @throws Error if validation passes
 */
export async function assertInvalidDto<T extends object>(
  dtoClass: new () => T,
  data: any,
  expectedErrors?: string[],
): Promise<void> {
  const errors = await validateDto(dtoClass, data);
  if (errors.length === 0) {
    throw new Error("Expected DTO validation to fail, but it passed");
  }
  if (expectedErrors) {
    const errorMessages = errors.join(" ").toLowerCase();
    for (const expectedError of expectedErrors) {
      if (!errorMessages.includes(expectedError.toLowerCase())) {
        throw new Error(
          `Expected error "${expectedError}" not found in: ${errors.join("; ")}`,
        );
      }
    }
  }
}
