(function (global) {
  "use strict";

  if (!global) return;

  var REPLAY128_ASCII_START = 33;
  var REPLAY128_ASCII_COUNT = 94;
  var REPLAY128_TOTAL = 128;
  var REPLAY_V1_MAGIC = "RPL1";
  var REPLAY_V1_FLAG_HAS_START_UNIX_MS = 1 << 0;
  var REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS = 1 << 1;
  var REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS = 1 << 2;
  var REPLAY_V1_FLAG_EXTENDED_INIT_TILES = 1 << 3;
  var REPLAY_V1_RECORD_UNDO1 = 0x80;
  var REPLAY_V1_RECORD_UNDON = 0x81;
  var REPLAY_V1_RECORD_CHECKPOINT = 0x82;
  var REPLAY_V1_RECORD_EXT = 0x83;
  var REPLAY_V1_RECORD_END = 0x84;
  var REPLAY_V1_RECORD_MOVE8 = 0x85;
  var REPLAY_V1_EXT_EXACT_SPAWN = 8;
  var REPLAY128_EXTRA_CODES = (function () {
    var codes = [];
    var c;
    for (c = 161; c <= 172; c++) codes.push(c);
    for (c = 174; c <= 195; c++) codes.push(c);
    return codes;
  })();
  var CRC32_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var crc = i;
      for (var j = 0; j < 8; j++) {
        crc = (crc & 1) !== 0 ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      table[i] = crc >>> 0;
    }
    return table;
  })();

  function encodeReplay128(code) {
    if (!Number.isInteger(code) || code < 0 || code >= REPLAY128_TOTAL) {
      throw "Invalid replay code";
    }
    if (code < REPLAY128_ASCII_COUNT) {
      return String.fromCharCode(REPLAY128_ASCII_START + code);
    }
    return String.fromCharCode(REPLAY128_EXTRA_CODES[code - REPLAY128_ASCII_COUNT]);
  }

  function decodeReplay128(char) {
    if (!char || char.length !== 1) throw "Invalid replay char";
    var code = char.charCodeAt(0);
    if (code >= REPLAY128_ASCII_START && code < REPLAY128_ASCII_START + REPLAY128_ASCII_COUNT) {
      return code - REPLAY128_ASCII_START;
    }
    var extraIndex = REPLAY128_EXTRA_CODES.indexOf(code);
    if (extraIndex >= 0) return REPLAY128_ASCII_COUNT + extraIndex;
    throw "Invalid replay char";
  }

  function encodeBoardV4(board) {
    if (!Array.isArray(board) || board.length !== 4) throw "Invalid initial board";
    var out = "";
    var y;
    var x;
    for (y = 0; y < 4; y++) {
      if (!Array.isArray(board[y]) || board[y].length !== 4) throw "Invalid initial board row";
      for (x = 0; x < 4; x++) {
        var value = board[y][x];
        if (!Number.isInteger(value) || value < 0) throw "Invalid board tile value";
        var exp = 0;
        if (value > 0) {
          var lg = Math.log(value) / Math.log(2);
          if (Math.floor(lg) !== lg) throw "Board tile is not power of two";
          exp = lg;
        }
        if (exp < 0 || exp >= REPLAY128_TOTAL) throw "Board tile exponent too large";
        out += encodeReplay128(exp);
      }
    }
    return out;
  }

  function decodeBoardV4(encoded) {
    if (typeof encoded !== "string" || encoded.length !== 16) throw "Invalid encoded board";
    var rows = [];
    var idx = 0;
    var y;
    var x;
    for (y = 0; y < 4; y++) {
      var row = [];
      for (x = 0; x < 4; x++) {
        var exp = decodeReplay128(encoded.charAt(idx));
        idx += 1;
        row.push(exp === 0 ? 0 : Math.pow(2, exp));
      }
      rows.push(row);
    }
    return rows;
  }

  function appendCompactMoveCode(input) {
    var source = input || {};
    var rawCode = Number(source.rawCode);
    if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
    var baseLog = typeof source.log === "string" ? source.log : "";
    if (rawCode < 127) return baseLog + encodeReplay128(rawCode);
    return baseLog + encodeReplay128(127) + encodeReplay128(0);
  }

  function appendCompactUndo(log) {
    var baseLog = typeof log === "string" ? log : "";
    return baseLog + encodeReplay128(127) + encodeReplay128(1);
  }

  function appendCompactPracticeAction(input) {
    var source = input || {};
    var width = Number(source.width);
    var height = Number(source.height);
    if (width !== 4 || height !== 4) throw "Compact practice replay only supports 4x4";

    var x = Number(source.x);
    var y = Number(source.y);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
      throw "Invalid practice coords";
    }

    var value = Number(source.value);
    if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
    var exp = 0;
    if (value > 0) {
      var lg = Math.log(value) / Math.log(2);
      if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
      exp = lg;
    }
    if (exp < 0 || exp > 127) throw "Practice value exponent too large";

    var baseLog = typeof source.log === "string" ? source.log : "";
    var cell = (x << 2) | y;
    return (
      baseLog +
      encodeReplay128(127) +
      encodeReplay128(2) +
      encodeReplay128(cell) +
      encodeReplay128(exp)
    );
  }

  function toUint8Array(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return new Uint8Array(data || []);
  }

  function assertIntegerRange(value, min, max, message) {
    if (!Number.isInteger(value) || value < min || value > max) throw message;
    return value;
  }

  function clampNonNegativeInt(value, message) {
    if (!Number.isFinite(value) || value < 0) throw message;
    return Math.floor(value);
  }

  function encodeUleb128(value) {
    var normalized = clampNonNegativeInt(value, "Invalid ULEB128 value");
    if (normalized === 0) return [0];
    var out = [];
    var current = normalized;
    while (current > 0) {
      var byte = current & 0x7f;
      current = Math.floor(current / 128);
      if (current > 0) out.push((byte | 0x80) & 0xff);
      else out.push(byte & 0xff);
    }
    return out;
  }

  function decodeUleb128(bytesLike, offset) {
    var bytes = toUint8Array(bytesLike);
    var value = 0;
    var shift = 0;
    var cursor = Number(offset) || 0;
    while (cursor < bytes.length) {
      var byte = bytes[cursor];
      cursor += 1;
      value += (byte & 0x7f) * Math.pow(2, shift);
      if ((byte & 0x80) === 0) {
        return {
          value: Math.floor(value),
          nextOffset: cursor
        };
      }
      shift += 7;
      if (shift > 56) throw "ULEB128 value is too large";
    }
    throw "Unexpected EOF while decoding ULEB128";
  }

  function computeCrc32(bytesLike) {
    var bytes = toUint8Array(bytesLike);
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function encodeReplayV1PackedBoardCodes(width, height, boardCodes) {
    var cellCount = width * height;
    if (!Array.isArray(boardCodes) || boardCodes.length !== cellCount) {
      throw "Invalid replay v1 checkpoint board codes";
    }
    var totalBits = cellCount * 5;
    var totalBytes = Math.ceil(totalBits / 8);
    var out = new Uint8Array(totalBytes);
    var bitCursor = 0;
    for (var i = 0; i < boardCodes.length; i++) {
      var code = assertIntegerRange(Number(boardCodes[i]), 0, 31, "Invalid replay v1 checkpoint board code");
      for (var bit = 0; bit < 5; bit++) {
        if (((code >> bit) & 1) === 0) continue;
        var targetBit = bitCursor + bit;
        var byteIndex = Math.floor(targetBit / 8);
        var bitIndex = targetBit % 8;
        out[byteIndex] |= 1 << bitIndex;
      }
      bitCursor += 5;
    }
    return Array.prototype.slice.call(out);
  }

  function decodeReplayV1PackedBoardCodes(width, height, payload) {
    var cellCount = width * height;
    var totalBits = cellCount * 5;
    var totalBytes = Math.ceil(totalBits / 8);
    if (payload.length !== totalBytes) throw "Invalid replay v1 checkpoint payload length";
    var out = [];
    var bitCursor = 0;
    for (var i = 0; i < cellCount; i++) {
      var code = 0;
      for (var bit = 0; bit < 5; bit++) {
        var sourceBit = bitCursor + bit;
        var byteIndex = Math.floor(sourceBit / 8);
        var bitIndex = sourceBit % 8;
        var bitValue = (payload[byteIndex] >> bitIndex) & 1;
        code |= bitValue << bit;
      }
      out.push(code);
      bitCursor += 5;
    }
    return out;
  }

  function encodeReplayV1Record(width, height, record) {
    if (!(record && typeof record === "object")) throw "Invalid replay v1 record";

    if (record.kind === "move") {
      var dir = assertIntegerRange(Number(record.dir), 0, 7, "Invalid replay v1 move direction");
      var spawnIndex = assertIntegerRange(
        Number(record.spawnIndex),
        0,
        width * height - 1,
        "Invalid replay v1 spawn index"
      );
      var spawnValueBit = assertIntegerRange(Number(record.spawnValueBit), 0, 1, "Invalid replay v1 spawn value bit");
      var delta = encodeUleb128(record.deltaMs);
      if (dir <= 3 && spawnIndex <= 15) {
        var byte0 = (dir & 0x03) | ((spawnIndex & 0x0f) << 2) | ((spawnValueBit & 1) << 6);
        return [byte0].concat(delta);
      }
      return [REPLAY_V1_RECORD_MOVE8, dir & 0xff]
        .concat(encodeUleb128(spawnIndex))
        .concat([spawnValueBit & 1])
        .concat(delta);
    }

    if (record.kind === "undo1") {
      return [REPLAY_V1_RECORD_UNDO1].concat(encodeUleb128(record.deltaMs));
    }

    if (record.kind === "undon") {
      var undoCount = assertIntegerRange(Number(record.undoCount), 1, 0x7fffffff, "Invalid replay v1 undo count");
      return [REPLAY_V1_RECORD_UNDON]
        .concat(encodeUleb128(undoCount))
        .concat(encodeUleb128(record.deltaMs));
    }

    if (record.kind === "checkpoint") {
      return [REPLAY_V1_RECORD_CHECKPOINT].concat(
        encodeReplayV1PackedBoardCodes(width, height, record.boardCodes)
      );
    }

    if (record.kind === "ext") {
      var extType = assertIntegerRange(Number(record.extType), 0, 0x7fffffff, "Invalid replay v1 ext type");
      var payload = Array.prototype.slice.call(toUint8Array(record.payload || []));
      return [REPLAY_V1_RECORD_EXT]
        .concat(encodeUleb128(extType))
        .concat(encodeUleb128(payload.length))
        .concat(payload);
    }

    if (record.kind === "end") {
      return [REPLAY_V1_RECORD_END];
    }

    throw "Unsupported replay v1 record kind";
  }

  function encodeReplayV1Rpl(input) {
    var source = input || {};
    var width = assertIntegerRange(Number(source.width), 1, 15, "Invalid replay v1 board width");
    var height = assertIntegerRange(Number(source.height), 1, 15, "Invalid replay v1 board height");
    var initTiles = Array.isArray(source.initTiles) ? source.initTiles : [];
    var records = Array.isArray(source.records) ? source.records : [];
    var hasStartUnixMs = Number.isFinite(source.startUnixMs) && Number(source.startUnixMs) >= 0;
    var flags = Number.isInteger(source.flags) ? (source.flags & 0xff) : 0;
    if (hasStartUnixMs) flags |= REPLAY_V1_FLAG_HAS_START_UNIX_MS;
    else flags &= ~REPLAY_V1_FLAG_HAS_START_UNIX_MS;

    var containsUndo = false;
    var containsCheckpoints = false;
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (!record) continue;
      if (record.kind === "undo1" || record.kind === "undon") containsUndo = true;
      if (record.kind === "checkpoint") containsCheckpoints = true;
    }
    if (containsUndo) flags |= REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS;
    if (containsCheckpoints) flags |= REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS;
    var useExtendedInitTiles = width * height > 16;
    if (useExtendedInitTiles) flags |= REPLAY_V1_FLAG_EXTENDED_INIT_TILES;
    else flags &= ~REPLAY_V1_FLAG_EXTENDED_INIT_TILES;

    var chunks = [];
    chunks.push([82, 80, 76, 49]);
    chunks.push([(width & 0x0f) | ((height & 0x0f) << 4)]);
    chunks.push([flags & 0xff]);
    chunks.push([assertIntegerRange(initTiles.length, 0, 255, "Too many replay v1 init tiles")]);
    if (hasStartUnixMs) chunks.push(encodeUleb128(Number(source.startUnixMs)));

    for (i = 0; i < initTiles.length; i++) {
      var tile = initTiles[i] || {};
      var cellIndex = assertIntegerRange(
        Number(tile.cellIndex),
        0,
        width * height - 1,
        "Invalid replay v1 init tile cell index"
      );
      var valueBit = assertIntegerRange(Number(tile.valueBit), 0, 1, "Invalid replay v1 init tile value bit");
      if ((flags & REPLAY_V1_FLAG_EXTENDED_INIT_TILES) !== 0) {
        chunks.push(encodeUleb128((cellIndex << 1) | (valueBit & 1)));
      } else {
        chunks.push([(cellIndex & 0x0f) | ((valueBit & 1) << 4)]);
      }
    }

    for (i = 0; i < records.length; i++) {
      chunks.push(encodeReplayV1Record(width, height, records[i]));
    }

    var totalLen = 0;
    for (i = 0; i < chunks.length; i++) totalLen += chunks[i].length;
    var payload = new Uint8Array(totalLen);
    var offset = 0;
    for (i = 0; i < chunks.length; i++) {
      payload.set(chunks[i], offset);
      offset += chunks[i].length;
    }

    var crc = computeCrc32(payload);
    var out = new Uint8Array(payload.length + 4);
    out.set(payload, 0);
    out[payload.length] = crc & 0xff;
    out[payload.length + 1] = (crc >>> 8) & 0xff;
    out[payload.length + 2] = (crc >>> 16) & 0xff;
    out[payload.length + 3] = (crc >>> 24) & 0xff;
    return out;
  }

  function decodeReplayV1Rpl(bytesLike) {
    var bytes = toUint8Array(bytesLike);
    if (bytes.length < 11) throw "Invalid replay v1 payload length";
    if (bytes[0] !== 82 || bytes[1] !== 80 || bytes[2] !== 76 || bytes[3] !== 49) {
      throw "Invalid replay v1 magic";
    }

    var dims = bytes[4];
    var width = dims & 0x0f;
    var height = (dims >> 4) & 0x0f;
    if (!width || !height) throw "Invalid replay v1 board dimensions";

    var flags = bytes[5] & 0xff;
    var initCount = bytes[6] & 0xff;
    var crcOffset = bytes.length - 4;
    var expectedCrc32 =
      (bytes[crcOffset] & 0xff) |
      ((bytes[crcOffset + 1] & 0xff) << 8) |
      ((bytes[crcOffset + 2] & 0xff) << 16) |
      ((bytes[crcOffset + 3] & 0xff) << 24);
    var computedCrc32 = computeCrc32(bytes.subarray(0, crcOffset));
    if ((expectedCrc32 >>> 0) !== (computedCrc32 >>> 0)) throw "Replay v1 CRC32 mismatch";

    var offset = 7;
    var startUnixMs = null;
    if ((flags & REPLAY_V1_FLAG_HAS_START_UNIX_MS) !== 0) {
      var startDecoded = decodeUleb128(bytes, offset);
      startUnixMs = startDecoded.value;
      offset = startDecoded.nextOffset;
    }

    var initTiles = [];
    for (var i = 0; i < initCount; i++) {
      if ((flags & REPLAY_V1_FLAG_EXTENDED_INIT_TILES) !== 0) {
        var initDecoded = decodeUleb128(bytes, offset);
        offset = initDecoded.nextOffset;
        var encodedTile = initDecoded.value;
        var initCellIndex = encodedTile >>> 1;
        var initValueBit = encodedTile & 1;
        if (!Number.isInteger(initCellIndex) || initCellIndex < 0 || initCellIndex >= width * height) {
          throw "Invalid replay v1 init tile cell index";
        }
        initTiles.push({
          cellIndex: initCellIndex,
          valueBit: initValueBit
        });
      } else {
        if (offset >= crcOffset) throw "Unexpected EOF while decoding replay v1 init tiles";
        var token = bytes[offset];
        offset += 1;
        initTiles.push({
          cellIndex: token & 0x0f,
          valueBit: (token >> 4) & 1
        });
      }
    }

    var records = [];
    var checkpointBytes = Math.ceil((width * height * 5) / 8);
    while (offset < crcOffset) {
      var tag = bytes[offset] & 0xff;
      if (tag < 0x80) {
        offset += 1;
        var moveDeltaDecoded = decodeUleb128(bytes, offset);
        offset = moveDeltaDecoded.nextOffset;
        records.push({
          kind: "move",
          dir: tag & 0x03,
          spawnIndex: (tag >> 2) & 0x0f,
          spawnValueBit: (tag >> 6) & 1,
          deltaMs: moveDeltaDecoded.value
        });
        continue;
      }

      if (tag === REPLAY_V1_RECORD_UNDO1) {
        offset += 1;
        var undo1DeltaDecoded = decodeUleb128(bytes, offset);
        offset = undo1DeltaDecoded.nextOffset;
        records.push({
          kind: "undo1",
          deltaMs: undo1DeltaDecoded.value
        });
        continue;
      }

      if (tag === REPLAY_V1_RECORD_UNDON) {
        offset += 1;
        var undoCountDecoded = decodeUleb128(bytes, offset);
        var undonDeltaDecoded = decodeUleb128(bytes, undoCountDecoded.nextOffset);
        offset = undonDeltaDecoded.nextOffset;
        records.push({
          kind: "undon",
          undoCount: undoCountDecoded.value,
          deltaMs: undonDeltaDecoded.value
        });
        continue;
      }

      if (tag === REPLAY_V1_RECORD_CHECKPOINT) {
        offset += 1;
        var checkpointEnd = offset + checkpointBytes;
        if (checkpointEnd > crcOffset) throw "Unexpected EOF while decoding replay v1 checkpoint";
        var checkpointPayload = bytes.subarray(offset, checkpointEnd);
        offset = checkpointEnd;
        records.push({
          kind: "checkpoint",
          boardCodes: decodeReplayV1PackedBoardCodes(width, height, checkpointPayload)
        });
        continue;
      }

      if (tag === REPLAY_V1_RECORD_EXT) {
        offset += 1;
        var extTypeDecoded = decodeUleb128(bytes, offset);
        var extLenDecoded = decodeUleb128(bytes, extTypeDecoded.nextOffset);
        offset = extLenDecoded.nextOffset;
        var extPayloadEnd = offset + extLenDecoded.value;
        if (extPayloadEnd > crcOffset) throw "Unexpected EOF while decoding replay v1 ext payload";
        var extPayload = bytes.subarray(offset, extPayloadEnd);
        offset = extPayloadEnd;
        records.push({
          kind: "ext",
          extType: extTypeDecoded.value,
          payload: extPayload.slice()
        });
        continue;
      }

      if (tag === REPLAY_V1_RECORD_END) {
        offset += 1;
        records.push({ kind: "end" });
        continue;
      }

      if (tag === REPLAY_V1_RECORD_MOVE8) {
        offset += 1;
        if (offset >= crcOffset) throw "Unexpected EOF while decoding replay v1 move8";
        var move8Dir = bytes[offset] & 0xff;
        offset += 1;
        if (!Number.isInteger(move8Dir) || move8Dir < 0 || move8Dir > 7) {
          throw "Invalid replay v1 move8 direction";
        }
        var move8SpawnIndexDecoded = decodeUleb128(bytes, offset);
        offset = move8SpawnIndexDecoded.nextOffset;
        var move8SpawnIndex = move8SpawnIndexDecoded.value;
        if (!Number.isInteger(move8SpawnIndex) || move8SpawnIndex < 0 || move8SpawnIndex >= width * height) {
          throw "Invalid replay v1 move8 spawn index";
        }
        if (offset >= crcOffset) throw "Unexpected EOF while decoding replay v1 move8 value bit";
        var move8SpawnValueBit = bytes[offset] & 0xff;
        offset += 1;
        if (move8SpawnValueBit !== 0 && move8SpawnValueBit !== 1) {
          throw "Invalid replay v1 move8 spawn value bit";
        }
        var move8DeltaDecoded = decodeUleb128(bytes, offset);
        offset = move8DeltaDecoded.nextOffset;
        records.push({
          kind: "move",
          dir: move8Dir,
          spawnIndex: move8SpawnIndex,
          spawnValueBit: move8SpawnValueBit,
          deltaMs: move8DeltaDecoded.value
        });
        continue;
      }

      throw "Unsupported replay v1 record type";
    }

    return {
      magic: REPLAY_V1_MAGIC,
      width: width,
      height: height,
      flags: flags,
      initTiles: initTiles,
      startUnixMs: startUnixMs,
      records: records,
      expectedCrc32: expectedCrc32 >>> 0,
      computedCrc32: computedCrc32 >>> 0
    };
  }

  function replayV1InitTilesToBoard(width, height, initTiles, ruleset) {
    var out = [];
    for (var y = 0; y < height; y++) {
      var row = [];
      for (var x = 0; x < width; x++) row.push(0);
      out.push(row);
    }
    var source = Array.isArray(initTiles) ? initTiles : [];
    var fib = String(ruleset || "pow2") === "fibonacci";
    for (var i = 0; i < source.length; i++) {
      var tile = source[i] || {};
      var cellIndex = Number(tile.cellIndex);
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= width * height) continue;
      var valueBit = Number(tile.valueBit);
      var value = fib ? (valueBit === 1 ? 2 : 1) : (valueBit === 1 ? 4 : 2);
      var x = cellIndex % width;
      var y = Math.floor(cellIndex / width);
      out[y][x] = value;
    }
    return out;
  }

  function replayV1BoardToInitTiles(width, height, board, ruleset) {
    if (!Array.isArray(board) || board.length !== height) throw "Invalid replay v1 board";
    var initTiles = [];
    var fib = String(ruleset || "pow2") === "fibonacci";
    for (var y = 0; y < height; y++) {
      var row = board[y];
      if (!Array.isArray(row) || row.length !== width) throw "Invalid replay v1 board row";
      for (var x = 0; x < width; x++) {
        var value = Number(row[x]);
        if (value === 0) continue;
        if (fib) {
          if (value !== 1 && value !== 2) throw "Replay v1 init tile only supports value 1/2 in fibonacci mode";
        } else if (value !== 2 && value !== 4) {
          throw "Replay v1 init tile only supports value 2/4";
        }
        initTiles.push({
          cellIndex: y * width + x,
          valueBit: fib ? (value === 2 ? 1 : 0) : (value === 4 ? 1 : 0)
        });
      }
    }
    return initTiles;
  }

  function replayV1RecordsToReplayActions(records, width, ruleset) {
    var replayMoves = [];
    var replaySpawns = [];
    var source = Array.isArray(records) ? records : [];
    var fib = String(ruleset || "pow2") === "fibonacci";
    var exactSpawn = null;
    for (var i = 0; i < source.length; i++) {
      var record = source[i];
      if (!record) continue;
      if (record.kind === "ext" && record.extType === REPLAY_V1_EXT_EXACT_SPAWN) {
        if (exactSpawn !== null) throw "Invalid replay v1 exact spawn extension";
        var exactPayload = toUint8Array(record.payload || []);
        var exactDecoded = decodeUleb128(exactPayload, 0);
        var exactValue = exactDecoded.value;
        if (
          exactDecoded.nextOffset !== exactPayload.length ||
          !isReplayV1ExactSpawnValue(exactValue, fib)
        ) {
          throw "Invalid replay v1 exact spawn extension";
        }
        exactSpawn = exactValue;
        continue;
      }
      if (exactSpawn !== null && record.kind !== "move") {
        throw "Invalid replay v1 exact spawn pair";
      }
      if (record.kind === "move") {
        if (exactSpawn !== null && record.spawnValueBit !== 0) {
          throw "Invalid replay v1 exact spawn value bit";
        }
        replayMoves.push(record.dir);
        replaySpawns.push({
          x: record.spawnIndex % width,
          y: Math.floor(record.spawnIndex / width),
          value: exactSpawn !== null
            ? exactSpawn
            : (fib ? (record.spawnValueBit === 1 ? 2 : 1) : (record.spawnValueBit === 1 ? 4 : 2))
        });
        exactSpawn = null;
        continue;
      }
      if (record.kind === "undo1") {
        replayMoves.push(-1);
        replaySpawns.push(null);
        continue;
      }
      if (record.kind === "undon") {
        for (var j = 0; j < record.undoCount; j++) {
          replayMoves.push(-1);
          replaySpawns.push(null);
        }
      }
    }
    if (exactSpawn !== null) throw "Invalid replay v1 exact spawn pair";
    return {
      replayMoves: replayMoves,
      replaySpawns: replaySpawns
    };
  }

  function isReplayV1ExactSpawnValue(value, fib) {
    if (!Number.isSafeInteger(value)) return false;
    if (!fib) return value > 4 && (BigInt(value) & (BigInt(value) - 1n)) === 0n;
    if (value <= 2) return false;
    var previous = 1;
    var current = 2;
    while (current < value) {
      var next = previous + current;
      if (!Number.isSafeInteger(next)) return false;
      previous = current;
      current = next;
    }
    return current === value;
  }

  global.CoreReplayCodecRuntime = global.CoreReplayCodecRuntime || {};
  global.CoreReplayCodecRuntime.REPLAY_V1_MAGIC = REPLAY_V1_MAGIC;
  global.CoreReplayCodecRuntime.REPLAY_V1_FLAG_HAS_START_UNIX_MS = REPLAY_V1_FLAG_HAS_START_UNIX_MS;
  global.CoreReplayCodecRuntime.REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS = REPLAY_V1_FLAG_CONTAINS_UNDO_RECORDS;
  global.CoreReplayCodecRuntime.REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS = REPLAY_V1_FLAG_CONTAINS_CHECKPOINTS;
  global.CoreReplayCodecRuntime.REPLAY_V1_FLAG_EXTENDED_INIT_TILES = REPLAY_V1_FLAG_EXTENDED_INIT_TILES;
  global.CoreReplayCodecRuntime.REPLAY_V1_RECORD_UNDO1 = REPLAY_V1_RECORD_UNDO1;
  global.CoreReplayCodecRuntime.REPLAY_V1_RECORD_UNDON = REPLAY_V1_RECORD_UNDON;
  global.CoreReplayCodecRuntime.REPLAY_V1_RECORD_CHECKPOINT = REPLAY_V1_RECORD_CHECKPOINT;
  global.CoreReplayCodecRuntime.REPLAY_V1_RECORD_EXT = REPLAY_V1_RECORD_EXT;
  global.CoreReplayCodecRuntime.REPLAY_V1_RECORD_END = REPLAY_V1_RECORD_END;
  global.CoreReplayCodecRuntime.REPLAY_V1_RECORD_MOVE8 = REPLAY_V1_RECORD_MOVE8;
  global.CoreReplayCodecRuntime.encodeReplay128 = encodeReplay128;
  global.CoreReplayCodecRuntime.decodeReplay128 = decodeReplay128;
  global.CoreReplayCodecRuntime.encodeBoardV4 = encodeBoardV4;
  global.CoreReplayCodecRuntime.decodeBoardV4 = decodeBoardV4;
  global.CoreReplayCodecRuntime.appendCompactMoveCode = appendCompactMoveCode;
  global.CoreReplayCodecRuntime.appendCompactUndo = appendCompactUndo;
  global.CoreReplayCodecRuntime.appendCompactPracticeAction = appendCompactPracticeAction;
  global.CoreReplayCodecRuntime.encodeUleb128 = encodeUleb128;
  global.CoreReplayCodecRuntime.decodeUleb128 = decodeUleb128;
  global.CoreReplayCodecRuntime.computeCrc32 = computeCrc32;
  global.CoreReplayCodecRuntime.encodeReplayV1Rpl = encodeReplayV1Rpl;
  global.CoreReplayCodecRuntime.decodeReplayV1Rpl = decodeReplayV1Rpl;
  global.CoreReplayCodecRuntime.replayV1InitTilesToBoard = replayV1InitTilesToBoard;
  global.CoreReplayCodecRuntime.replayV1BoardToInitTiles = replayV1BoardToInitTiles;
  global.CoreReplayCodecRuntime.replayV1RecordsToReplayActions = replayV1RecordsToReplayActions;
})(typeof window !== "undefined" ? window : undefined);
