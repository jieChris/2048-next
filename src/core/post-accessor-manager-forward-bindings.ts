export type PostAccessorManagerForwardBindingTarget = (...args: unknown[]) => unknown;

export const POST_ACCESSOR_MANAGER_FORWARD_BINDING_NAMES = [
  "readOptionValue",
  "resolveUndoPolicyStateForMode",
  "getUndoStateFallbackValues",
  "normalizeUndoStackEntry",
  "createUndoTileSnapshot",
  "normalizeSpawnTable",
  "normalizeModeConfig",
  "resolveModeConfig",
  "normalizeSpecialRules",
  "getActiveMoveDirections",
  "isDirectionAllowed",
  "isStoneValue",
  "useItem",
  "updateItemModeHud",
  "updateMoveTimeoutHud"
] as const;

export type PostAccessorManagerForwardBindingName =
  (typeof POST_ACCESSOR_MANAGER_FORWARD_BINDING_NAMES)[number];

export type PostAccessorManagerForwardBindingOperations = Partial<
  Record<PostAccessorManagerForwardBindingName, PostAccessorManagerForwardBindingTarget>
>;

export type PostAccessorManagerForwardBinding = [
  PostAccessorManagerForwardBindingName,
  PostAccessorManagerForwardBindingTarget | undefined
];

export interface PostAccessorManagerForwardBindingsRuntime {
  createPostAccessorManagerForwardBindings: typeof createPostAccessorManagerForwardBindings;
}

export interface PostAccessorManagerForwardBindingsWindowLike {
  CorePostAccessorManagerForwardBindingsRuntime?: PostAccessorManagerForwardBindingsRuntime;
}

export interface PostAccessorManagerForwardBindingsRuntimeInstallOptions {
  windowLike?: PostAccessorManagerForwardBindingsWindowLike | null;
}

export function createPostAccessorManagerForwardBindings(
  operations: PostAccessorManagerForwardBindingOperations
): PostAccessorManagerForwardBinding[] {
  return POST_ACCESSOR_MANAGER_FORWARD_BINDING_NAMES.map((name) => [name, operations[name]]);
}

export function createPostAccessorManagerForwardBindingsRuntime(): PostAccessorManagerForwardBindingsRuntime {
  return {
    createPostAccessorManagerForwardBindings
  };
}

export function installPostAccessorManagerForwardBindingsRuntime(
  options: PostAccessorManagerForwardBindingsRuntimeInstallOptions = {}
): PostAccessorManagerForwardBindingsRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as PostAccessorManagerForwardBindingsWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CorePostAccessorManagerForwardBindingsRuntime) {
    target.CorePostAccessorManagerForwardBindingsRuntime =
      createPostAccessorManagerForwardBindingsRuntime();
  }
  return target.CorePostAccessorManagerForwardBindingsRuntime;
}
