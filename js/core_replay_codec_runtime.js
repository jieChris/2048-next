(function (global) {
  "use strict";

  if (!global) return;

  var REPLAY128_ASCII_START = 33;
  var REPLAY128_ASCII_COUNT = 94;
  var REPLAY128_TOTAL = 128;
  var REPLAY128_EXTRA_CODES = (function () {
    var codes = [];
    var c;
    for (c = 161; c <= 172; c++) codes.push(c);
    for (c = 174; c <= 195; c++) codes.push(c);
    return codes;
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

  global.CoreReplayCodecRuntime = global.CoreReplayCodecRuntime || {};
  global.CoreReplayCodecRuntime.encodeReplay128 = encodeReplay128;
  global.CoreReplayCodecRuntime.decodeReplay128 = decodeReplay128;
  global.CoreReplayCodecRuntime.encodeBoardV4 = encodeBoardV4;
  global.CoreReplayCodecRuntime.decodeBoardV4 = decodeBoardV4;
})(typeof window !== "undefined" ? window : undefined);
