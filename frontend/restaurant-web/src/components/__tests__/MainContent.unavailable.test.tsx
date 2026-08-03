import { render, screen } from "@testing-library/react";
import { MainContent } from "../MainContent/MainContent";

describe("MainContent unavailable auxiliary features", () => {
  it.each([
    ["reviews", "Bewertungen"],
    ["promotions", "Aktionen"],
    ["support", "Support"],
    ["suppliers", "Lieferanten"],
    ["finance", "Finanzen"],
    ["accounting", "Buchhaltung (E/A)"],
    ["monitoring", "Monitoring"],
    ["inventory", "Inventar"],
    ["staff", "Mitarbeiter"],
    ["staff-scheduling", "Schichtplanung"],
    ["marketing", "Marketing"],
    ["tables", "Tische"],
  ])("shows a controlled unavailable state for %s", (activeTab, feature) => {
    render(<MainContent activeTab={activeTab} />);

    expect(
      screen.getByRole("status", { name: `${feature} nicht verfügbar` }),
    ).toBeInTheDocument();
    expect(screen.getByText("Noch nicht verfügbar")).toBeInTheDocument();
  });
});
