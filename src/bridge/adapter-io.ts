export interface AdapterStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface AdapterSnapshot {
  adapterMode: "legacy-bridge" | "core-adapter";
  modeKey: string;
  updatedAt: number;
  [key: string]: unknown;
}

const ADAPTER_SNAPSHOT_KEY_PREFIX = "engine_adapter_snapshot_v1:";

function normalizeModeKey(modeKey: string | null | undefined): string {
  return typeof modeKey === "string" && modeKey ? modeKey : "unknown";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function buildAdapterSnapshotKey(modeKey: string | null | undefined): string {
  return ADAPTER_SNAPSHOT_KEY_PREFIX + normalizeModeKey(modeKey);
}

export function readAdapterSnapshot(
  storage: AdapterStorageLike | null | undefined,
  modeKey: string | null | undefined
): Record<string, unknown> | null {
  if (!storage || typeof storage.getItem !== "function") return null;

  try {
    const raw = storage.getItem(buildAdapterSnapshotKey(modeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch (_err) {
    return null;
  }
}

export function writeAdapterSnapshot(
  storage: AdapterStorageLike | null | undefined,
  modeKey: string | null | undefined,
  snapshot: Record<string, unknown>
): boolean {
  if (!storage || typeof storage.setItem !== "function") return false;

  try {
    storage.setItem(buildAdapterSnapshotKey(modeKey), JSON.stringify(snapshot));
    return true;
  } catch (_err) {
    return false;
  }
}

export function buildAdapterMoveResultEventName(modeKey: string | null | undefined): string {
  return "engine-adapter:move-result:" + normalizeModeKey(modeKey);
}

export interface AdapterMoveResultEmitInput {
  target: { dispatchEvent: (event: Event) => boolean } | null | undefined;
  modeKey: string | null | undefined;
  detail: Record<string, unknown>;
  eventCtor?: new (type: string, eventInitDict?: CustomEventInit<Record<string, unknown>>) => Event;
}

export function emitAdapterMoveResult(input: AdapterMoveResultEmitInput): boolean {
  const target = input.target;
  if (!target || typeof target.dispatchEvent !== "function") return false;

  const EventCtor =
    input.eventCtor ||
    (typeof CustomEvent === "function"
      ? (CustomEvent as new (
          type: string,
          eventInitDict?: CustomEventInit<Record<string, unknown>>
        ) => Event)
      : null);

  if (!EventCtor) return false;

  try {
    const event = new EventCtor(buildAdapterMoveResultEventName(input.modeKey), {
      detail: input.detail
    });
    target.dispatchEvent(event);
    return true;
  } catch (_err) {
    return false;
  }
}
