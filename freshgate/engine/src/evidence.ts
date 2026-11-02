import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Authority, Evidence } from "./contract/schemas.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

interface AuthorityData {
  tiers: {
    official: { patterns: string[]; domains: string[] };
    reputable: { domains: string[] };
    community: { domains: string[] };
  };
}

let cachedAuthority: AuthorityData | null = null;

function loadAuthority(): AuthorityData {
  if (cachedAuthority) return cachedAuthority;

  const paths = [
    join(process.cwd(), "shared/authority.json"),
    join(process.cwd(), "../shared/authority.json"),
    join(__dirname, "../../shared/authority.json"),
  ];

  for (const p of paths) {
    try {
      const raw = readFileSync(p, "utf-8");
      cachedAuthority = JSON.parse(raw);
      return cachedAuthority!;
    } catch {
      // try next
    }
  }

  // Fallback defaults
  cachedAuthority = {
    tiers: {
      official: { patterns: ["*.gov", "*.edu", "docs.*"], domains: ["github.com", "openai.com", "anthropic.com", "nextjs.org", "vercel.com"] },
      reputable: { domains: ["reuters.com", "bloomberg.com", "techcrunch.com", "wikipedia.org"] },
      community: { domains: ["reddit.com", "quora.com", "medium.com"] },
    },
  };
  return cachedAuthority;
}

export function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "unknown";
  }
}

export function classifyAuthority(domain: string, officialDomainHints: string[] = []): Authority {
  const auth = loadAuthority();
  const lower = domain.toLowerCase();

  // 1. Check official domain hints from claim
  if (officialDomainHints.some((h) => lower === h.toLowerCase() || lower.endsWith(`.${h.toLowerCase()}`))) {
    return "official";
  }

  // 2. Check patterns (*.gov, *.edu, docs.*)
  if (lower.endsWith(".gov") || lower.endsWith(".edu") || lower.startsWith("docs.") || lower.startsWith("api.")) {
    return "official";
  }

  // 3. Check official domain lists
  if (auth.tiers.official.domains.some((d) => lower === d || lower.endsWith(`.${d}`))) {
    return "official";
  }

  // 4. Check reputable domain lists
  if (auth.tiers.reputable.domains.some((d) => lower === d || lower.endsWith(`.${d}`))) {
    return "reputable";
  }

  // 5. Check community domain lists
  if (auth.tiers.community.domains.some((d) => lower === d || lower.endsWith(`.${d}`))) {
    return "community";
  }

  return "unknown";
}

export interface RawSearchResult {
  url: string;
  title: string;
  content: string;
  published_date?: string | null;
  score?: number;
}

export function normalizeEvidenceList(
  rawResults: RawSearchResult[],
  officialDomains: string[] = [],
  nowISO?: string
): Evidence[] {
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  const seenUrls = new Set<string>();
  const evidenceList: Evidence[] = [];

  for (const raw of rawResults) {
    if (!raw.url) continue;
    const cleanUrl = raw.url.split("#")[0].replace(/\/$/, "");
    if (seenUrls.has(cleanUrl)) continue;
    seenUrls.add(cleanUrl);

    const domain = extractDomain(cleanUrl);
    const authority = classifyAuthority(domain, officialDomains);

    let pubDateISO: string | null = null;
    if (raw.published_date) {
      const parsed = new Date(raw.published_date);
      if (!isNaN(parsed.getTime())) {
        pubDateISO = parsed.toISOString();
      }
    }

    evidenceList.push({
      id: `e${evidenceList.length + 1}`,
      url: cleanUrl,
      domain,
      title: raw.title || "Untitled Source",
      snippet: raw.content || "",
      published_date: pubDateISO,
      retrieved_at: new Date(now).toISOString(),
      authority,
      score: raw.score ?? 0.8,
    });
  }

  // Sort by authority descending, then score descending
  const authorityRank: Record<Authority, number> = {
    official: 4,
    reputable: 3,
    community: 2,
    unknown: 1,
  };

  evidenceList.sort((a, b) => {
    if (authorityRank[b.authority] !== authorityRank[a.authority]) {
      return authorityRank[b.authority] - authorityRank[a.authority];
    }
    return b.score - a.score;
  });

  return evidenceList.slice(0, 5);
}
