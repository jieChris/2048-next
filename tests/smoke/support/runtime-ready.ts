import type { Page } from "@playwright/test";

export async function waitForWindowCondition(
  page: Page,
  predicate: () => boolean,
  timeout = 10_000
): Promise<void> {
  await page.waitForFunction(predicate, null, { timeout });
}

export async function waitForRankedMoveReady(page: Page, timeout = 12_000): Promise<void> {
  await waitForWindowCondition(
    page,
    () => {
      const manager = (window as any).game_manager;
      return (
        !!manager &&
        typeof manager.move === "function" &&
        manager.rankedSetupBlockedUntilSessionReady !== true &&
        manager.rankCheckpointRestorePending !== true &&
        manager.rankCheckpointApplying !== true &&
        manager.needsRankedCheckpointRestore !== true
      );
    },
    timeout
  );
}
