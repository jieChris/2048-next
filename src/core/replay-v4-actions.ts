import { decodeReplay128 } from "./replay-codec";

export interface ReplayV4Spawn {
  x: number;
  y: number;
  value: number;
}

export type ReplayV4Move = number | ["p", number, number, number];

export interface ReplayV4ActionsResult {
  replayMoves: ReplayV4Move[];
  replaySpawns: Array<ReplayV4Spawn | null>;
}

function decodeMoveSpawnCode(rawCode: number): { move: number; spawn: ReplayV4Spawn } {
  const dir = (rawCode >> 5) & 3;
  const is4 = (rawCode >> 4) & 1;
  const posIdx = rawCode & 15;
  const x = posIdx % 4;
  const y = Math.floor(posIdx / 4);
  return {
    move: dir,
    spawn: { x, y, value: is4 ? 4 : 2 }
  };
}

export function decodeReplayV4Actions(actionsEncoded: string): ReplayV4ActionsResult {
  const replayMoves: ReplayV4Move[] = [];
  const replaySpawns: Array<ReplayV4Spawn | null> = [];

  let i = 0;
  while (i < actionsEncoded.length) {
    const token = decodeReplay128(actionsEncoded.charAt(i));
    i += 1;
    if (token < 127) {
      const decoded = decodeMoveSpawnCode(token);
      replayMoves.push(decoded.move);
      replaySpawns.push(decoded.spawn);
      continue;
    }
    if (i >= actionsEncoded.length) throw "Invalid v4C escape";
    const subtype = decodeReplay128(actionsEncoded.charAt(i));
    i += 1;
    if (subtype === 0) {
      const decoded127 = decodeMoveSpawnCode(127);
      replayMoves.push(decoded127.move);
      replaySpawns.push(decoded127.spawn);
    } else if (subtype === 1) {
      replayMoves.push(-1);
      replaySpawns.push(null);
    } else if (subtype === 2) {
      if (i + 1 >= actionsEncoded.length) throw "Invalid v4C practice action";
      const cell = decodeReplay128(actionsEncoded.charAt(i));
      i += 1;
      const exp = decodeReplay128(actionsEncoded.charAt(i));
      i += 1;
      if (cell < 0 || cell > 15) throw "Invalid v4C practice cell";
      const px = (cell >> 2) & 3;
      const py = cell & 3;
      const value = exp === 0 ? 0 : Math.pow(2, exp);
      replayMoves.push(["p", px, py, value]);
      replaySpawns.push(null);
    } else {
      throw "Unknown v4C escape subtype";
    }
  }

  return { replayMoves, replaySpawns };
}
