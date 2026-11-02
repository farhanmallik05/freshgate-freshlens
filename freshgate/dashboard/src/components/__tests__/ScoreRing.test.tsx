import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreRing } from "../ScoreRing";

describe("ScoreRing", () => {
  it("renders with given score and accessibility attributes", () => {
    render(<ScoreRing score={85} band="fresh" />);
    const meter = screen.getByRole("meter");
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute("aria-valuenow", "85");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("clamps score between 0 and 100", () => {
    render(<ScoreRing score={150} band="fresh" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("infers band correctly when not explicitly passed", () => {
    const { rerender } = render(<ScoreRing score={80} />);
    expect(screen.getByRole("meter")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Fresh")
    );

    rerender(<ScoreRing score={60} />);
    expect(screen.getByRole("meter")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Aging")
    );

    rerender(<ScoreRing score={20} />);
    expect(screen.getByRole("meter")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Stale")
    );
  });
});
