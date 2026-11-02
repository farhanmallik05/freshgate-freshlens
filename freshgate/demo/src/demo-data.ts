export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  category: string;
  volatility: string;
  suggestedTTL: number | null;
  rawAnswer: string;
  freshgateAnswer: string;
  claims: {
    text: string;
    verdict: "current" | "stale" | "unverifiable";
    freshness: number;
    band: "fresh" | "aging" | "stale";
    correction: string | null;
    reasoning: string;
    sourceDomain: string;
    sourceUrl: string;
  }[];
  overallScore: number;
  overallBand: "fresh" | "aging" | "stale";
}

export const SCENARIOS: Scenario[] = [
  {
    id: "nextjs",
    title: "Latest Next.js Version",
    prompt: "What is the latest version of Next.js and its main features?",
    category: "version_release",
    volatility: "high",
    suggestedTTL: 3600,
    rawAnswer:
      "The latest version of Next.js is Next.js 14, released in late 2023. Key features include Server Actions, Partial Prerendering (preview), and the Turbopack compiler bundler.",
    freshgateAnswer:
      "The latest version of Next.js is Next.js 14, released in late 2023. Key features include Server Actions, Partial Prerendering (preview), and the Turbopack compiler bundler.\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~Next.js 14 is the latest version~~ -> Next.js 15 is generally available ([nextjs.org](https://nextjs.org/blog/next-15), 2024-10-24)",
    overallScore: 24,
    overallBand: "stale",
    claims: [
      {
        text: "Next.js 14 is the latest version",
        verdict: "stale",
        freshness: 24,
        band: "stale",
        correction: "Next.js 15 is generally available with React 19 support",
        reasoning: "Next.js 15 was officially released at Next.js Conf in October 2024, superseding Next.js 14.",
        sourceDomain: "nextjs.org",
        sourceUrl: "https://nextjs.org/blog/next-15",
      },
    ],
  },
  {
    id: "pricing",
    title: "API Pricing of AI Model",
    prompt: "How much does Claude 3.5 Sonnet API cost per million tokens?",
    category: "pricing",
    volatility: "high",
    suggestedTTL: 3600,
    rawAnswer:
      "Claude 3.5 Sonnet pricing is $3 per million input tokens and $15 per million output tokens on the Anthropic API.",
    freshgateAnswer:
      "Claude 3.5 Sonnet pricing is $3 per million input tokens and $15 per million output tokens on the Anthropic API.",
    overallScore: 94,
    overallBand: "fresh",
    claims: [
      {
        text: "$3 per million input tokens and $15 per million output tokens",
        verdict: "current",
        freshness: 94,
        band: "fresh",
        correction: null,
        reasoning: "Confirmed current official pricing on Anthropic developer platform.",
        sourceDomain: "anthropic.com",
        sourceUrl: "https://www.anthropic.com/pricing",
      },
    ],
  },
  {
    id: "ceo",
    title: "Current CEO of Twitter / X",
    prompt: "Who is the current CEO of Twitter / X?",
    category: "leadership_role",
    volatility: "high",
    suggestedTTL: 3600,
    rawAnswer:
      "Elon Musk is currently the CEO of Twitter, having acquired the company in October 2022.",
    freshgateAnswer:
      "Elon Musk is currently the CEO of Twitter, having acquired the company in October 2022.\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~Elon Musk is currently the CEO of Twitter~~ -> Linda Yaccarino is the CEO of X ([about.twitter.com](https://about.twitter.com), 2023-06-05)",
    overallScore: 18,
    overallBand: "stale",
    claims: [
      {
        text: "Elon Musk is currently the CEO of Twitter",
        verdict: "stale",
        freshness: 18,
        band: "stale",
        correction: "Linda Yaccarino was appointed Chief Executive Officer of X in June 2023",
        reasoning: "Musk stepped down as CEO and appointed Linda Yaccarino as Chief Executive.",
        sourceDomain: "about.twitter.com",
        sourceUrl: "https://about.twitter.com/en/who-we-are/our-company",
      },
    ],
  },
  {
    id: "tax",
    title: "Corporate Tax Rate in UK",
    prompt: "What is the main corporate tax rate in the UK?",
    category: "law_policy",
    volatility: "medium",
    suggestedTTL: 86400,
    rawAnswer:
      "The main rate of Corporation Tax in the UK is 19% for companies with profits over £50,000.",
    freshgateAnswer:
      "The main rate of Corporation Tax in the UK is 19% for companies with profits over £50,000.\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~main rate of Corporation Tax in the UK is 19%~~ -> Main rate increased to 25% ([gov.uk](https://www.gov.uk/corporation-tax-rates), 2023-04-01)",
    overallScore: 22,
    overallBand: "stale",
    claims: [
      {
        text: "main rate of Corporation Tax in the UK is 19%",
        verdict: "stale",
        freshness: 22,
        band: "stale",
        correction: "The UK Corporation Tax main rate increased from 19% to 25% from 1 April 2023",
        reasoning: "HMRC tax tables confirm the main rate has been 25% since April 2023.",
        sourceDomain: "gov.uk",
        sourceUrl: "https://www.gov.uk/corporation-tax-rates",
      },
    ],
  },
  {
    id: "heroku",
    title: "Is X Still Available?",
    prompt: "Is the free tier of Heroku still available?",
    category: "event_status",
    volatility: "realtime",
    suggestedTTL: null,
    rawAnswer:
      "Yes, Heroku provides free dynos and free PostgreSQL databases for developers to host side projects.",
    freshgateAnswer:
      "Yes, Heroku provides free dynos and free PostgreSQL databases for developers to host side projects.\n\n---\n**Freshness check (FreshGate):** 1 claim(s) may be outdated.\n- ~~Heroku provides free dynos and free PostgreSQL databases~~ -> Free product plans were sunset ([blog.heroku.com](https://blog.heroku.com), 2022-11-28)",
    overallScore: 12,
    overallBand: "stale",
    claims: [
      {
        text: "Heroku provides free dynos and free PostgreSQL databases",
        verdict: "stale",
        freshness: 12,
        band: "stale",
        correction: "Salesforce/Heroku sunset all free dynos and data plans on November 28, 2022",
        reasoning: "Heroku announced the removal of free tiers to focus on mission-critical applications.",
        sourceDomain: "blog.heroku.com",
        sourceUrl: "https://blog.heroku.com/next-chapter",
      },
    ],
  },
];
