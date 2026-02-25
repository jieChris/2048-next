(function (global) {
  "use strict";

  if (!global) return;

  var REPLAY128_ASCII_START = 33;
  var REPLAY128_ASCII_COUNT = 94;
  var REPLAY128_EXTRA_CODES = (function () {
    var codes = [];
    var c;
    for (c = 161; c <= 172; c++) codes.push(c);
    for (c = 174; c <= 195; c++) codes.push(c);
    return codes;
  })();

  function fallbackDecodeReplay128(char) {
    if (!char || char.length !== 1) throw "Invalid replay char";
    var code = char.charCodeAt(0);
    if (code >= REPLAY128_ASCII_START && code < REPLAY128_ASCII_START + REPLAY128_ASCII_COUNT) {
      return code - REPLAY128_ASCII_START;
    }
    var extraIndex = REPLAY128_EXTRA_CODES.indexOf(code);
    if (extraIndex >= 0) return REPLAY128_ASCII_COUNT + extraIndex;
    throw "Invalid replay char";
  }

  function decodeReplay128(char) {
    var codec = global.CoreReplayCodecRuntime;
    if (codec && typeof codec.decodeReplay128 === "function") {
      return codec.decodeReplay128(char);
    }
    return fallbackDecodeReplay128(char);
  }

  function decodeMoveSpawnCode(rawCode) {
    var dir = (rawCode >> 5) & 3;
    var is4 = (rawCode >> 4) & 1;
    var posIdx = rawCode & 15;
    var x = posIdx % 4;
    var y = Math.floor(posIdx / 4);
    return {
      move: dir,
      spawn: { x: x, y: y, value: is4 ? 4 : 2 }
    };
  }

  function decodeReplayV4Actions(actionsEncoded) {
    var replayMoves = [];
    var replaySpawns = [];

    var i = 0;
    while (i < actionsEncoded.length) {
      var token = decodeReplay128(actionsEncoded.charAt(i));
      i += 1;
      if (token < 127) {
        var decoded = decodeMoveSpawnCode(token);
        replayMoves.push(decoded.move);
        replaySpawns.push(decoded.spawn);
        continue;
      }

      if (i >= actionsEncoded.length) throw "Invalid v4C escape";
      var subtype = decodeReplay128(actionsEncoded.charAt(i));
      i += 1;

      if (subtype === 0) {
        var decoded127 = decodeMoveSpawnCode(127);
        replayMoves.push(decoded127.move);
        replaySpawns.push(decoded127.spawn);
      } else if (subtype === 1) {
        replayMoves.push(-1);
        replaySpawns.push(null);
      } else if (subtype === 2) {
        if (i + 1 >= actionsEncoded.length) throw "Invalid v4C practice action";
        var cell = decodeReplay128(actionsEncoded.charAt(i));
        i += 1;
        var exp = decodeReplay128(actionsEncoded.charAt(i));
        i += 1;
        if (cell < 0 || cell > 15) throw "Invalid v4C practice cell";
        var px = (cell >> 2) & 3;
        var py = cell & 3;
        var value = exp === 0 ? 0 : Math.pow(2, exp);
        replayMoves.push(["p", px, py, value]);
        replaySpawns.push(null);
      } else {
        throw "Unknown v4C escape subtype";
      }
    }

    return {
      replayMoves: replayMoves,
      replaySpawns: replaySpawns
    };
  }

  global.CoreReplayV4ActionsRuntime = global.CoreReplayV4ActionsRuntime || {};
  global.CoreReplayV4ActionsRuntime.decodeReplayV4Actions = decodeReplayV4Actions;
})(typeof window !== "undefined" ? window : undefined);
