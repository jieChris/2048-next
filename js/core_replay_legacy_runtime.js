(function (global) {
  "use strict";

  if (!global) return;

  function decodeReplayV1Moves(movesString) {
    var reverseMapping = { U: 0, R: 1, D: 2, L: 3, Z: -1 };
    return movesString.split("").map(function (char) {
      var val = reverseMapping[char];
      if (val === undefined) throw "Invalid move char: " + char;
      return val;
    });
  }

  function decodeReplayV2Log(logString) {
    var replayMoves = [];
    var replaySpawns = [];

    for (var i = 0; i < logString.length; i++) {
      var code = logString.charCodeAt(i) - 33;
      if (code < 0 || code > 128) {
        throw "Invalid replay char at index " + i;
      }
      if (code === 128) {
        replayMoves.push(-1);
        replaySpawns.push(null);
      } else {
        var dir = (code >> 5) & 3;
        var is4 = (code >> 4) & 1;
        var posIdx = code & 15;
        var x = posIdx % 4;
        var y = Math.floor(posIdx / 4);
        replayMoves.push(dir);
        replaySpawns.push({ x: x, y: y, value: is4 ? 4 : 2 });
      }
    }

    return {
      replayMoves: replayMoves,
      replaySpawns: replaySpawns
    };
  }

  function decodeLegacyReplay(trimmedReplayString) {
    if (trimmedReplayString.indexOf("REPLAY_v1_") === 0) {
      var v1Parts = trimmedReplayString.split("_");
      var seed = parseFloat(v1Parts[2]);
      var movesString = v1Parts[3];
      return {
        seed: seed,
        replayMoves: decodeReplayV1Moves(movesString),
        replaySpawns: null
      };
    }

    if (trimmedReplayString.indexOf("REPLAY_v2S_") === 0) {
      var prefixS = "REPLAY_v2S_";
      var rest = trimmedReplayString.substring(prefixS.length);
      var seedSep = rest.indexOf("_");
      if (seedSep < 0) throw "Invalid v2S format";
      var seedS = parseFloat(rest.substring(0, seedSep));
      if (isNaN(seedS)) throw "Invalid v2S seed";
      var logString = rest.substring(seedSep + 1);
      var decodedS = decodeReplayV2Log(logString);
      return {
        seed: seedS,
        replayMovesV2: logString,
        replayMoves: decodedS.replayMoves,
        replaySpawns: decodedS.replaySpawns
      };
    }

    if (trimmedReplayString.indexOf("REPLAY_v2_") === 0) {
      var prefix = "REPLAY_v2_";
      var logString2 = trimmedReplayString.substring(prefix.length);
      var decoded2 = decodeReplayV2Log(logString2);
      return {
        seed: 0.123,
        replayMovesV2: logString2,
        replayMoves: decoded2.replayMoves,
        replaySpawns: decoded2.replaySpawns
      };
    }

    return null;
  }

  global.CoreReplayLegacyRuntime = global.CoreReplayLegacyRuntime || {};
  global.CoreReplayLegacyRuntime.decodeReplayV1Moves = decodeReplayV1Moves;
  global.CoreReplayLegacyRuntime.decodeReplayV2Log = decodeReplayV2Log;
  global.CoreReplayLegacyRuntime.decodeLegacyReplay = decodeLegacyReplay;
})(typeof window !== "undefined" ? window : undefined);
