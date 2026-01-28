import { describe, expect, it } from "vitest";

import {
  buildMultyCanceledMessage,
  buildMultyStatusMessage,
  formatMultyModelsDisplay,
  parseMultyJsonl,
  resolveMultyCurrentStepLabel,
  resolveMultyModels,
} from "./status.js";

describe("multy status helpers", () => {
  it("resolves default models when env is empty", () => {
    const models = resolveMultyModels({ IFLOW_MODELS: "  " });
    expect(models).toEqual(["glm", "kimi-thinking", "minimax"]);
  });

  it("splits and formats model names", () => {
    const models = resolveMultyModels({
      IFLOW_MODELS: "glm, custom-model , minimax",
    });
    expect(models).toEqual(["glm", "custom-model", "minimax"]);
    expect(formatMultyModelsDisplay(models)).toBe(
      "GLM-4.7, custom-model, MiniMax-M2.1",
    );
  });

  it("parses JSONL timestamps and auth errors", () => {
    const snapshot = parseMultyJsonl(
      [
        '{"step":"start","timestamp":1}',
        '{"step":"multisample_done","timestamp":2}',
        '{"step":"auth_error","timestamp":3}',
        "not-json",
      ].join("\n"),
    );
    expect(snapshot.timestamps.start).toBe(1);
    expect(snapshot.timestamps.multisample_done).toBe(2);
    expect(snapshot.timestamps.auth_error).toBe(3);
    expect(snapshot.authError).toBe(true);
  });

  it("builds status text with escaped HTML and skip publishing label", () => {
    const steps = {
      timestamps: {
        start: 1,
        multisample_done: 2,
        synthesis_done: 3,
        article_written: 4,
        raw_written: 4,
        translation_done: 5,
        publish_done: 6,
      },
    };
    const text = buildMultyStatusMessage({
      topic: "A & B <C>",
      models: ["glm"],
      elapsedSeconds: 12,
      steps,
      publishEnabled: false,
      notifyEnabled: false,
      nowMs: 7000,
    });
    expect(text).toContain('Тема: "A &amp; B &lt;C&gt;"');
    expect(text).toContain("Публикация (пропуск)");
    expect(text).toContain("Прошло: 12с");
    expect(text).toContain("● Готово");
  });

  it("builds canceled text with reason", () => {
    const text = buildMultyCanceledMessage({
      topic: "Hello & Bye",
      models: ["minimax"],
      elapsedSeconds: 5,
      reason: "Причина <тест>",
    });
    expect(text).toContain("Причина &lt;тест&gt;");
    expect(text).toContain("⛔");
  });

  it("resolves current step label", () => {
    expect(resolveMultyCurrentStepLabel({ timestamps: {} })).toBe(
      "Команда получена",
    );
    expect(
      resolveMultyCurrentStepLabel({ timestamps: { start: 1 } }),
    ).toBe("Мультисэмплинг");
    expect(
      resolveMultyCurrentStepLabel({
        timestamps: { start: 1, multisample_done: 2 },
      }),
    ).toBe("Синтез");
  });
});
