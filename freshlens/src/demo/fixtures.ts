import { type VerifyResponse } from "../shared/contract";

export const DEMO_FIXTURES: Record<string, VerifyResponse> = {
  // 1. Next.js Version
  nextjs: {
    id: "vrf_demoNextjs01",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 280,
    overall: {
      score: 25,
      band: "stale",
      claims_total: 2,
      claims_checked: 2,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "Next.js 14 is the latest stable release",
          span: { start: 0, end: 39 },
          normalized: "The latest stable version of Next.js is version 14",
          category: "version_release",
          claimed_as_of: "2024-05-01",
          entities: ["Next.js"],
          query: "Next.js latest stable version release",
          official_domains: ["nextjs.org"],
          prior: 0.88,
        },
        verdict: "stale",
        freshness: 15,
        band: "stale",
        correction: "Next.js 15 is the latest stable version, released in October 2024.",
        evidence: [
          {
            id: "e1",
            url: "https://nextjs.org/blog/next-15",
            domain: "nextjs.org",
            title: "Next.js 15 Release Notes",
            snippet: "Next.js 15 is now generally available with React 19 support and async request APIs.",
            published_date: "2024-10-21T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "official",
            score: 0.98,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.98,
        reasoning: "Next.js 15 has been officially released as the latest stable version, superseding Next.js 14.",
        cache: { hit: true, age_s: 3600 },
        status: "ok",
      },
      {
        claim: {
          id: "c2",
          text: "It includes the App Router architecture",
          span: { start: 42, end: 81 },
          normalized: "Next.js features the App Router architecture",
          category: "evergreen",
          claimed_as_of: null,
          entities: ["Next.js", "App Router"],
          query: "Next.js App Router",
          official_domains: ["nextjs.org"],
          prior: 0.1,
        },
        verdict: "current",
        freshness: 95,
        band: "fresh",
        correction: null,
        evidence: [],
        supporting_evidence_ids: [],
        judge_confidence: 1.0,
        reasoning: "App Router remains a core architectural foundation of Next.js.",
        cache: { hit: true, age_s: 86400 },
        status: "skipped_evergreen",
      },
    ],
    corrected_text:
      "Next.js 15 is the latest stable release (Next.js 15 is generally available as of Oct 2024). It includes the App Router architecture.",
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 180, out: 95 },
      cache_hits: 1,
    },
  },

  // 2. Claude API Pricing
  pricing: {
    id: "vrf_demoPricing02",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 310,
    overall: {
      score: 35,
      band: "stale",
      claims_total: 2,
      claims_checked: 2,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "Claude 3.5 Sonnet costs $3 per million input tokens and $15 per million output tokens",
          span: { start: 0, end: 86 },
          normalized: "Claude 3.5 Sonnet pricing is $3 per MTok input and $15 per MTok output",
          category: "pricing",
          claimed_as_of: "2024-06-01",
          entities: ["Anthropic", "Claude 3.5 Sonnet"],
          query: "Anthropic Claude 3.5 Sonnet API pricing",
          official_domains: ["anthropic.com"],
          prior: 0.85,
        },
        verdict: "current",
        freshness: 88,
        band: "fresh",
        correction: null,
        evidence: [
          {
            id: "e1",
            url: "https://www.anthropic.com/pricing",
            domain: "anthropic.com",
            title: "Anthropic Pricing Model",
            snippet: "Claude 3.5 Sonnet is priced at $3 per million input tokens and $15 per million output tokens.",
            published_date: "2024-10-22T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "official",
            score: 0.99,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.96,
        reasoning: "Confirmed current on Anthropic's pricing page.",
        cache: { hit: true, age_s: 1800 },
        status: "ok",
      },
      {
        claim: {
          id: "c2",
          text: "Prompt caching is not supported on this model",
          span: { start: 88, end: 133 },
          normalized: "Prompt caching is unavailable for Claude 3.5 Sonnet",
          category: "version_release",
          claimed_as_of: "2024-06-01",
          entities: ["Claude 3.5 Sonnet", "Prompt Caching"],
          query: "Claude 3.5 Sonnet prompt caching support",
          official_domains: ["anthropic.com"],
          prior: 0.78,
        },
        verdict: "stale",
        freshness: 10,
        band: "stale",
        correction: "Prompt caching is now fully supported on Claude 3.5 Sonnet with up to 90% cost reduction.",
        evidence: [
          {
            id: "e2",
            url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching",
            domain: "anthropic.com",
            title: "Prompt Caching - Anthropic Docs",
            snippet: "Prompt caching is available for Claude 3.5 Sonnet and Claude 3 Opus.",
            published_date: "2024-08-14T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "official",
            score: 0.97,
          },
        ],
        supporting_evidence_ids: ["e2"],
        judge_confidence: 0.98,
        reasoning: "Anthropic enabled prompt caching for Claude 3.5 Sonnet in August 2024.",
        cache: { hit: true, age_s: 7200 },
        status: "ok",
      },
    ],
    corrected_text:
      "Claude 3.5 Sonnet costs $3 per million input tokens and $15 per million output tokens. Prompt caching is now fully supported on Claude 3.5 Sonnet with up to 90% cost reduction.",
    usage: {
      tavily_credits: 2,
      llm_tokens: { in: 240, out: 110 },
      cache_hits: 1,
    },
  },

  // 3. Twitter / X CEO
  ceo: {
    id: "vrf_demoCeo03",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 295,
    overall: {
      score: 20,
      band: "stale",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "Elon Musk is the CEO of Twitter",
          span: { start: 0, end: 31 },
          normalized: "The CEO of X/Twitter is Elon Musk",
          category: "leadership_role",
          claimed_as_of: "2022-12-01",
          entities: ["Elon Musk", "Twitter", "X"],
          query: "current CEO of X Twitter",
          official_domains: ["x.com"],
          prior: 0.92,
        },
        verdict: "stale",
        freshness: 20,
        band: "stale",
        correction: "Linda Yaccarino is the CEO of X (formerly Twitter); Elon Musk serves as Chief Technology Officer and Executive Chairman.",
        evidence: [
          {
            id: "e1",
            url: "https://www.reuters.com/technology/twitter-names-linda-yaccarino-new-ceo-2023-05-12/",
            domain: "reuters.com",
            title: "Twitter names Linda Yaccarino new CEO",
            snippet: "Elon Musk announced Linda Yaccarino will take over as CEO of Twitter while he transitions to CTO.",
            published_date: "2023-05-12T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "reputable",
            score: 0.95,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.99,
        reasoning: "Linda Yaccarino replaced Elon Musk as CEO in mid-2023.",
        cache: { hit: true, age_s: 86400 },
        status: "ok",
      },
    ],
    corrected_text:
      "Linda Yaccarino is the CEO of X (formerly Twitter); Elon Musk serves as Chief Technology Officer and Executive Chairman.",
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 160, out: 80 },
      cache_hits: 1,
    },
  },

  // 4. React 19 Release
  react: {
    id: "vrf_demoReact04",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 270,
    overall: {
      score: 18,
      band: "stale",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "React 19 is currently only available as an experimental release",
          span: { start: 0, end: 63 },
          normalized: "React 19 is in beta/experimental status and not generally available",
          category: "version_release",
          claimed_as_of: "2024-04-01",
          entities: ["React 19"],
          query: "React 19 release status stable GA",
          official_domains: ["react.dev"],
          prior: 0.89,
        },
        verdict: "stale",
        freshness: 18,
        band: "stale",
        correction: "React 19 is generally available and stable as of December 2024.",
        evidence: [
          {
            id: "e1",
            url: "https://react.dev/blog/2024/12/05/react-19",
            domain: "react.dev",
            title: "React 19 is now stable",
            snippet: "React 19 is now available on npm with Actions, Server Components, and new hooks.",
            published_date: "2024-12-05T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "official",
            score: 0.99,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.99,
        reasoning: "React 19 reached general availability in December 2024.",
        cache: { hit: true, age_s: 43200 },
        status: "ok",
      },
    ],
    corrected_text: "React 19 is generally available and stable as of December 2024.",
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 150, out: 75 },
      cache_hits: 1,
    },
  },

  // 5. Python 3.13 Free-threaded GIL
  python: {
    id: "vrf_demoPython05",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 320,
    overall: {
      score: 30,
      band: "stale",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "Python cannot run multi-threaded code in parallel due to the global interpreter lock",
          span: { start: 0, end: 85 },
          normalized: "Python strictly enforces the Global Interpreter Lock (GIL) across all versions",
          category: "version_release",
          claimed_as_of: "2023-10-01",
          entities: ["Python", "GIL"],
          query: "Python 3.13 free threaded GIL removal status",
          official_domains: ["python.org"],
          prior: 0.82,
        },
        verdict: "stale",
        freshness: 30,
        band: "stale",
        correction: "Python 3.13 introduced experimental free-threaded execution (PEP 703) allowing the GIL to be completely disabled.",
        evidence: [
          {
            id: "e1",
            url: "https://docs.python.org/3/whatsnew/3.13.html",
            domain: "python.org",
            title: "What's New In Python 3.13",
            snippet: "Python 3.13 includes an experimental free-threaded build that disables the global interpreter lock.",
            published_date: "2024-10-07T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "official",
            score: 0.98,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.95,
        reasoning: "Python 3.13 ships an official free-threaded build that disables the GIL.",
        cache: { hit: true, age_s: 3600 },
        status: "ok",
      },
    ],
    corrected_text:
      "Python 3.13 introduced experimental free-threaded execution (PEP 703) allowing the GIL to be completely disabled.",
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 190, out: 90 },
      cache_hits: 1,
    },
  },

  // 6. Section 174 R&D Tax Law
  tax: {
    id: "vrf_demoTax06",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 305,
    overall: {
      score: 40,
      band: "stale",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "US software development expenses can be immediately expensed in year one",
          span: { start: 0, end: 72 },
          normalized: "Software development costs qualify for 100% year-one expensing under Section 174",
          category: "law_policy",
          claimed_as_of: "2021-12-01",
          entities: ["IRS", "Section 174", "R&D Tax"],
          query: "Section 174 R&D software amortization rules",
          official_domains: ["irs.gov"],
          prior: 0.86,
        },
        verdict: "stale",
        freshness: 35,
        band: "stale",
        correction: "Under the TCJA amendments to Section 174, software development expenses must be amortized over 5 years domestically (15 years foreign).",
        evidence: [
          {
            id: "e1",
            url: "https://www.irs.gov/newsroom/treasury-and-irs-issue-guidance-on-research-and-experimental-expenditures",
            domain: "irs.gov",
            title: "IRS Guidance on Section 174",
            snippet: "Research and experimental expenditures, including software development, must be amortized over 5 or 15 years.",
            published_date: "2023-09-08T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "official",
            score: 0.99,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.97,
        reasoning: "Section 174 mandatory 5-year amortization took effect for tax years starting after Dec 31, 2021.",
        cache: { hit: true, age_s: 86400 },
        status: "ok",
      },
    ],
    corrected_text:
      "Under the TCJA amendments to Section 174, software development expenses must be amortized over 5 years domestically (15 years foreign).",
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 210, out: 95 },
      cache_hits: 1,
    },
  },

  // 7. Most Valuable Company Ranking
  marketcap: {
    id: "vrf_demoMarketcap07",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 290,
    overall: {
      score: 30,
      band: "stale",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 1,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "Microsoft is the largest company in the world by market capitalization",
          span: { start: 0, end: 70 },
          normalized: "Microsoft holds the #1 market cap ranking globally",
          category: "record_ranking",
          claimed_as_of: "2024-01-01",
          entities: ["Microsoft", "Apple", "NVIDIA"],
          query: "largest company in the world by market cap ranking",
          official_domains: ["bloomberg.com"],
          prior: 0.88,
        },
        verdict: "stale",
        freshness: 30,
        band: "stale",
        correction: "NVIDIA and Apple have surpassed Microsoft to trade as the world's most valuable companies.",
        evidence: [
          {
            id: "e1",
            url: "https://www.reuters.com/technology/nvidia-surpasses-microsoft-apple-worlds-most-valuable-company-2024-11-05/",
            domain: "reuters.com",
            title: "NVIDIA takes top spot in global market cap",
            snippet: "NVIDIA's market capitalization reached $3.5 trillion, surpassing Apple and Microsoft.",
            published_date: "2024-11-05T00:00:00.000Z",
            retrieved_at: new Date().toISOString(),
            authority: "reputable",
            score: 0.96,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.94,
        reasoning: "NVIDIA frequently overtook Microsoft as the most valuable public company in late 2024.",
        cache: { hit: true, age_s: 3600 },
        status: "ok",
      },
    ],
    corrected_text:
      "NVIDIA and Apple have surpassed Microsoft to trade as the world's most valuable companies.",
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 180, out: 85 },
      cache_hits: 1,
    },
  },

  // 8. Evergreen Control (Mathematical Constant)
  evergreen: {
    id: "vrf_demoEvergreen08",
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 120,
    overall: {
      score: 95,
      band: "fresh",
      claims_total: 1,
      claims_checked: 0,
      stale_count: 0,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: "The speed of light in vacuum is approximately 299,792,458 meters per second",
          span: { start: 0, end: 76 },
          normalized: "The speed of light in vacuum is 299,792,458 m/s",
          category: "evergreen",
          claimed_as_of: null,
          entities: ["speed of light"],
          query: "speed of light in vacuum",
          official_domains: [],
          prior: 0.0,
        },
        verdict: "current",
        freshness: 98,
        band: "fresh",
        correction: null,
        evidence: [],
        supporting_evidence_ids: [],
        judge_confidence: 1.0,
        reasoning: "Fundamental physical constant.",
        cache: { hit: true, age_s: 2592000 },
        status: "skipped_evergreen",
      },
    ],
    corrected_text: null,
    usage: {
      tavily_credits: 0,
      llm_tokens: { in: 100, out: 40 },
      cache_hits: 1,
    },
  },
};

