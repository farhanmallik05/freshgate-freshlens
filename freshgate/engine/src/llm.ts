import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { getConfig } from "./config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export interface LLMRequestOptions<T> {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
  mockFallback?: () => T;
}

export interface LLMResult<T> {
  data: T;
  usage: {
    in: number;
    out: number;
  };
}

function promptHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callStructuredLLM<T>(
  options: LLMRequestOptions<T>
): Promise<LLMResult<T>> {
  const config = getConfig();

  // Mock Mode Handling
  if (config.ENGINE_MOCK) {
    const hash = promptHash(options.prompt);
    const fixturePath = join(__dirname, "../test/fixtures/llm", `${hash}.json`);
    if (existsSync(fixturePath)) {
      try {
        const raw = readFileSync(fixturePath, "utf-8");
        const json = JSON.parse(raw);
        const parsed = options.schema.parse(json);
        return {
          data: parsed,
          usage: { in: 150, out: 95 },
        };
      } catch (err) {
        console.warn(`Fixture parse failed for ${hash}, falling back to mock provider`, err);
      }
    }
    if (options.mockFallback) {
      return {
        data: options.mockFallback(),
        usage: { in: 120, out: 80 },
      };
    }
  }

  const model = options.model || config.ENGINE_LLM_MODEL_EXTRACT;
  const baseUrl = config.ENGINE_LLM_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/chat/completions`;

  const messages = [
    ...(options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }]
      : []),
    {
      role: "user",
      content: `${options.prompt}\n\nIMPORTANT: Return ONLY valid, unadorned JSON adhering to the required schema. Do not enclose in markdown ticks if possible.`,
    },
  ];

  let lastError: Error | null = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.ENGINE_LLM_API_KEY}`,
          "x-freshgate-mode": "off", // ALWAYS prevent recursion
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          const jitter = Math.random() * 500 + 500 * attempts;
          await sleep(jitter);
          continue;
        }
        throw new Error(`LLM upstream error HTTP ${response.status}: ${await response.text()}`);
      }

      const body = (await response.json()) as any;
      const content = body.choices?.[0]?.message?.content || "";
      const usage = {
        in: body.usage?.prompt_tokens || 100,
        out: body.usage?.completion_tokens || 50,
      };

      const cleaned = cleanJsonText(content);
      const parsedJson = JSON.parse(cleaned);
      const validated = options.schema.safeParse(parsedJson);

      if (validated.success) {
        return {
          data: validated.data,
          usage,
        };
      }

      // One repair retry with validation error
      const repairController = new AbortController();
      const repairTimer = setTimeout(() => repairController.abort(), 15000);

      const repairMessages = [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content: `Your previous JSON output failed validation schema with error: ${JSON.stringify(
            validated.error.format()
          )}. Fix the JSON and output ONLY the corrected JSON:`,
        },
      ];

      const repairResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.ENGINE_LLM_API_KEY}`,
          "x-freshgate-mode": "off",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: repairMessages,
          response_format: { type: "json_object" },
        }),
        signal: repairController.signal,
      });

      clearTimeout(repairTimer);
      if (repairResponse.ok) {
        const repairBody = (await repairResponse.json()) as any;
        const repairContent = repairBody.choices?.[0]?.message?.content || "";
        const repairParsed = options.schema.parse(JSON.parse(cleanJsonText(repairContent)));
        return {
          data: repairParsed,
          usage: {
            in: usage.in + (repairBody.usage?.prompt_tokens || 100),
            out: usage.out + (repairBody.usage?.completion_tokens || 50),
          },
        };
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempts < maxAttempts) {
        await sleep(Math.random() * 500 + 500 * attempts);
      }
    }
  }

  if (options.mockFallback) {
    return {
      data: options.mockFallback(),
      usage: { in: 100, out: 50 },
    };
  }

  throw lastError || new Error("Failed to call LLM upstream");
}
