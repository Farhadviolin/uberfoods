import { BadRequestException } from "@nestjs/common";
import {
  getPasswordRequirements,
  validatePassword,
  validatePasswordOrThrow,
} from "./password-validation";

describe("validatePassword", () => {
  it("akzeptiert ein starkes Passwort ohne Sonderzeichenpflicht", () => {
    const result = validatePassword("Abcd1234");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("akzeptiert ein starkes Passwort mit Sonderzeichenpflicht", () => {
    const result = validatePassword("Abcd1234!", true);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("liefert Fehler für zu kurzes Passwort", () => {
    const result = validatePassword("Ab1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Passwort muss mindestens 8 Zeichen lang sein",
    );
  });

  it("erfordert Groß-, Kleinbuchstaben und Zahlen", () => {
    expect(validatePassword("abcdef12!").errors).toContain(
      "Passwort muss mindestens einen Großbuchstaben enthalten",
    );
    expect(validatePassword("ABCDEF12!").errors).toContain(
      "Passwort muss mindestens einen Kleinbuchstaben enthalten",
    );
    expect(validatePassword("Abcdefgh!").errors).toContain(
      "Passwort muss mindestens eine Zahl enthalten",
    );
  });

  it("fordert Sonderzeichen wenn verlangt", () => {
    const result = validatePassword("Abcd1234", true);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Passwort muss mindestens ein Sonderzeichen enthalten",
    );
  });
});

describe("validatePasswordOrThrow", () => {
  it("wirft keine Exception bei gültigem Passwort", () => {
    expect(() => validatePasswordOrThrow("Abcd1234!", true)).not.toThrow();
  });

  it("wirft BadRequestException bei ungültigem Passwort", () => {
    expect(() => validatePasswordOrThrow("abc")).toThrow(
      BadRequestException,
    );
  });
});

describe("getPasswordRequirements", () => {
  it("gibt Standard-Anforderungen zurück", () => {
    const requirements = getPasswordRequirements();
    expect(requirements).toHaveLength(4);
    expect(requirements).toContain("Mindestens 8 Zeichen");
    expect(requirements).toContain("Mindestens eine Zahl (0-9)");
  });

  it("fügt Sonderzeichen-Anforderung hinzu wenn benötigt", () => {
    const requirements = getPasswordRequirements(true);
    expect(requirements).toContain(
      "Mindestens ein Sonderzeichen (!@#$%^&*...)",
    );
  });
});
