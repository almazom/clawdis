type MultyStepSnapshot = {
  start?: boolean;
  multisampleDone?: boolean;
  synthesisDone?: boolean;
  articleWritten?: boolean;
  rawWritten?: boolean;
  translationDone?: boolean;
  publishDone?: boolean;
  notifyDone?: boolean;
  authError?: boolean;
};

const DEFAULT_MODELS = ["glm", "kimi-thinking", "minimax"];

const MODEL_DISPLAY: Record<string, string> = {
  glm: "GLM-4.7",
  "kimi-thinking": "Kimi-K2-Thinking",
  minimax: "MiniMax-M2.1",
};

const STEP_ORDER = [
  { key: "command", label: "Команда получена" },
  { key: "multisampling", label: "Мультисэмплинг" },
  { key: "synthesis", label: "Синтез" },
  { key: "writing", label: "Запись файлов" },
  { key: "translation", label: "Перевод" },
  { key: "publishing", label: "Публикация" },
  { key: "notify", label: "Уведомление" },
];

export function resolveMultyModels(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (env.IFLOW_MODELS ?? "").trim();
  if (!raw) return DEFAULT_MODELS.slice();
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function formatMultyModelsDisplay(models: string[]): string {
  return models
    .map((model) => MODEL_DISPLAY[model] ?? model)
    .join(", ");
}

export function parseMultyJsonl(content: string): MultyStepSnapshot {
  const snapshot: MultyStepSnapshot = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const payload = JSON.parse(trimmed) as { step?: string };
      switch (payload.step) {
        case "start":
          snapshot.start = true;
          break;
        case "multisample_done":
          snapshot.multisampleDone = true;
          break;
        case "synthesis_done":
          snapshot.synthesisDone = true;
          break;
        case "article_written":
          snapshot.articleWritten = true;
          break;
        case "raw_written":
          snapshot.rawWritten = true;
          break;
        case "translation_done":
          snapshot.translationDone = true;
          break;
        case "publish_done":
          snapshot.publishDone = true;
          break;
        case "notify_done":
          snapshot.notifyDone = true;
          break;
        case "auth_error":
          snapshot.authError = true;
          break;
        default:
          break;
      }
    } catch {
      continue;
    }
  }
  return snapshot;
}

export function buildMultyStatusMessage(params: {
  topic: string;
  models: string[];
  elapsedSeconds: number;
  steps: MultyStepSnapshot;
  publishEnabled?: boolean;
  notifyEnabled?: boolean;
}): string {
  const {
    topic,
    models,
    elapsedSeconds,
    steps,
    publishEnabled = true,
    notifyEnabled = true,
  } = params;
  const done = new Set<string>();
  if (steps.start) done.add("command");
  if (steps.multisampleDone) done.add("multisampling");
  if (steps.synthesisDone) done.add("synthesis");
  if (steps.articleWritten && steps.rawWritten) done.add("writing");
  if (steps.translationDone) done.add("translation");
  if (publishEnabled ? steps.publishDone : true) done.add("publishing");
  if (notifyEnabled ? steps.notifyDone : true) done.add("notify");

  const currentIndex = STEP_ORDER.findIndex((step) => !done.has(step.key));
  const lines = STEP_ORDER.map((step, index) => {
    let marker = "○";
    if (done.has(step.key)) {
      marker = "●";
    } else if (index === currentIndex || currentIndex === -1) {
      marker = "◐";
    }
    const label =
      step.key === "publishing" && !publishEnabled
        ? "Publishing (skipped)"
        : step.key === "notify" && !notifyEnabled
          ? "Notify (skipped)"
          : step.label;
    return `${marker} ${label}`;
  });

  return [
    `Тема: "${topic}"`,
    `Модели: ${formatMultyModelsDisplay(models)}`,
    `Прошло: ${elapsedSeconds}s`,
    "",
    "Статус:",
    ...lines,
    "",
    "Обновление каждые 30s.",
  ].join("\n");
}

export function resolveMultyCurrentStepLabel(
  steps: MultyStepSnapshot,
  options?: { publishEnabled?: boolean; notifyEnabled?: boolean },
): string {
  const publishEnabled = options?.publishEnabled ?? true;
  const notifyEnabled = options?.notifyEnabled ?? true;
  if (!steps.start) return "Command received";
  if (!steps.multisampleDone) return "Multisampling";
  if (!steps.synthesisDone) return "Synthesis";
  if (!steps.articleWritten || !steps.rawWritten) return "Writing files";
  if (!steps.translationDone) return "Translation";
  if (publishEnabled && !steps.publishDone) return "Publishing";
  if (notifyEnabled && !steps.notifyDone) return "Notify";
  return "Completed";
}
