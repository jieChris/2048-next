function normalizeGridSize(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 4;
  return Math.floor(numeric);
}

export function resolveTimerUpdateIntervalMs(width: unknown, height: unknown): number {
  const w = normalizeGridSize(width);
  const h = normalizeGridSize(height);
  const area = w * h;
  if (area >= 100) return 50;
  if (area >= 64) return 33;
  return 10;
}

export function resolveMoveInputThrottleMs(
  replayMode: unknown,
  width: unknown,
  height: unknown
): number {
  if (replayMode) return 0;
  const w = normalizeGridSize(width);
  const h = normalizeGridSize(height);
  const area = w * h;
  if (area >= 100) return 65;
  if (area >= 64) return 45;
  return 0;
}

export interface TimerInvalidationInput {
  timerMilestones?: unknown[] | null;
  timerSlotIds?: unknown[] | null;
  limit?: unknown;
  reached32k?: boolean | null;
  isFibonacciMode?: boolean | null;
}

export function resolveInvalidatedTimerElementIds(input: TimerInvalidationInput): string[] {
  const milestones = Array.isArray(input.timerMilestones) ? input.timerMilestones : [];
  const timerSlotIds = Array.isArray(input.timerSlotIds) ? input.timerSlotIds : [];
  const limit = Number(input.limit);
  const out: string[] = [];

  for (let i = 0; i < timerSlotIds.length; i++) {
    const milestoneValue = Number(milestones[i]);
    const slotId = timerSlotIds[i];
    if (Number.isInteger(milestoneValue) && milestoneValue <= limit) {
      out.push("timer" + String(slotId));
    }
  }

  if (input.reached32k && !input.isFibonacciMode) {
    if (8192 <= limit && limit !== 32768) out.push("timer8192-sub");
    if (16384 <= limit && limit !== 32768) out.push("timer16384-sub");
  }

  return out;
}

export interface SecondaryTimerInvalidationDescriptorInput {
  parent?: unknown;
  child?: unknown;
  parentReached?: boolean | null;
}

export interface SecondaryTimerInvalidationInput {
  descriptors?: SecondaryTimerInvalidationDescriptorInput[] | null;
  value?: unknown;
}

function normalizeTimerMilestoneValue(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
}

export function resolveInvalidatedSecondaryTimerElementIds(
  input: SecondaryTimerInvalidationInput
): string[] {
  const source = input || ({} as SecondaryTimerInvalidationInput);
  const descriptors = Array.isArray(source.descriptors) ? source.descriptors : [];
  const placedValue = normalizeTimerMilestoneValue(source.value);
  if (placedValue === null || placedValue < 2048) return [];
  const out: string[] = [];

  for (let i = 0; i < descriptors.length; i++) {
    const descriptor = descriptors[i] || {};
    const parent = normalizeTimerMilestoneValue(descriptor.parent);
    const child = normalizeTimerMilestoneValue(descriptor.child);
    if (parent === null || child === null) continue;
    if (parent <= child) continue;
    if (child !== placedValue) continue;
    if (descriptor.parentReached !== true) continue;
    out.push("timer-secondary-" + String(parent) + "-" + String(child));
  }

  return out;
}
