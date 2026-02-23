export interface ReplayLegacySpawn {
  x: number;
  y: number;
  value: number;
}

export interface ReplayLegacyDecodeResult {
  seed: number;
  replayMoves: number[];
  replaySpawns: Array<ReplayLegacySpawn | null> | null;
  replayMovesV2?: string;
}

const REPLAY_V1_REVERSE_MAPPING: Record<string, number> = {
  U: 0,
  R: 1,
  D: 2,
  L: 3,
  Z: -1
};

export function decodeReplayV1Moves(movesString: string): number[] {
  return movesString.split("").map((char) => {
    const value = REPLAY_V1_REVERSE_MAPPING[char];
    if (value === undefined) throw "Invalid move char: " + char;
    return value;
  });
}

export function decodeReplayV2Log(logString: string): {
  replayMoves: number[];
  replaySpawns: Array<ReplayLegacySpawn | null>;
} {
  const replayMoves: number[] = [];
  const replaySpawns: Array<ReplayLegacySpawn | null> = [];

  for (let i = 0; i < logString.length; i++) {
    const code = logString.charCodeAt(i) - 33;
    if (code < 0 || code > 128) {
      throw "Invalid replay char at index " + i;
    }
    if (code === 128) {
      replayMoves.push(-1);
      replaySpawns.push(null);
      continue;
    }
    const dir = (code >> 5) & 3;
    const is4 = (code >> 4) & 1;
    const posIdx = code & 15;
    const x = posIdx % 4;
    const y = Math.floor(posIdx / 4);
    replayMoves.push(dir);
    replaySpawns.push({ x, y, value: is4 ? 4 : 2 });
  }

  return {
    replayMoves,
    replaySpawns
  };
}

export function decodeLegacyReplay(trimmedReplayString: string): ReplayLegacyDecodeResult | null {
  if (trimmedReplayString.indexOf("REPLAY_v1_") === 0) {
    const v1Parts = trimmedReplayString.split("_");
    const seed = parseFloat(v1Parts[2]);
    const movesString = v1Parts[3] as string;
    return {
      seed,
      replayMoves: decodeReplayV1Moves(movesString),
      replaySpawns: null
    };
  }

  if (trimmedReplayString.indexOf("REPLAY_v2S_") === 0) {
    const prefix = "REPLAY_v2S_";
    const rest = trimmedReplayString.substring(prefix.length);
    const seedSep = rest.indexOf("_");
    if (seedSep < 0) throw "Invalid v2S format";

    const seed = parseFloat(rest.substring(0, seedSep));
    if (isNaN(seed)) throw "Invalid v2S seed";

    const replayMovesV2 = rest.substring(seedSep + 1);
    const decoded = decodeReplayV2Log(replayMovesV2);
    return {
      seed,
      replayMoves: decoded.replayMoves,
      replaySpawns: decoded.replaySpawns,
      replayMovesV2
    };
  }

  if (trimmedReplayString.indexOf("REPLAY_v2_") === 0) {
    const prefix = "REPLAY_v2_";
    const replayMovesV2 = trimmedReplayString.substring(prefix.length);
    const decoded = decodeReplayV2Log(replayMovesV2);
    return {
      seed: 0.123,
      replayMoves: decoded.replayMoves,
      replaySpawns: decoded.replaySpawns,
      replayMovesV2
    };
  }

  return null;
}
