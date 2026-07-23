// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  mountBoard,
  resolveSwipeDirection,
} from "../../mobile/src/game/board-view";
import { createEngineSession } from "../../src/core/engine";

describe("mobile board view", () => {
  it("limits tile keyframe animations to transform and opacity", () => {
    const css = readFileSync(
      resolve(process.cwd(), "mobile/src/styles/game-board.css"),
      "utf8",
    );
    const keyframeSections = css
      .split(/(?=@(?:keyframes|media)\b)/u)
      .filter((section) => section.startsWith("@keyframes game-tile-"));

    expect(keyframeSections).toHaveLength(2);
    const animatedProperties = new Set<string>();
    for (const section of keyframeSections) {
      const sectionProperties = [...section.matchAll(/^\s*([a-z-]+)\s*:/gmu)]
        .map((match) => match[1]);
      expect(sectionProperties.length).toBeGreaterThan(0);
      expect(
        sectionProperties.every(
          (property) => property === "opacity" || property === "transform",
        ),
      ).toBe(true);
      sectionProperties.forEach((property) => animatedProperties.add(property));
    }
    expect(animatedProperties).toEqual(new Set(["opacity", "transform"]));
  });

  it.each([
    [0, -30, 12, 0],
    [30, 0, 12, 1],
    [0, 30, 12, 2],
    [-30, 0, 12, 3],
    [9, 8, 12, null],
    [18, 18, 12, null],
  ] as const)(
    "maps swipe (%s,%s) at threshold %s to %s",
    (deltaX, deltaY, threshold, expected) => {
      expect(resolveSwipeDirection(deltaX, deltaY, threshold)).toBe(expected);
    },
  );

  it("keeps all background and tile node identities across transitions", async () => {
    const root = document.createElement("div");
    Object.defineProperty(root, "clientWidth", { value: 320 });
    const engine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 2048,
    });
    const initial = engine.init({
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const view = mountBoard(root, initial, {
      isInputLocked: () => false,
      onDirection: vi.fn(),
      reducedMotion: () => true,
    });
    const cells = [...root.querySelectorAll("[data-board-cell]")];
    const tiles = [...root.querySelectorAll("[data-board-tile]")];

    expect(cells).toHaveLength(16);
    expect(tiles).toHaveLength(16);
    const transition = engine.move({ direction: 1, atMs: 100 });
    expect(transition.moved).toBe(true);
    await view.apply(transition);

    expect([...root.querySelectorAll("[data-board-cell]")]).toEqual(cells);
    expect([...root.querySelectorAll("[data-board-tile]")]).toEqual(tiles);
    const visibleValues = tiles
      .filter((tile) => !tile.hasAttribute("hidden"))
      .map((tile) => Number(tile.getAttribute("data-value")))
      .sort((left, right) => left - right);
    expect(visibleValues).toEqual(
      transition.state.board
        .flat()
        .filter((value) => value > 0)
        .sort((left, right) => left - right),
    );
  });

  it("routes keyboard directions only while input is available", () => {
    const root = document.createElement("div");
    const onDirection = vi.fn();
    let locked = false;
    const engine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 1,
    });
    const view = mountBoard(root, engine.init(), {
      isInputLocked: () => locked,
      onDirection,
      reducedMotion: () => true,
    });

    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    locked = true;
    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );

    expect(onDirection).toHaveBeenCalledTimes(1);
    expect(onDirection).toHaveBeenCalledWith(3);
    view.destroy();
    locked = false;
    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);
  });

  it("uses one primary pointer gesture and rechecks the input fence on release", () => {
    const root = document.createElement("div");
    Object.defineProperty(root, "clientWidth", { value: 320 });
    const onDirection = vi.fn();
    let locked = false;
    const engine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 2,
    });
    const view = mountBoard(root, engine.init(), {
      isInputLocked: () => locked,
      onDirection,
      reducedMotion: () => true,
    });
    const pointer = (
      type: string,
      values: {
        pointerId: number;
        clientX: number;
        clientY: number;
        isPrimary?: boolean;
      },
    ): Event => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: values.pointerId },
        clientX: { value: values.clientX },
        clientY: { value: values.clientY },
        isPrimary: { value: values.isPrimary ?? true },
        button: { value: 0 },
      });
      return event;
    };

    root.dispatchEvent(
      pointer("pointerdown", { pointerId: 1, clientX: 20, clientY: 50 }),
    );
    root.dispatchEvent(
      pointer("pointerup", { pointerId: 1, clientX: 80, clientY: 52 }),
    );
    expect(onDirection).toHaveBeenLastCalledWith(1);

    root.dispatchEvent(
      pointer("pointerdown", { pointerId: 2, clientX: 80, clientY: 50 }),
    );
    locked = true;
    root.dispatchEvent(
      pointer("pointerup", { pointerId: 2, clientX: 20, clientY: 50 }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);

    locked = false;
    root.dispatchEvent(
      pointer("pointerdown", {
        pointerId: 3,
        clientX: 50,
        clientY: 80,
        isPrimary: false,
      }),
    );
    root.dispatchEvent(
      pointer("pointerup", { pointerId: 3, clientX: 50, clientY: 20 }),
    );
    expect(onDirection).toHaveBeenCalledTimes(1);
    view.destroy();
  });

  it("cancels finished WAAPI effects before committing the final board", async () => {
    const root = document.createElement("div");
    Object.defineProperty(root, "clientWidth", { value: 320 });
    root.getBoundingClientRect = () => ({ width: 320 }) as DOMRect;
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "animate",
    );
    const cancels: Array<ReturnType<typeof vi.fn>> = [];
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => {
        const cancel = vi.fn();
        cancels.push(cancel);
        return {
          cancel,
          finished: Promise.resolve(),
        } as unknown as Animation;
      }),
    });

    try {
      const engine = createEngineSession({
        modeKey: "standard_4x4_pow2_no_undo",
        seed: 3,
      });
      const initial = engine.init({
        board: [
          [2, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      });
      const view = mountBoard(root, initial, {
        isInputLocked: () => false,
        onDirection: vi.fn(),
        reducedMotion: () => false,
      });
      const transition = engine.move({ direction: 1, atMs: 100 });
      await view.apply(transition);

      expect(cancels.length).toBeGreaterThan(0);
      expect(cancels.every((cancel) => cancel.mock.calls.length === 1)).toBe(
        true,
      );
      const spawnCell = transition.spawn
        ? transition.spawn.y * 4 + transition.spawn.x
        : -1;
      expect(
        root.querySelector<HTMLElement>(
          `[data-board-tile="${String(spawnCell)}"]`,
        )?.dataset.value,
      ).toBe(String(transition.spawn?.value));
      view.destroy();
    } finally {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, "animate", descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "animate");
      }
    }
  });

  it("keeps an explicit visual tier for six-digit and higher tiles", () => {
    const root = document.createElement("div");
    const engine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 4,
    });
    const state = engine.init({
      board: [
        [131_072, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const view = mountBoard(root, state, {
      isInputLocked: () => false,
      onDirection: vi.fn(),
      reducedMotion: () => true,
    });

    expect(root.querySelector('[data-board-tile="0"]')).toMatchObject({
      dataset: expect.objectContaining({
        digits: "long",
        tier: "ultra",
        value: "131072",
      }),
    });
    view.destroy();
  });
});
