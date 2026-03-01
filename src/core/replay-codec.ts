export const REPLAY128_ASCII_START = 33;
export const REPLAY128_ASCII_COUNT = 94;
export const REPLAY128_TOTAL = 128;

export const REPLAY128_EXTRA_CODES: number[] = (() => {
  const codes: number[] = [];
  for (let c = 161; c <= 172; c += 1) codes.push(c);
  // Skip 173 (soft hyphen) because it is visually unstable in copy/paste.
  for (let c = 174; c <= 195; c += 1) codes.push(c);
  return codes;
})();

export function encodeReplay128(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code >= REPLAY128_TOTAL) {
    throw "Invalid replay code";
  }
  if (code < REPLAY128_ASCII_COUNT) {
    return String.fromCharCode(REPLAY128_ASCII_START + code);
  }
  return String.fromCharCode(REPLAY128_EXTRA_CODES[code - REPLAY128_ASCII_COUNT]);
}

export function decodeReplay128(char: string): number {
  if (!char || char.length !== 1) throw "Invalid replay char";
  const code = char.charCodeAt(0);
  if (code >= REPLAY128_ASCII_START && code < REPLAY128_ASCII_START + REPLAY128_ASCII_COUNT) {
    return code - REPLAY128_ASCII_START;
  }
  const extraIndex = REPLAY128_EXTRA_CODES.indexOf(code);
  if (extraIndex >= 0) return REPLAY128_ASCII_COUNT + extraIndex;
  throw "Invalid replay char";
}

export function encodeBoardV4(board: number[][]): string {
  if (!Array.isArray(board) || board.length !== 4) throw "Invalid initial board";
  let out = "";
  for (let y = 0; y < 4; y += 1) {
    if (!Array.isArray(board[y]) || board[y].length !== 4) throw "Invalid initial board row";
    for (let x = 0; x < 4; x += 1) {
      const value = board[y][x];
      if (!Number.isInteger(value) || value < 0) throw "Invalid board tile value";
      let exp = 0;
      if (value > 0) {
        const lg = Math.log(value) / Math.log(2);
        if (Math.floor(lg) !== lg) throw "Board tile is not power of two";
        exp = lg;
      }
      if (exp < 0 || exp >= REPLAY128_TOTAL) throw "Board tile exponent too large";
      out += encodeReplay128(exp);
    }
  }
  return out;
}

export function decodeBoardV4(encoded: string): number[][] {
  if (typeof encoded !== "string" || encoded.length !== 16) throw "Invalid encoded board";
  const rows: number[][] = [];
  let idx = 0;
  for (let y = 0; y < 4; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < 4; x += 1) {
      const exp = decodeReplay128(encoded.charAt(idx));
      idx += 1;
      row.push(exp === 0 ? 0 : Math.pow(2, exp));
    }
    rows.push(row);
  }
  return rows;
}

export function appendCompactMoveCode(input: { log?: unknown; rawCode?: unknown }): string {
  const source = input || {};
  const rawCode = Number(source.rawCode);
  if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
  const baseLog = typeof source.log === "string" ? source.log : "";
  if (rawCode < 127) return baseLog + encodeReplay128(rawCode);
  return baseLog + encodeReplay128(127) + encodeReplay128(0);
}

export function appendCompactUndo(log: unknown): string {
  const baseLog = typeof log === "string" ? log : "";
  return baseLog + encodeReplay128(127) + encodeReplay128(1);
}

export function appendCompactPracticeAction(input: {
  log?: unknown;
  width?: unknown;
  height?: unknown;
  x?: unknown;
  y?: unknown;
  value?: unknown;
}): string {
  const source = input || {};
  const width = Number(source.width);
  const height = Number(source.height);
  if (width !== 4 || height !== 4) throw "Compact practice replay only supports 4x4";

  const x = Number(source.x);
  const y = Number(source.y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
    throw "Invalid practice coords";
  }

  const value = Number(source.value);
  if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
  let exp = 0;
  if (value > 0) {
    const lg = Math.log(value) / Math.log(2);
    if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
    exp = lg;
  }
  if (exp < 0 || exp > 127) throw "Practice value exponent too large";

  const baseLog = typeof source.log === "string" ? source.log : "";
  const cell = (x << 2) | y;
  return (
    baseLog +
    encodeReplay128(127) +
    encodeReplay128(2) +
    encodeReplay128(cell) +
    encodeReplay128(exp)
  );
}
