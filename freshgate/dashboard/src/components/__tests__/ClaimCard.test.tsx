import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClaimCard } from "../ClaimCard";
import { ClaimResult } from "../../types";

const mockClaimResult: ClaimResult = {
  claim: {
    id: "c1",
    text: "Next.js 14 is the latest version",
    normalized: "Next.js 14 is the latest version",
    category: "version_release",
    span: { start: 0, end: 32 },
    salience: "core",
  },
  verdict: "stale",
  freshness: 24,
  band: "stale",
  correction: "Next.js 15 is current",
  reasoning: "Next.js 15 was released on October 24, 2026.",
  judge_confidence: 0.96,
  supporting_evidence_ids: ["e1"],
  cache: { hit: false, age_s: null },
  status: "ok",
  evidence: [
    {
      id: "e1",
      title: "Next.js 15 Release Announcement",
      url: "https://nextjs.org/blog/next-15",
      domain: "nextjs.org",
      snippet: "Next.js 15 is now GA with React 19.",
      published_date: "2026-10-24T00:00:00Z",
      retrieved_at: "2026-11-01T20:00:00Z",
      authority: "official",
      score: 0.98,
    },
  ],
};

describe("ClaimCard", () => {
  it("renders claim text, verdict, and freshness score", () => {
    render(<ClaimCard claimResult={mockClaimResult} />);

    expect(screen.getAllByText(/Next.js 14 is the latest version/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Outdated")).toBeInTheDocument();
    expect(screen.getByText("24/100")).toBeInTheDocument();
    expect(screen.getByText("version release")).toBeInTheDocument();
  });

  it("renders verified correction diff for stale claim", () => {
    render(<ClaimCard claimResult={mockClaimResult} />);

    expect(screen.getByText("Freshness Correction")).toBeInTheDocument();
    expect(screen.getByText("Next.js 15 is current")).toBeInTheDocument();
  });

  it("toggles evidence drawer on button click", () => {
    render(<ClaimCard claimResult={mockClaimResult} />);

    const inspectBtn = screen.getByRole("button", {
      name: /Inspect Evidence \(1 sources\)/i,
    });
    expect(inspectBtn).toBeInTheDocument();

    // Click to open
    fireEvent.click(inspectBtn);
    expect(screen.getByText("Next.js 15 Release Announcement")).toBeInTheDocument();
    expect(screen.getByText("nextjs.org")).toBeInTheDocument();
    expect(screen.getByText(/GA with React 19/i)).toBeInTheDocument();

    // Click to close
    const hideBtn = screen.getByRole("button", { name: /Hide Evidence/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByText("Next.js 15 Release Announcement")).not.toBeInTheDocument();
  });
});
