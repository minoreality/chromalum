// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
import { LazyChunkLoadError } from "../../utils/lazy-chunk";

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

  it("retries ordinary render errors without reloading the page", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.tagName).toBe("BUTTON");
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Rendered OK")).toBeNull();
    fireEvent.click(retryBtn);
    expect(screen.getByText("Rendered OK")).toBeTruthy();
    expect(screen.queryByText("An error occurred")).toBeNull();
    spy.mockRestore();
  });

  it("offers page reload for failed chunks and preserves the original error in details", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function FailedChunk(): never {
      throw new LazyChunkLoadError(new TypeError("Network unavailable"));
    }
    render(
      <ErrorBoundary>
        <FailedChunk />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Reload page" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show Details" }));
    expect(screen.getByText(/Caused by:\s+TypeError: Network unavailable/)).toBeTruthy();
    spy.mockRestore();
  });
});
