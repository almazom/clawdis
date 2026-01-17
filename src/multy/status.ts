type StepTimestampMap = {
  start?: number;
  multisample_done?: number;
  synthesis_done?: number;
  article_written?: number;
  raw_written?: number;
  translation_done?: number;
  publish_done?: number;
  notify_done?: number;
  auth_error?: number;
};

type MultyStepSnapshot = {
  timestamps: StepTimestampMap;
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
  { key: "done", label: "Готово" },
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
  const snapshot: MultyStepSnapshot = { timestamps: {} };
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const payload = JSON.parse(trimmed) as {
        step?: string;
        timestamp?: number;
      };
      const timestamp =
        typeof payload.timestamp === "number" ? payload.timestamp : undefined;
      switch (payload.step) {
        case "start":
          if (timestamp) snapshot.timestamps.start = timestamp;
          break;
        case "multisample_done":
          if (timestamp) snapshot.timestamps.multisample_done = timestamp;
          break;
        case "synthesis_done":
          if (timestamp) snapshot.timestamps.synthesis_done = timestamp;
          break;
        case "article_written":
          if (timestamp) snapshot.timestamps.article_written = timestamp;
          break;
        case "raw_written":
          if (timestamp) snapshot.timestamps.raw_written = timestamp;
          break;
        case "translation_done":
          if (timestamp) snapshot.timestamps.translation_done = timestamp;
          break;
        case "publish_done":
          if (timestamp) snapshot.timestamps.publish_done = timestamp;
          break;
        case "notify_done":
          if (timestamp) snapshot.timestamps.notify_done = timestamp;
          break;
        case "auth_error":
          snapshot.authError = true;
          if (timestamp) snapshot.timestamps.auth_error = timestamp;
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
  nowMs?: number;
}): string {
  const {
    topic,
    models,
    elapsedSeconds,
    steps,
    publishEnabled = true,
    notifyEnabled = true,
    nowMs,
  } = params;
  const escapedTopic = escapeHtml(topic);
  const escapedModels = escapeHtml(formatMultyModelsDisplay(models));
  const times = steps.timestamps ?? {};
  const done = new Set<string>();
  if (times.start) done.add("command");
  if (times.multisample_done) done.add("multisampling");
  if (times.synthesis_done) done.add("synthesis");
  const writingDone =
    times.article_written && times.raw_written
      ? Math.max(times.article_written, times.raw_written)
      : undefined;
  if (writingDone) done.add("writing");
  if (times.translation_done) done.add("translation");
  if (publishEnabled ? times.publish_done : true) done.add("publishing");
  if (times.notify_done || times.publish_done) done.add("done");

  const currentIndex = STEP_ORDER.findIndex((step) => !done.has(step.key));
  const lineDurations = resolveStepDurations({
    times,
    writingDone,
    publishEnabled,
    notifyEnabled,
    nowMs: nowMs ?? Date.now(),
  });
  const lines = STEP_ORDER.map((step, index) => {
    let marker = "○";
    if (done.has(step.key)) {
      marker = "●";
    } else if (index === currentIndex || currentIndex === -1) {
      marker = "◐";
    }
    const label =
      step.key === "publishing" && !publishEnabled
        ? "Публикация (пропуск)"
        : step.label;
    const escapedLabel = escapeHtml(label);
    const duration = lineDurations[step.key];
    const decoratedLabel = escapedLabel;
    const suffix = duration ? ` (${duration})` : "";
    return `${marker} ${decoratedLabel}${suffix}`;
  });
  const percent = resolveProgressPercent(done, publishEnabled, notifyEnabled);
  const progressBar = renderProgressBar(percent, 10);

  return [
    `Тема: "${escapedTopic}"`,
    `Модели: ${escapedModels}`,
    `Прошло: ${elapsedSeconds}с`,
    `Прогресс: ${percent}% ${progressBar}`,
    "",
    "Статус:",
    ...lines,
    "",
    "Обновление каждые 30с.",
  ].join("\n");
}

