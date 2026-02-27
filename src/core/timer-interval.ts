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
