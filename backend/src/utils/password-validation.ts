import { BadRequestException } from "@nestjs/common";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validiert ein Passwort nach Sicherheitsrichtlinien
 * - Mindestens 8 Zeichen
 * - Mindestens ein Großbuchstabe
 * - Mindestens ein Kleinbuchstabe
 * - Mindestens eine Zahl
 * - Optional: Mindestens ein Sonderzeichen
 */
export function validatePassword(
  password: string,
  requireSpecialChar: boolean = false,
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Passwort muss mindestens 8 Zeichen lang sein");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Großbuchstaben enthalten");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Kleinbuchstaben enthalten");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Passwort muss mindestens eine Zahl enthalten");
  }

  if (
    requireSpecialChar &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Passwort muss mindestens ein Sonderzeichen enthalten");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validiert ein Passwort und wirft eine Exception bei Fehlern
 */
export function validatePasswordOrThrow(
  password: string,
  requireSpecialChar: boolean = false,
): void {
  const result = validatePassword(password, requireSpecialChar);
  if (!result.isValid) {
    throw new BadRequestException(result.errors.join(", "));
  }
}

/**
 * Gibt Passwort-Richtlinien als Text zurück (für UI)
 */
export function getPasswordRequirements(
  requireSpecialChar: boolean = false,
): string[] {
  const requirements = [
    "Mindestens 8 Zeichen",
    "Mindestens ein Großbuchstabe (A-Z)",
    "Mindestens ein Kleinbuchstabe (a-z)",
    "Mindestens eine Zahl (0-9)",
  ];

  if (requireSpecialChar) {
    requirements.push("Mindestens ein Sonderzeichen (!@#$%^&*...)");
  }

  return requirements;
}
