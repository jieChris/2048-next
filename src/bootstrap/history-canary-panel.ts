interface HistoryCanaryViewLike {
  gateClass?: unknown;
  gateText?: unknown;
  effectiveModeText?: unknown;
  modeSourceText?: unknown;
  forceLegacyText?: unknown;
  forceSourceText?: unknown;
  storedDefaultText?: unknown;
  storedForceLegacyText?: unknown;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function escapeHtml(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeCanaryView(input: unknown): HistoryCanaryViewLike {
  return input && typeof input === "object" ? (input as HistoryCanaryViewLike) : {};
}

export function resolveHistoryCanaryPanelHtml(input: unknown): string {
  const canaryView = normalizeCanaryView(input);
  const gateClass = toText(canaryView.gateClass);
  const gateText = toText(canaryView.gateText);
  const effectiveModeText = toText(canaryView.effectiveModeText);
  const modeSourceText = toText(canaryView.modeSourceText);
  const forceLegacyText = toText(canaryView.forceLegacyText);
  const forceSourceText = toText(canaryView.forceSourceText);
  const storedDefaultText = toText(canaryView.storedDefaultText);
  const storedForceLegacyText = toText(canaryView.storedForceLegacyText);

  return (
    "<div class='history-canary-head'>" +
      "<div class='history-canary-title'>Canary 策略控制</div>" +
      "<span class='history-burnin-gate " + escapeHtml(gateClass) + "'>" + escapeHtml(gateText) + "</span>" +
    "</div>" +
    "<div class='history-canary-grid'>" +
      "<span>当前有效模式: " + escapeHtml(effectiveModeText) + "</span>" +
      "<span>生效来源: " + escapeHtml(modeSourceText) + "</span>" +
      "<span>强制回滚: " + escapeHtml(forceLegacyText) + "</span>" +
      "<span>回滚来源: " + escapeHtml(forceSourceText) + "</span>" +
    "</div>" +
    "<div class='history-canary-note'>" +
      "storage(engine_adapter_default_mode)=" + escapeHtml(storedDefaultText) +
      " · storage(engine_adapter_force_legacy)=" + escapeHtml(storedForceLegacyText) +
    "</div>" +
    "<div class='history-canary-note'>" +
      "说明: 修改后需刷新任一对局页（index/play/undo/capped/practice/replay）以应用新策略。" +
    "</div>" +
    "<div class='history-canary-actions'>" +
      "<button class='replay-button history-canary-action-btn' data-action='apply_canary'>进入 Canary（默认 core）</button>" +
      "<button class='replay-button history-canary-action-btn' data-action='emergency_rollback'>紧急回滚（强制 legacy）</button>" +
      "<button class='replay-button history-canary-action-btn' data-action='resume_canary'>解除回滚（恢复默认）</button>" +
      "<button class='replay-button history-canary-action-btn' data-action='reset_policy'>重置策略（回到基线）</button>" +
    "</div>"
  );
}

export function resolveHistoryCanaryActionName(target: unknown): string {
  if (!target || typeof target !== "object") return "";
  const node = target as { getAttribute?: (name: string) => string | null };
  if (typeof node.getAttribute !== "function") return "";
  return node.getAttribute("data-action") || "";
}
