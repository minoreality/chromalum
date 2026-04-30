// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <div>Rendered OK</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("catches errors and shows fallback UI", () => {
    // Suppress console.error from React and the ErrorBoundary
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("An error occurred")).toBeTruthy();
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
    spy.mockRestore();
  });

  it("shows details toggle button without requiring i18n context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const detailsBtn = screen.getByText("Show Details");
    expect(detailsBtn).toBeTruthy();
    fireEvent.click(detailsBtn);
    expect(screen.getByText("Hide Details")).toBeTruthy();
    spy.mockRestore();
  });

  it("shows retry button that can be clicked", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.tagName).toBe("BUTTON");
    // Clicking retry should not throw
    expect(() => fireEvent.click(retryBtn)).not.toThrow();
    spy.mockRestore();
  });
});
