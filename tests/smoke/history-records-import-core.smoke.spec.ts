import { expect, test } from "@playwright/test";

test.describe("History smoke: import", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.confirm = () => true;
      (window as any).__historyImportMockText = "{\"records\":[]}";

      class MockFileReader {
        result: unknown = null;
        onload: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        readAsText(_file: unknown, _encoding?: string) {
          this.result = String((window as any).__historyImportMockText || "");
          if (typeof this.onload === "function") this.onload(new Event("load"));
        }
      }

      (window as any).FileReader = MockFileReader;

      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this && this.type === "file") return;
        return originalClick.apply(this);
      };
    });

    const response = await page.goto("/history.html", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.ok()).toBeTruthy();

    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      if (!store) throw new Error("LocalHistoryStore missing");
      store.clearAll();
    });
  });

  test("supports import merge", async ({ page }) => {
    await page.evaluate(() => {
      const diagnosticEntries = Array.from({ length: 9 }, (_item, index) => ({
        key: index === 0 ? "secondaryTimerPlacement" : "diag_entry_" + String(index),
        schemaVersion: 1,
        payload: {
          validPlacementDescriptors: 3 + index,
          placed: 2 + index,
          note: "n".repeat(220),
          dedupeKeySamples: Array.from({ length: 12 }, (_sample, sampleIndex) => "sample_" + String(index) + "_" + String(sampleIndex))
        }
      }));
      (window as any).__historyImportMockText = JSON.stringify({
        records: [
          {
            id: "import_merge_1",
            mode: "local",
            mode_key: "practice",
            board_width: 4,
            board_height: 4,
            ruleset: "pow2",
            undo_enabled: false,
            score: 256,
            best_tile: 64,
            duration_ms: 4000,
            final_board: [
              [2, 4, 8, 16],
              [32, 64, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ],
            ended_at: new Date().toISOString(),
            replay_string: "",
            diagnostics_index_entries: diagnosticEntries
          }
        ]
      });

      const input = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!input) throw new Error("import input missing");
      const fakeFile = { name: "history.json" };
      Object.defineProperty(input, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });
    });

    await page.click("#history-import-btn");
    await page.dispatchEvent("#history-import-file", "change");
    await expect(page.locator(".history-item")).toHaveCount(1);

    const snapshot = await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      const record = store.getById("import_merge_1");
      const entries = Array.isArray(record?.diagnostics_index_entries) ? record.diagnostics_index_entries : [];
      const firstPayload = entries[0]?.payload || {};
      const firstNote = String(firstPayload.note || "");
      const firstSamples = Array.isArray(firstPayload.dedupeKeySamples) ? firstPayload.dedupeKeySamples : [];
      return {
        entryCount: entries.length,
        firstKey: String(entries[0]?.key || ""),
        firstNoteLength: firstNote.length,
        firstSampleCount: firstSamples.length
      };
    });

    expect(snapshot.entryCount).toBe(6);
    expect(snapshot.firstKey).toBe("secondaryTimerPlacement");
    expect(snapshot.firstNoteLength).toBe(160);
    expect(snapshot.firstSampleCount).toBe(8);
  });

  test("supports import replace", async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).LocalHistoryStore;
      store.saveRecord({
        id: "existing_1",
        mode: "local",
        mode_key: "standard_4x4_pow2_no_undo",
        board_width: 4,
        board_height: 4,
        score: 100,
        best_tile: 16,
        duration_ms: 1000,
        final_board: [],
        ended_at: new Date().toISOString(),
        replay_string: ""
      });

      (window as any).__historyImportMockText = JSON.stringify({
        records: [
          {
            id: "replace_1",
            mode: "local",
            mode_key: "practice",
            board_width: 4,
            board_height: 4,
            score: 777,
            best_tile: 128,
            duration_ms: 9999,
            final_board: [],
            ended_at: new Date().toISOString(),
            replay_string: "",
            diagnostics_index_entries: [
              {
                key: "secondaryTimerPlacement",
                schemaVersion: 1,
                payload: {
                  validPlacementDescriptors: 5,
                  placed: 4,
                  skippedDuplicate: 1
                }
              }
            ]
          }
        ]
      });

      const input = document.querySelector("#history-import-file") as HTMLInputElement | null;
      if (!input) throw new Error("import input missing");
      const fakeFile = { name: "replace.json" };
      Object.defineProperty(input, "files", {
        configurable: true,
        get() {
          return {
            0: fakeFile,
            length: 1,
            item(index: number) {
              return index === 0 ? fakeFile : null;
            }
          };
        }
      });
    });

    await page.click("#history-import-replace-btn");
    await page.dispatchEvent("#history-import-file", "change");
    await expect(page.locator(".history-item")).toHaveCount(1);

    const snapshot = await page.evaluate(() => {
      const all = (window as any).LocalHistoryStore.getAll();
      return {
        count: all.length,
        modeKey: all[0]?.mode_key,
        score: all[0]?.score,
        diagnosticsKey: all[0]?.diagnostics_index_entries?.[0]?.key || null
      };
    });

    expect(snapshot.count).toBe(1);
    expect(snapshot.modeKey).toBe("practice");
    expect(snapshot.score).toBe(777);
    expect(snapshot.diagnosticsKey).toBe("secondaryTimerPlacement");
  });
});
