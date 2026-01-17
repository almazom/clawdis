import { describe, expect, it } from "vitest";

import {
  buildMultyStatusMessage,
  parseMultyJsonl,
  resolveMultyCurrentStepLabel,
} from "./status.js";

describe("parseMultyJsonl", () => {
  it("captures known steps", () => {
    const content = [
      '{"step":"start"}',
      '{"step":"multisample_done"}',
      '{"step":"synthesis_done"}',
      '{"step":"article_written"}',
      '{"step":"raw_written"}',
      '{"step":"translation_done"}',
      '{"step":"publish_done"}',
      '{"step":"notify_done"}',
    ].join("\n");
    const parsed = parseMultyJsonl(content);
    expect(parsed.start).toBe(true);
    expect(parsed.multisampleDone).toBe(true);
    expect(parsed.synthesisDone).toBe(true);
    expect(parsed.articleWritten).toBe(true);
    expect(parsed.rawWritten).toBe(true);
    expect(parsed.translationDone).toBe(true);
    expect(parsed.publishDone).toBe(true);
    expect(parsed.notifyDone).toBe(true);
  });
});

describe("buildMultyStatusMessage", () => {
  it("marks current step based on progress", () => {
    const steps = parseMultyJsonl(
      '{"step":"start"}\n{"step":"multisample_done"}',
    );
    const message = buildMultyStatusMessage({
      topic: "HBO TV series Peacemaker",
      models: ["glm", "kimi-thinking", "minimax"],
      elapsedSeconds: 30,
      steps,
    });
    expect(message).toContain("● Command received");
    expect(message).toContain("● Multisampling");
    expect(message).toContain("◐ Synthesis");
  });
});

describe("resolveMultyCurrentStepLabel", () => {
  it("returns the next expected step", () => {
    const steps = parseMultyJsonl('{"step":"start"}\n{"step":"multisample_done"}');
    expect(resolveMultyCurrentStepLabel(steps)).toBe("Synthesis");
  });
});
