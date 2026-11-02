import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HighlightRenderer } from "../HighlightRenderer";
import { ClaimResult } from "../../types";

describe("HighlightRenderer", () => {
  it("renders plain text when no claims have spans", () => {
    const onSelect = vi.fn();
    render(
      <HighlightRenderer
        text="A simple text without spans."
        claims={[]}
        selectedClaimId={null}
        onSelectClaim={onSelect}
      />
    );

    expect(screen.getByText("A simple text without spans.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders inline mark with role='button' and tabIndex for valid span", () => {
    const onSelect = vi.fn();
    const claims: ClaimResult[] = [
      {
        claim: {
          id: "c1",
          text: "Next.js 14",
          normalized: "Next.js 14",
          category: "version_release",
          span: { start: 0, end: 10 },
        },
        verdict: "stale",
        freshness: 20,
        band: "stale",
        correction: "Next.js 15",
        reasoning: "Outdated",
        judge_confidence: 0.9,
        supporting_evidence_ids: [],
        cache: { hit: false, age_s: null },
        status: "ok",
        evidence: [],
      },
    ];

    render(
      <HighlightRenderer
        text="Next.js 14 is old."
        claims={claims}
        selectedClaimId={null}
        onSelectClaim={onSelect}
      />
    );

    const mark = screen.getByRole("button", { name: /Claim highlight/i });
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent("Next.js 14");
    expect(mark).toHaveAttribute("tabindex", "0");
    expect(mark).toHaveClass("fl-highlight-stale");

    // Click trigger
    fireEvent.click(mark);
    expect(onSelect).toHaveBeenCalledWith("c1");

    // Keyboard trigger (Enter and Space)
    fireEvent.keyDown(mark, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(mark, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("correctly handles unicode and emoji character spans without offset corruption", () => {
    const onSelect = vi.fn();
    const text = "🚀 Next.js 14 is active today.";
    // "🚀 " is 3 UTF-16 code units (surrogate pair + space: 2 + 1 = 3)
    // "Next.js 14" is 10 chars: [3, 13]
    const claims: ClaimResult[] = [
      {
        claim: {
          id: "c1",
          text: "Next.js 14",
          normalized: "Next.js 14",
          category: "version_release",
          span: { start: 3, end: 13 },
        },
        verdict: "stale",
        freshness: 25,
        band: "stale",
        correction: "Next.js 15",
        reasoning: "Outdated",
        judge_confidence: 0.95,
        supporting_evidence_ids: [],
        cache: { hit: false, age_s: null },
        status: "ok",
        evidence: [],
      },
    ];

    render(
      <HighlightRenderer
        text={text}
        claims={claims}
        selectedClaimId={null}
        onSelectClaim={onSelect}
      />
    );

    const mark = screen.getByRole("button");
    expect(mark).toHaveTextContent("Next.js 14");
    expect(screen.getByText(/🚀/)).toBeInTheDocument();
    expect(screen.getByText(/is active today\./)).toBeInTheDocument();
  });

  it("safely partitions overlapping spans without duplicating or dropping text", () => {
    const onSelect = vi.fn();
    const text = "The Quick Brown Fox Jumps";
    // Claim 1: "Quick Brown" [4, 15] (aging)
    // Claim 2: "Brown Fox" [10, 19] (stale) - overlaps "Brown " [10, 15]
    const claims: ClaimResult[] = [
      {
        claim: {
          id: "c1",
          text: "Quick Brown",
          normalized: "quick brown",
          category: "event_status",
          span: { start: 4, end: 15 },
        },
        verdict: "current",
        freshness: 60,
        band: "aging",
        correction: null,
        reasoning: "Aging",
        judge_confidence: 0.8,
        supporting_evidence_ids: [],
        cache: { hit: false, age_s: null },
        status: "ok",
        evidence: [],
      },
      {
        claim: {
          id: "c2",
          text: "Brown Fox",
          normalized: "brown fox",
          category: "version_release",
          span: { start: 10, end: 19 },
        },
        verdict: "stale",
        freshness: 20,
        band: "stale",
        correction: "Red Fox",
        reasoning: "Outdated",
        judge_confidence: 0.9,
        supporting_evidence_ids: [],
        cache: { hit: false, age_s: null },
        status: "ok",
        evidence: [],
      },
    ];

    const { container } = render(
      <HighlightRenderer
        text={text}
        claims={claims}
        selectedClaimId={null}
        onSelectClaim={onSelect}
      />
    );

    // Entire text must be preserved in order
    expect(container.textContent).toBe("The Quick Brown Fox Jumps");

    // Overlapping marks must exist
    const marks = screen.getAllByRole("button");
    expect(marks.length).toBeGreaterThanOrEqual(2);

    // The overlapping region [10, 15] ("Brown ") prioritizes higher severity (stale)
    const staleMarks = marks.filter((m) => m.classList.contains("fl-highlight-stale"));
    expect(staleMarks.length).toBeGreaterThan(0);
  });
});
