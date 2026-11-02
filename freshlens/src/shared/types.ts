import { z } from "zod";
import {
  VerifyRequestSchema,
  VerifyResponseSchema,
  type VerifyRequest,
  type VerifyResponse,
  type ClaimResult,
  type Band,
} from "./contract";

export const ExtensionSettingsSchema = z.object({
  engineUrl: z.string().url().default("http://localhost:3001"),
  apiKey: z.string().default(""),
  depth: z.enum(["fast", "thorough"]).default("fast"),
  autoCheck: z
    .object({
      chatgpt: z.boolean().default(true),
      claude: z.boolean().default(true),
      demo: z.boolean().default(true),
    })
    .default({
      chatgpt: true,
      claude: true,
      demo: true,
    }),
  maxClaims: z.number().int().min(1).max(10).default(5),
  includePrompt: z.boolean().default(false),
  demoMode: z.boolean().default(true),
  historySize: z.number().int().min(5).max(100).default(20),
  minMessageLength: z.number().int().min(10).default(80),
  ignoreCodeBlocks: z.boolean().default(true),
});
export type ExtensionSettings = z.infer<typeof ExtensionSettingsSchema>;

export const ExtensionErrorTaxonomy = z.enum([
  "offline",
  "unauthorized",
  "rate_limited",
  "budget_exhausted",
  "upstream_failed",
  "invalid_request",
  "timeout",
  "unknown",
]);
export type ExtensionErrorCode = z.infer<typeof ExtensionErrorTaxonomy>;

export interface ExtensionError {
  code: ExtensionErrorCode;
  message: string;
  details?: string;
}

// Internal Chrome Messaging Messages
export const CheckMessagePayloadSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  site: z.string(),
  messageId: z.string(),
  depth: z.enum(["fast", "thorough"]).optional(),
  prompt: z.string().optional(),
});
export type CheckMessagePayload = z.infer<typeof CheckMessagePayloadSchema>;

export const CheckSelectionPayloadSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  prompt: z.string().optional(),
});
export type CheckSelectionPayload = z.infer<typeof CheckSelectionPayloadSchema>;

export type RuntimeMessage =
  | { type: "CHECK_MESSAGE"; payload: CheckMessagePayload }
  | { type: "CHECK_SELECTION"; payload: CheckSelectionPayload }
  | { type: "GET_SETTINGS" }
  | { type: "SETTINGS_CHANGED"; payload: ExtensionSettings }
  | { type: "RESULT"; payload: { messageId: string; response: VerifyResponse } }
  | { type: "ERROR"; payload: { messageId: string; error: ExtensionError } }
  | { type: "PING" };

export interface HistoryItem {
  id: string;
  timestamp: string;
  site: string;
  sampleText: string; // Truncated to <= 500 chars
  overall: {
    score: number;
    band: Band;
    staleCount: number;
    totalClaims: number;
  };
  claims: ClaimResult[];
}
