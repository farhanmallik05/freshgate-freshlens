import { describe, it, expect } from "vitest";
import { ExtensionSettingsSchema } from "../src/shared/types";

describe("FreshLens Settings", () => {
  it("provides sound default configuration", () => {
    const defaults = ExtensionSettingsSchema.parse({});
    expect(defaults.engineUrl).toBe("http://localhost:3001");
    expect(defaults.demoMode).toBe(true);
    expect(defaults.includePrompt).toBe(false); // Privacy-first default
    expect(defaults.maxClaims).toBe(5);
    expect(defaults.depth).toBe("fast");
    expect(defaults.autoCheck.chatgpt).toBe(true);
    expect(defaults.autoCheck.claude).toBe(true);
  });

  it("migrates partial legacy settings", () => {
    const legacy = {
      engineUrl: "http://127.0.0.1:8080",
      depth: "thorough",
    };
    const migrated = ExtensionSettingsSchema.parse(legacy);
    expect(migrated.engineUrl).toBe("http://127.0.0.1:8080");
    expect(migrated.depth).toBe("thorough");
    expect(migrated.maxClaims).toBe(5);
    expect(migrated.includePrompt).toBe(false);
  });

  it("enforces boundary constraints on maxClaims", () => {
    expect(() =>
      ExtensionSettingsSchema.parse({
        maxClaims: 0,
      })
    ).toThrow();

    expect(() =>
      ExtensionSettingsSchema.parse({
        maxClaims: 15,
      })
    ).toThrow();
  });
});
