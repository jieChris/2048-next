import { resolveSavedPayloadRichnessScore } from "./saved-payload-richness";

export interface SavedPayloadCandidateRuntime {
  resolveLatestSavedPayloadCandidate: typeof resolveLatestSavedPayloadCandidate;
}

export interface SavedPayloadCandidateWindowLike {
  CoreSavedPayloadCandidateRuntime?: SavedPayloadCandidateRuntime;
}

export interface SavedPayloadCandidateRuntimeInstallOptions {
  windowLike?: SavedPayloadCandidateWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function areScoresCompatibleForPosition(leftScore: unknown, rightScore: unknown): boolean {
  const left = Number(leftScore);
  const right = Number(rightScore);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return true;
  return left === right;
}

function areBoardRowsEqual(leftRow: unknown, rightRow: unknown): boolean {
  if (!Array.isArray(leftRow) || !Array.isArray(rightRow)) return false;
  if (leftRow.length !== rightRow.length) return false;
  return leftRow.every((value, index) => Number(value) === Number(rightRow[index]));
}

function areBoardsEqual(leftBoard: unknown, rightBoard: unknown): boolean {
  if (!Array.isArray(leftBoard) || !Array.isArray(rightBoard)) return false;
  if (leftBoard.length !== rightBoard.length) return false;
  return leftBoard.every((row, index) => areBoardRowsEqual(row, rightBoard[index]));
}

function arePayloadsSamePosition(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  if (String(left.mode_key || "") !== String(right.mode_key || "")) return false;
  if (!areScoresCompatibleForPosition(left.score, right.score)) return false;
  return areBoardsEqual(left.board, right.board);
}

function shouldPreferNewerPayload(best: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const bestRichness = resolveSavedPayloadRichnessScore(best);
  const nextRichness = resolveSavedPayloadRichnessScore(next);
  if (nextRichness < bestRichness && arePayloadsSamePosition(best, next)) return false;
  return true;
}

export function resolveLatestSavedPayloadCandidate(candidates: unknown): Record<string, unknown> | null {
  if (!Array.isArray(candidates)) return null;
  let best: Record<string, unknown> | null = null;
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    if (!best) {
      best = candidate;
      continue;
    }
    const bestAt = Number(best.saved_at) || 0;
    const nextAt = Number(candidate.saved_at) || 0;
    if (nextAt > bestAt && shouldPreferNewerPayload(best, candidate)) {
      best = candidate;
    } else if (nextAt === bestAt && resolveSavedPayloadRichnessScore(candidate) > resolveSavedPayloadRichnessScore(best)) {
      best = candidate;
    }
  }
  return best;
}

export function createSavedPayloadCandidateRuntime(): SavedPayloadCandidateRuntime {
  return {
    resolveLatestSavedPayloadCandidate
  };
}

export function installSavedPayloadCandidateRuntime(
  options: SavedPayloadCandidateRuntimeInstallOptions = {}
): SavedPayloadCandidateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedPayloadCandidateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedPayloadCandidateRuntime) {
    target.CoreSavedPayloadCandidateRuntime = createSavedPayloadCandidateRuntime();
  }
  return target.CoreSavedPayloadCandidateRuntime;
}
