import { type SiteAdapter } from "./types";
import { ChatGPTAdapter } from "./chatgpt";
import { ClaudeAdapter } from "./claude";
import { DemoAdapter } from "./demo";
import { GenericSelectionAdapter } from "./generic-selection";

export * from "./types";
export * from "./selectors";
export * from "./chatgpt";
export * from "./claude";
export * from "./demo";
export * from "./generic-selection";

const ADAPTERS: SiteAdapter[] = [
  new DemoAdapter(),
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GenericSelectionAdapter(),
];

export function resolveAdapter(url: string = window.location.href): SiteAdapter {
  for (const adapter of ADAPTERS) {
    if (adapter.matches(url)) {
      return adapter;
    }
  }
  return new GenericSelectionAdapter();
}
