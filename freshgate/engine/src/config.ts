import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const ConfigSchema = z.object({
  TAVILY_API_KEY: z.string().default("tvly-mock-key"),
  ENGINE_LLM_BASE_URL: z.string().default("http://bifrost:8080/v1"),
  ENGINE_LLM_API_KEY: z.string().default("sk-mock-key"),
  ENGINE_LLM_MODEL_EXTRACT: z.string().default("gpt-4o-mini"),
  ENGINE_LLM_MODEL_JUDGE: z.string().default("gpt-4o-mini"),
  ENGINE_API_KEY: z.string().default(""),
  ENGINE_PORT: z.coerce.number().default(8787),
  ENGINE_DB_PATH: z.string().default("./data/engine.db"),
  ENGINE_MOCK: z
    .string()
    .optional()
    .transform((val) => val === "1" || val === "true" || !process.env.ENGINE_LLM_API_KEY || process.env.ENGINE_MOCK === "1"),
  ENGINE_VERIFY_TIMEOUT_MS: z.coerce.number().default(20000),
  TAVILY_CREDIT_BUDGET_PER_HOUR: z.coerce.number().default(300),
  ENGINE_CORS_ORIGINS: z.string().default("*"),
  BIFROST_URL: z.string().default("http://localhost:8080"),
});

export type Config = z.infer<typeof ConfigSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    const result = ConfigSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Configuration validation error:", result.error.format());
      throw new Error(`Invalid engine configuration: ${JSON.stringify(result.error.format())}`);
    }
    _config = result.data;
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
