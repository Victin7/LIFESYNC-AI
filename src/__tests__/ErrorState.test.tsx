import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "@/components/ErrorState";

describe("ErrorState", () => {
  it("renders title and description", () => {
    render(<ErrorState title="Oops" description="Algo quebrou" />);
    expect(screen.getByText("Oops")).toBeTruthy();
    expect(screen.getByText("Algo quebrou")).toBeTruthy();
  });

  it("shows retry button when onRetry is provided", () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeTruthy();
  });

  it("does not show retry button without onRetry", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
  });

  it("calls onRetry when clicked", () => {
    const fn = vi.fn();
    render(<ErrorState onRetry={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(fn).toHaveBeenCalledOnce();
  });
});
