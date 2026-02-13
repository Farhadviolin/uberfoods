import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatOrderStatus,
} from "../formatters";

describe("formatCurrency", () => {
  it("formatiert Beträge als Euro-Währung", () => {
    const result = formatCurrency(10);
    expect(result).toContain("10,00");
    expect(result).toContain("€");
  });
});

describe("formatDate", () => {
  it("formatiert Datum als deutsches Format", () => {
    const result = formatDate("2024-03-15");
    expect(result).toBe("15.03.2024");
  });
});

describe("formatRelativeTime", () => {
  it("formatiert relative Zeit", () => {
    const result = formatRelativeTime(new Date());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatOrderStatus", () => {
  it("übersetzt bekannte Status", () => {
    expect(formatOrderStatus("PENDING")).toBe("Ausstehend");
    expect(formatOrderStatus("CONFIRMED")).toBe("Bestätigt");
  });
});