export function buildMultyCanceledMessage(params: {
  topic: string;
  models: string[];
  elapsedSeconds: number;
  reason?: string;
}): string {
  const { topic, models, elapsedSeconds, reason } = params;
  const escapedTopic = escapeHtml(topic);
  const escapedModels = escapeHtml(formatMultyModelsDisplay(models));
  const escapedReason = reason ? escapeHtml(reason) : "Мультисэмплинг отменен.";

  return [
    `Тема: "${escapedTopic}"`,
    `Модели: ${escapedModels}`,
    `Прошло: ${elapsedSeconds}с`,
    "",
    "Статус:",
    `⛔ ${escapedReason}`,
    "",
    "Обновления остановлены.",
  ].join("\n");
}

export function resolveMultyCurrentStepLabel(
  steps: MultyStepSnapshot,
  options?: { publishEnabled?: boolean; notifyEnabled?: boolean },
): string {
  const publishEnabled = options?.publishEnabled ?? true;
  const notifyEnabled = options?.notifyEnabled ?? true;
  const times = steps.timestamps ?? {};
  const writingDone =
    times.article_written && times.raw_written
      ? Math.max(times.article_written, times.raw_written)
      : undefined;
  if (!times.start) return "Команда получена";
  if (!times.multisample_done) return "Мультисэмплинг";
  if (!times.synthesis_done) return "Синтез";
  if (!writingDone) return "Запись файлов";
  if (!times.translation_done) return "Перевод";
  if (publishEnabled && !times.publish_done) return "Публикация";
  if (notifyEnabled && !times.notify_done) return "Готово";
  return "Готово";
}

function resolveStepDurations(params: {
  times: StepTimestampMap;
  writingDone?: number;
  publishEnabled: boolean;
  notifyEnabled: boolean;
  nowMs: number;
}): Record<string, string | undefined> {
  const { times, writingDone, publishEnabled, notifyEnabled, nowMs } = params;
  const toMs = (value?: number) => (value ? Math.floor(value * 1000) : undefined);
  const startAt = toMs(times.start);
  const multisampleAt = toMs(times.multisample_done);
  const synthesisAt = toMs(times.synthesis_done);
  const writingAt = writingDone ? Math.floor(writingDone * 1000) : undefined;
  const translationAt = toMs(times.translation_done);
  const publishAt = toMs(times.publish_done);
  const notifyAt = toMs(times.notify_done);

  const durations: Record<string, string | undefined> = {};
  if (startAt && multisampleAt) {
    durations.multisampling = formatDuration(multisampleAt - startAt);
  }
  if (multisampleAt && synthesisAt) {
    durations.synthesis = formatDuration(synthesisAt - multisampleAt);
  }
  if (synthesisAt && writingAt) {
    durations.writing = formatDuration(writingAt - synthesisAt);
  }
  if (writingAt && translationAt) {
    durations.translation = formatDuration(translationAt - writingAt);
  }
  if (publishEnabled && translationAt && publishAt) {
    durations.publishing = formatDuration(publishAt - translationAt);
  }
  if (notifyEnabled && publishAt && notifyAt) {
    durations.done = formatDuration(notifyAt - publishAt);
  }

  if (!durations.multisampling && startAt) {
    durations.command = formatDuration(nowMs - startAt);
  }

  return durations;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}с`;
}

function resolveProgressPercent(
  done: Set<string>,
  publishEnabled: boolean,
  notifyEnabled: boolean,
): number {
  const baseSteps = 5;
  const total = baseSteps + (publishEnabled ? 1 : 0) + 1;
  const doneCount =
    Math.min(done.size, baseSteps) +
    (publishEnabled ? (done.has("publishing") ? 1 : 0) : 1) +
    (done.has("done") ? 1 : 0);
  return Math.min(100, Math.round((doneCount / total) * 100));
}

function renderProgressBar(percent: number, width: number): string {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