export function getFixtureForText(text: string): VerifyResponse {
  const lower = text.toLowerCase();
  if (lower.includes("next.js") || lower.includes("nextjs")) {
    return DEMO_FIXTURES.nextjs;
  }
  if (lower.includes("claude") || lower.includes("pricing") || lower.includes("sonnet")) {
    return DEMO_FIXTURES.pricing;
  }
  if (lower.includes("ceo") || lower.includes("twitter") || lower.includes("musk") || lower.includes("yaccarino")) {
    return DEMO_FIXTURES.ceo;
  }
  if (lower.includes("react")) {
    return DEMO_FIXTURES.react;
  }
  if (lower.includes("python") || lower.includes("gil")) {
    return DEMO_FIXTURES.python;
  }
  if (lower.includes("tax") || lower.includes("174") || lower.includes("amortiz")) {
    return DEMO_FIXTURES.tax;
  }
  if (lower.includes("market cap") || lower.includes("microsoft") || lower.includes("nvidia")) {
    return DEMO_FIXTURES.marketcap;
  }
  if (lower.includes("speed of light") || lower.includes("constant") || lower.includes("definition")) {
    return DEMO_FIXTURES.evergreen;
  }

  // Generic fallback: check if first sentence looks checkable
  const firstSentence = text.split(/[.?!]/)[0] || text.slice(0, 80);
  return {
    id: `vrf_demoGeneric${Date.now()}`,
    status: "completed",
    created_at: new Date().toISOString(),
    latency_ms: 220,
    overall: {
      score: 85,
      band: "fresh",
      claims_total: 1,
      claims_checked: 1,
      stale_count: 0,
      unverifiable_count: 0,
    },
    claims: [
      {
        claim: {
          id: "c1",
          text: firstSentence,
          span: { start: 0, end: firstSentence.length },
          normalized: firstSentence,
          category: "other_volatile",
          claimed_as_of: null,
          entities: [],
          query: firstSentence,
          official_domains: [],
          prior: 0.4,
        },
        verdict: "current",
        freshness: 85,
        band: "fresh",
        correction: null,
        evidence: [
          {
            id: "e1",
            url: "https://tavily.com",
            domain: "tavily.com",
            title: "Verified Fact Source",
            snippet: "The claim aligns with real-time sources indexable via Tavily.",
            published_date: new Date().toISOString(),
            retrieved_at: new Date().toISOString(),
            authority: "reputable",
            score: 0.9,
          },
        ],
        supporting_evidence_ids: ["e1"],
        judge_confidence: 0.9,
        reasoning: "Verified as consistent with current primary web documentation.",
        cache: { hit: false, age_s: null },
        status: "ok",
      },
    ],
    corrected_text: null,
    usage: {
      tavily_credits: 1,
      llm_tokens: { in: 120, out: 60 },
      cache_hits: 0,
    },
  };
}
