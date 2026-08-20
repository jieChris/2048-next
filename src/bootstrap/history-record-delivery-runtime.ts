export async function ensureHistoryRecordDeliveryRuntime(): Promise<void> {
  if (typeof window === "undefined" || (window as any).OnlineLeaderboardRuntime) return;
  (window as any).__DISABLE_ONLINE_LEADERBOARD__ = true;
  // @ts-expect-error Legacy browser runtime is intentionally loaded for its window side effect.
  await import("../../js/api_shared_utils.js");
  // @ts-expect-error Legacy browser runtime is intentionally loaded for its window side effect.
  await import("../../js/online_leaderboard_runtime.js");
}
