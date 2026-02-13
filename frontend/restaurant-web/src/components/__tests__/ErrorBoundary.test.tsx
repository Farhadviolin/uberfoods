import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
// import React from 'react'; // Not needed in modern React

const ProblemChild = () => {
  throw new Error("Test error");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders fallback UI when error occurs", () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
    expect(screen.getByText(/Seite neu laden/i)).toBeInTheDocument();
  });
});
