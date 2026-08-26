import { describe, expect, it, vi } from "vitest";
import {
  createAccountPaletteEditorController,
  type PaletteDraftOperation,
} from "../../src/features/palette/account-palette-editor";

const palette = {
  id: "palette-1",
  name: "Original",
  colors: ["#111111", "#222222"],
};

describe("account palette editor", () => {
  it("keeps pointer/input edits in the draft and submits only after explicit save", async () => {
    const submit = vi.fn(async () => ({
      status: "saved" as const,
      palette,
      revision: 4,
    }));
    const editor = createAccountPaletteEditorController({
      accountId: 42,
      paletteId: "palette-1",
      baseRevision: 3,
      saved: palette,
      createOperationId: () => "operation-1",
      hash: async () => "hash-1",
      submit,
    });

    editor.setDraft({ ...palette, colors: ["#abcdef", "#222222"] });
    expect(submit).not.toHaveBeenCalled();
    expect(editor.snapshot()).toMatchObject({ dirty: true, status: "dirty" });

    await expect(editor.save()).resolves.toMatchObject({ status: "saved" });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: "operation-1",
        requestHash: "hash-1",
        baseRevision: 3,
        palette: expect.objectContaining({ colors: ["#abcdef", "#222222"] }),
      }),
    );
    expect(editor.snapshot()).toMatchObject({
      dirty: false,
      baseRevision: 4,
      status: "saved",
    });
  });

  it("freezes an operation for retries and allocates a new operation after another edit", async () => {
    const operations: PaletteDraftOperation<typeof palette>[] = [];
    let attempts = 0;
    const editor = createAccountPaletteEditorController({
      accountId: 7,
      paletteId: "palette-1",
      baseRevision: 2,
      saved: palette,
      createOperationId: vi
        .fn()
        .mockReturnValueOnce("operation-1")
        .mockReturnValueOnce("operation-2"),
      hash: vi.fn(async (value) =>
        value && typeof value === "object" && "palette" in value
          ? JSON.stringify((value as { palette: unknown }).palette)
          : "hash",
      ),
      submit: async (operation) => {
        operations.push(operation);
        attempts += 1;
        if (attempts === 1) throw new Error("offline");
        return {
          status: "saved" as const,
          palette: operation.palette,
          revision: 3,
        };
      },
    });

    editor.setDraft({ ...palette, name: "First" });
    await expect(editor.save()).rejects.toThrow("offline");
    await expect(editor.retry()).resolves.toMatchObject({ status: "saved" });
    expect(operations[0]).toMatchObject({ operationId: "operation-1" });
    expect(operations[1]).toEqual(operations[0]);

    editor.setDraft({ ...palette, name: "Second" });
    await expect(editor.save()).resolves.toMatchObject({ status: "saved" });
    expect(operations[2]).toMatchObject({
      operationId: "operation-2",
      palette: { name: "Second" },
    });
  });

  it("creates a fresh frozen request when duplicate content is explicitly retained", async () => {
    const operations: PaletteDraftOperation<typeof palette>[] = [];
    const editor = createAccountPaletteEditorController({
      accountId: 42,
      paletteId: "palette-1",
      baseRevision: 3,
      saved: palette,
      createOperationId: vi
        .fn()
        .mockReturnValueOnce("operation-1")
        .mockReturnValueOnce("operation-2"),
      hash: async (value) => JSON.stringify(value),
      submit: async (operation) => {
        operations.push(operation);
        return operation.allowDuplicate
          ? {
              status: "saved" as const,
              palette: operation.palette,
              revision: 4,
            }
          : {
              status: "duplicate_existing" as const,
              existingPaletteId: "existing",
            };
      },
    });

    editor.setDraft({ ...palette, name: "Duplicate" });
    await expect(editor.save()).resolves.toMatchObject({
      status: "duplicate_existing",
    });
    await expect(editor.confirmDuplicate()).resolves.toMatchObject({
      status: "saved",
    });

    expect(operations).toHaveLength(2);
    expect(operations[0]).toMatchObject({
      operationId: "operation-1",
      allowDuplicate: false,
    });
    expect(operations[1]).toMatchObject({
      operationId: "operation-2",
      allowDuplicate: true,
    });
    expect(operations[1].requestHash).not.toBe(operations[0].requestHash);
  });
  it("does not allow leaving while a draft or local persistence failure is unresolved", async () => {
    const persist = vi.fn(async () => {
      throw new Error("quota");
    });
    const editor = createAccountPaletteEditorController({
      accountId: 1,
      paletteId: "palette-1",
      baseRevision: 1,
      saved: palette,
      createOperationId: () => "operation-1",
      hash: async () => "hash-1",
      persist,
      submit: vi.fn(),
    });

    editor.setDraft({ ...palette, name: "Changed" });
    expect(editor.canLeave()).toBe(false);
    await expect(editor.save()).rejects.toThrow("quota");
    expect(editor.snapshot()).toMatchObject({
      localPersistenceFailed: true,
      dirty: true,
    });
    expect(editor.canLeave()).toBe(false);
    editor.discardDraft();
    expect(editor.snapshot()).toMatchObject({ status: "clean", dirty: false });
    expect(editor.canLeave()).toBe(true);
  });
});
