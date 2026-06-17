export interface FallbackModeConfig {
  key: string;
  label: string;
  board_width: number;
  board_height: number;
  ruleset: "pow2";
  undo_enabled: boolean;
  max_tile: number | null;
  spawn_table: Array<{ value: number; weight: number }>;
  ranked_bucket: string;
  mode_family?: string;
  special_rules?: Record<string, unknown>;
  rank_policy?: string;
}

export type FallbackModeConfigMap = Record<string, FallbackModeConfig>;

export interface FallbackModeConfigsRuntime {
  createGameManagerFallbackPow2VariantModeConfigs: typeof createGameManagerFallbackPow2VariantModeConfigs;
}

export interface FallbackModeConfigsRuntimeWindowLike {
  CoreFallbackModeConfigsRuntime?: FallbackModeConfigsRuntime;
}

export interface FallbackModeConfigsRuntimeInstallOptions {
  windowLike?: FallbackModeConfigsRuntimeWindowLike | null;
}

function createPow2ModeConfig(
  key: string,
  label: string,
  boardWidth: number,
  boardHeight: number,
  spawnTable: Array<{ value: number; weight: number }> = [
    { value: 2, weight: 90 },
    { value: 4, weight: 10 }
  ]
): FallbackModeConfig {
  return {
    key,
    label,
    board_width: boardWidth,
    board_height: boardHeight,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: null,
    spawn_table: spawnTable,
    ranked_bucket: "none"
  };
}

function applyUnrankedPow2Defaults(config: FallbackModeConfig): FallbackModeConfig {
  config.mode_family = "pow2";
  config.special_rules = {};
  config.rank_policy = "unranked";
  return config;
}

function createUnrankedPow2Variant(
  key: string,
  label: string,
  boardWidth: number,
  boardHeight: number
): FallbackModeConfig {
  return applyUnrankedPow2Defaults(createPow2ModeConfig(key, label, boardWidth, boardHeight));
}

export function createGameManagerFallbackPow2VariantModeConfigs(): FallbackModeConfigMap {
  const spawn50 = applyUnrankedPow2Defaults(
    createPow2ModeConfig("spawn50_3x3_pow2_no_undo", "3x3 Spawn 50/50 (No Undo)", 3, 3, [
      { value: 2, weight: 50 },
      { value: 4, weight: 50 }
    ])
  );
  const diag3NoUndo = createUnrankedPow2Variant("diag_3x3_pow2_no_undo", "Diagonal 3x3 (No Undo)", 3, 3);
  const diag4NoUndo = createUnrankedPow2Variant("diag_4x4_pow2_no_undo", "Diagonal 4x4 (No Undo)", 4, 4);
  const diag4x3NoUndo = createUnrankedPow2Variant("diag_3x4_pow2_no_undo", "Diagonal 4x3 (No Undo)", 4, 3);
  const diag4x2NoUndo = createUnrankedPow2Variant("diag_2x4_pow2_no_undo", "Diagonal 4x2 (No Undo)", 4, 2);
  const itemNoUndo = createUnrankedPow2Variant("item_4x4_pow2_no_undo", "Item Mode 4x4 (No Undo)", 4, 4);
  const stoneNoUndo = createUnrankedPow2Variant("stone_4x4_pow2_no_undo", "Stone Mode 4x4 (No Undo)", 4, 4);
  const timed5sNoUndo = createUnrankedPow2Variant("timed5s_4x4_pow2_no_undo", "Timed 5s 4x4 (No Undo)", 4, 4);
  const noXNoUndo = createUnrankedPow2Variant("nox_4x4_pow2_no_undo", "NO X 4x4 (No Undo)", 4, 4);

  diag3NoUndo.special_rules = { allow_diagonal_moves: true };
  diag4NoUndo.special_rules = { allow_diagonal_moves: true };
  diag4x3NoUndo.special_rules = { allow_diagonal_moves: true };
  diag4x2NoUndo.special_rules = { allow_diagonal_moves: true };
  itemNoUndo.mode_family = "item";
  itemNoUndo.special_rules = { item_mode: { enabled: true, grant_every_moves: 6, max_per_item: 3 } };
  stoneNoUndo.mode_family = "stone";
  stoneNoUndo.special_rules = { stone_tiles: [[1, 1], [2, 2]] };
  timed5sNoUndo.mode_family = "timed";
  timed5sNoUndo.special_rules = { move_timeout_ms: 5000 };
  noXNoUndo.special_rules = { no_x_enabled: true, no_x_target: null };

  return {
    spawn50_3x3_pow2_no_undo: spawn50,
    diag_3x3_pow2_no_undo: diag3NoUndo,
    diag_4x4_pow2_no_undo: diag4NoUndo,
    diag_3x4_pow2_no_undo: diag4x3NoUndo,
    diag_2x4_pow2_no_undo: diag4x2NoUndo,
    item_4x4_pow2_no_undo: itemNoUndo,
    stone_4x4_pow2_no_undo: stoneNoUndo,
    timed5s_4x4_pow2_no_undo: timed5sNoUndo,
    nox_4x4_pow2_no_undo: noXNoUndo
  };
}

export function createFallbackModeConfigsRuntime(): FallbackModeConfigsRuntime {
  return {
    createGameManagerFallbackPow2VariantModeConfigs
  };
}

export function installFallbackModeConfigsRuntime(
  options: FallbackModeConfigsRuntimeInstallOptions = {}
): FallbackModeConfigsRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as FallbackModeConfigsRuntimeWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreFallbackModeConfigsRuntime) {
    target.CoreFallbackModeConfigsRuntime = createFallbackModeConfigsRuntime();
  }
  return target.CoreFallbackModeConfigsRuntime;
}
