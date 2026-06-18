import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerClientRecordIdRuntime,
  installGameManagerClientRecordIdRuntime,
  type GameManagerClientRecordIdRuntimeWindowLike
} from "../../src/bootstrap/game-manager-client-record-id-runtime";
import {
  assignManagerClientRecordId,
  buildClientRecordIdRandomSuffix,
  createManagerClientRecordId,
  resolveManagerClientRecordId
} from "../../src/core/game-manager-client-record-id";

describe("game manager client record id runtime installer", () => {
  it("creates the legacy global function shape from TypeScript helpers", () => {
    const runtime = createGameManagerClientRecordIdRuntime();

    expect(runtime.createManagerClientRecordId).toBe(createManagerClientRecordId);
    expect(runtime.buildClientRecordIdRandomSuffix).toBe(buildClientRecordIdRandomSuffix);
    expect(runtime.assignManagerClientRecordId).toBe(assignManagerClientRecordId);
    expect(runtime.resolveManagerClientRecordId).toBe(resolveManagerClientRecordId);
  });

  it("installs missing legacy global functions on a supplied window-like object", () => {
    const windowLike: GameManagerClientRecordIdRuntimeWindowLike = {};

    const installed = installGameManagerClientRecordIdRuntime({ windowLike });

    expect(installed).not.toBeNull();
    expect(windowLike.CoreGameManagerClientRecordIdRuntime).toBe(installed);
    expect(windowLike.createManagerClientRecordId).toBe(createManagerClientRecordId);
    expect(windowLike.buildClientRecordIdRandomSuffix).toBe(buildClientRecordIdRandomSuffix);
    expect(windowLike.assignManagerClientRecordId).toBe(assignManagerClientRecordId);
    expect(windowLike.resolveManagerClientRecordId).toBe(resolveManagerClientRecordId);
  });

  it("does not overwrite existing legacy global function properties", () => {
    const existingCreate = vi.fn(() => "rec_existing");
    const existingAssign = vi.fn(() => "rec_assigned");
    const existingResolve = vi.fn(() => "rec_resolved");
    const windowLike: GameManagerClientRecordIdRuntimeWindowLike = {
      createManagerClientRecordId: existingCreate,
      assignManagerClientRecordId: existingAssign,
      resolveManagerClientRecordId: existingResolve
    };

    const installed = installGameManagerClientRecordIdRuntime({ windowLike });

    expect(installed?.createManagerClientRecordId).toBe(existingCreate);
    expect(installed?.assignManagerClientRecordId).toBe(existingAssign);
    expect(installed?.resolveManagerClientRecordId).toBe(existingResolve);
    expect(windowLike.createManagerClientRecordId).toBe(existingCreate);
    expect(windowLike.assignManagerClientRecordId).toBe(existingAssign);
    expect(windowLike.resolveManagerClientRecordId).toBe(existingResolve);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGameManagerClientRecordIdRuntime({ windowLike: null })).toBeNull();
  });
});
