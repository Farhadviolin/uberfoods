import {
  safeBoolean,
  safeDate,
  safeISOString,
  safeNumber,
  safeString,
} from "./type-guards";

describe("safeNumber", () => {
  it("gibt gültige Zahlen unverändert zurück", () => {
    expect(safeNumber(42)).toBe(42);
  });

  it("parst numerische Strings und nutzt Fallback bei Ungültigen", () => {
    expect(safeNumber(" 13 ")).toBe(13);
    expect(safeNumber("abc", 5)).toBe(5);
    expect(safeNumber("", 7)).toBe(7);
  });

  it("wandelt Booleans in 1/0 um", () => {
    expect(safeNumber(true)).toBe(1);
    expect(safeNumber(false)).toBe(0);
  });
});

describe("safeString", () => {
  it("liefert Strings oder konvertiert primitive Werte", () => {
    expect(safeString("hello")).toBe("hello");
    expect(safeString(123)).toBe("123");
  });

  it("gibt Default für null/undefined zurück", () => {
    expect(safeString(null, "fallback")).toBe("fallback");
    expect(safeString(undefined, "fallback")).toBe("fallback");
  });
});

describe("safeDate und safeISOString", () => {
  it("erzeugt Date aus Zahl/String und null bei Ungültigen", () => {
    const ts = Date.now();
    expect(safeDate(ts)?.getTime()).toBe(ts);
    expect(safeDate("2020-01-01")?.toISOString()).toContain("2020-01-01");
    expect(safeDate("not-a-date")).toBeNull();
  });

  it("liefert ISO-String oder aktuellen Zeitpunkt", () => {
    const iso = safeISOString("2020-01-01T00:00:00.000Z");
    expect(iso).toBe("2020-01-01T00:00:00.000Z");

    const nowIso = safeISOString("invalid");
    expect(new Date(nowIso).getTime()).not.toBeNaN();
  });
});

describe("safeBoolean", () => {
  it("interpretiert Zahlen und Strings korrekt", () => {
    expect(safeBoolean(true)).toBe(true);
    expect(safeBoolean(0)).toBe(false);
    expect(safeBoolean(1)).toBe(true);
    expect(safeBoolean("yes")).toBe(true);
    expect(safeBoolean("TRUE")).toBe(true);
  });

  it("nutzt Default-Wert für unbekannte Inputs", () => {
    expect(safeBoolean(null, true)).toBe(true);
  });
});
