import { getConfig } from "./config.js";
import { RawSearchResult } from "./evidence.js";
import { Claim } from "./contract/schemas.js";
import { loadVolatilityRules } from "./rules.js";

export interface TavilySearchOptions {
  depth?: "fast" | "thorough";
  now?: string;
}

export interface TavilySearchOutput {
  results: RawSearchResult[];
  creditsUsed: number;
  status: "ok" | "budget_exhausted" | "failed";
}

// Rolling hourly credit tracking
let hourlyCreditsUsed = 0;
let windowStartTime = Date.now();

function checkAndRecordCredits(requested: number, budgetPerHour: number): boolean {
  const now = Date.now();
  if (now - windowStartTime >= 3600000) {
    hourlyCreditsUsed = 0;
    windowStartTime = now;
  }
  if (hourlyCreditsUsed + requested > budgetPerHour) {
    return false;
  }
  hourlyCreditsUsed += requested;
  return true;
}

export function resetHourlyCredits(): void {
  hourlyCreditsUsed = 0;
  windowStartTime = Date.now();
}

export function getHourlyCreditsUsed(): number {
  return hourlyCreditsUsed;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function searchTavily(
  claim: Claim,
  query: string,
  options?: TavilySearchOptions
): Promise<TavilySearchOutput> {
  const config = getConfig();

  // 1. Check Hourly Budget
  const estimatedCredits = options?.depth === "thorough" ? 2 : 1;
  const budgetOk = checkAndRecordCredits(estimatedCredits, config.TAVILY_CREDIT_BUDGET_PER_HOUR);
  if (!budgetOk) {
    return {
      results: [],
      creditsUsed: 0,
      status: "budget_exhausted",
    };
  }

  // 2. Mock mode handling
  if (config.ENGINE_MOCK) {
    return {
      results: generateMockResults(claim),
      creditsUsed: estimatedCredits,
      status: "ok",
    };
  }

  const rules = loadVolatilityRules();
  const catRule = rules.categories[claim.category];

  const searchDepth = options?.depth === "thorough" ? "advanced" : "basic";
  const topic = catRule?.tavily_topic || "general";
  const timeRange = catRule?.time_range || undefined;
  let maxAgeHours = catRule?.max_age_hours || undefined;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const payload: Record<string, any> = {
      api_key: config.TAVILY_API_KEY,
      query,
      search_depth: searchDepth,
      topic,
      include_published_date: true,
      include_usage: true,
      max_results: 5,
    };

    if (timeRange) payload.time_range = timeRange;
    if (maxAgeHours) payload.max_age_hours = maxAgeHours;
    if (claim.official_domains && claim.official_domains.length > 0) {
      payload.include_domains = claim.official_domains;
      payload.include_domains_mode = "prefer";
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle 434 (Flex tier capacity limitation with max_age_hours)
      if (response.status === 434 && maxAgeHours !== undefined) {
        maxAgeHours = undefined;
        continue; // retry once without max_age_hours
      }

      // Handle 432 / 433 (plan or credit limits)
      if (response.status === 432 || response.status === 433) {
        return {
          results: [],
          creditsUsed: 0,
          status: "budget_exhausted",
        };
      }

      // Handle 429 rate limit
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;
        await sleep(Math.min(retryAfterSec * 1000, 3000));
        continue;
      }

      if (!response.ok) {
        if (response.status >= 500 && attempts < maxAttempts) {
          await sleep(500 * attempts);
          continue;
        }
        return {
          results: [],
          creditsUsed: 0,
          status: "failed",
        };
      }

      const data = (await response.json()) as any;
      const credits = data.usage?.credits ?? estimatedCredits;
      const rawList: RawSearchResult[] = (data.results || []).map((r: any) => ({
        url: r.url,
        title: r.title,
        content: r.content,
        published_date: r.published_date,
        score: r.score,
      }));

      return {
        results: rawList,
        creditsUsed: credits,
        status: "ok",
      };
    } catch {
      clearTimeout(timer);
      if (attempts < maxAttempts) {
        await sleep(500 * attempts);
      }
    }
  }

  return {
    results: [],
    creditsUsed: 0,
    status: "failed",
  };
}

function generateMockResults(claim: Claim): RawSearchResult[] {
  const norm = claim.normalized.toLowerCase();

  if (claim.category === "version_release" && (norm.includes("next.js") || norm.includes("nextjs"))) {
    return [
      {
        url: "https://nextjs.org/blog/next-15",
        title: "Next.js 15 General Availability Release",
        content: "Next.js 15 is now generally available with React 19 support, Async Request APIs, and faster bundling. Version 14 was superseded.",
        published_date: "2024-10-21T12:00:00Z",
        score: 0.98,
      },
      {
        url: "https://github.com/vercel/next.js/releases",
        title: "Release v15.1.0 - vercel/next.js",
        content: "Latest stable release of Next.js is version 15.1.0. Next.js 14 is in maintenance mode.",
        published_date: "2024-12-05T00:00:00Z",
        score: 0.95,
      },
    ];
  }

  if (claim.category === "pricing" && (norm.includes("chatgpt plus") || norm.includes("chatgpt"))) {
    return [
      {
        url: "https://openai.com/chatgpt/pricing",
        title: "ChatGPT Pricing & Subscription Plans",
        content: "ChatGPT Plus is $20/month. ChatGPT Team is $25/user/month. ChatGPT Pro is $200/month.",
        published_date: "2024-12-10T00:00:00Z",
        score: 0.99,
      },
    ];
  }

  if (claim.category === "leadership_role" && norm.includes("apple")) {
    return [
      {
        url: "https://www.apple.com/leadership/tim-cook/",
        title: "Apple Leadership - Tim Cook, CEO",
        content: "Tim Cook is the CEO of Apple and serves on its board of directors, continuing his leadership.",
        published_date: "2024-09-01T00:00:00Z",
        score: 0.97,
      },
    ];
  }

  return [
    {
      url: `https://${claim.official_domains[0] || "example.com"}/news`,
      title: `${claim.entities[0] || "Entity"} Current Official Status`,
      content: `Current information regarding ${claim.normalized} as verified through official documentation.`,
      published_date: new Date().toISOString(),
      score: 0.85,
    },
  ];
}
