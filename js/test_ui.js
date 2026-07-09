document.addEventListener("DOMContentLoaded", function () {
  function showGameAlert(message) {
    if (window.GameDialog && typeof window.GameDialog.alert === "function") {
      window.GameDialog.alert(message);
      return;
    }
    alert(message);
  }

  var PRACTICE_TRANSFER_KEY = "practice_board_transfer_v1";
  var PRACTICE_TRANSFER_SESSION_KEY = "practice_board_transfer_session_v1";
  var gridContainer = document.getElementById("test-grid-container");
  var selectionGrid = document.getElementById("selection-grid");
  var practiceModePickerBtn = document.getElementById("practice-mode-picker-btn");
  var practiceModePanel = document.getElementById("practice-mode-panel");
  var practiceModeCloseBtn = document.getElementById("practice-mode-close");
  var practiceModeCurrent = document.getElementById("practice-mode-current");
  var practiceModeBadge = document.getElementById("practice-mode-badge");
  var practiceModeList = document.getElementById("practice-mode-list");
  var practiceBoardCodeToggleBtn = document.getElementById("practice-board-code-btn");
  var practiceBoardCodePanel = document.getElementById("practice-board-code-panel");
  var practiceBoardCodeInput = document.getElementById("practice-board-code-input");
  var practiceBoardCodeConfirmBtn = document.getElementById("practice-board-code-confirm");
  var currentPracticeModeSelectionKey = "";
  var selectedValue = null;
  var zeroCycleValues = [];
  var currentSelectionRuleset = "pow2";
  var practiceRelayoutTimer = null;
  var practicePhaseSyncTimer = null;
  var lastPracticeEditLocked = null;
  var lastGridTouchAt = 0;
  var gridTouchStartX = 0;
  var gridTouchStartY = 0;
  var gridTouchMoved = false;
  var TOUCH_TAP_MAX_DISTANCE = 12;
  var PRACTICE_CODE_SHAPES = {
    16: { width: 4, height: 4 },
    12: { width: 4, height: 3 },
    9: { width: 3, height: 3 },
    8: { width: 4, height: 2 }
  };
  var POW2_ZERO_CYCLE_VALUES = (function () {
    var values = [0];
    for (var exp = 1; exp <= 16; exp++) {
      values.push(Math.pow(2, exp)); // 2..65536
    }
    return values;
  })();
  var FIBONACCI_VALUES = (function () {
    var values = [1, 2];
    while (values.length < 16) {
      values.push(values[values.length - 1] + values[values.length - 2]);
    }
    return values;
  })();
  var FIBONACCI_ZERO_CYCLE_VALUES = [0].concat(FIBONACCI_VALUES);
  var zeroCyclePhaseByCell = {};

  function cloneJsonSafe(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return null;
    }
  }

  function toPositiveInt(value, fallback) {
    var num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.floor(num);
  }

  function getPracticeModeRuntime() {
    return window.CorePracticeModeRuntime || null;
  }

  function readPracticeUiLangFromStorage() {
    var runtime = window.CoreStorageRuntime || null;
    if (
      runtime &&
      typeof runtime.resolveStorageByName === "function" &&
      typeof runtime.safeReadStorageItem === "function"
    ) {
      var storageLike = runtime.resolveStorageByName({
        windowLike: window,
        storageName: "localStorage"
      });
      return String(runtime.safeReadStorageItem({
        storageLike: storageLike,
        key: "ui_language_v1"
      }) || "");
    }
    try {
      var storageLike = window && window["localStorage"] ? window["localStorage"] : null;
      return storageLike && typeof storageLike.getItem === "function"
        ? String(storageLike.getItem("ui_language_v1") || "")
        : "";
    } catch (_err) {}
    return "";
  }

  function readPracticeUiLang() {
    try {
      var fromStorage = readPracticeUiLangFromStorage().toLowerCase();
      if (fromStorage.indexOf("en") === 0) return "en";
      if (fromStorage.indexOf("zh") === 0) return "zh";
      if (window.UII18N && typeof window.UII18N.getLanguage === "function") {
        var fromRuntime = String(window.UII18N.getLanguage() || "").toLowerCase();
        if (fromRuntime.indexOf("en") === 0) return "en";
        if (fromRuntime.indexOf("zh") === 0) return "zh";
      }
      var root = document && document.documentElement ? document.documentElement : null;
      var fromRoot = root
        ? String(root.getAttribute("data-ui-lang") || root.getAttribute("lang") || "").toLowerCase()
        : "";
      if (fromRoot.indexOf("en") === 0) return "en";
      if (fromRoot.indexOf("zh") === 0) return "zh";
    } catch (_err) {}
    return "zh";
  }

  function formatPracticeDimension(width, height, lang) {
    return String(width) + (lang === "en" ? "x" : "×") + String(height);
  }

  function localizePracticeModeLabel(label, lang) {
    var text = String(label || "").trim();
    if (lang === "en") {
      return text
        .replace(/默认练习板/g, "Default Practice Board")
        .replace(/练习板（直通）/g, "Practice Board (Direct)")
        .replace(/斐波那契/g, "Fibonacci")
        .replace(/标准版/g, "Standard")
        .replace(/经典版/g, "Classic")
        .replace(/封顶版/g, "Capped")
        .replace(/自定义4率/g, "Custom 4-Rate")
        .replace(/概率/g, "Spawn")
        .replace(/八方向/g, "8-Direction")
        .replace(/无撤回/g, "No Undo")
        .replace(/可撤回/g, "Undo")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/(\d+)×(\d+)/g, "$1x$2");
    }
    return text
      .replace(/Default Practice Board/gi, "默认练习板")
      .replace(/Practice Board \(Direct\)/gi, "练习板（直通）")
      .replace(/Practice Board/gi, "练习板")
      .replace(/Fibonacci/gi, "斐波那契")
      .replace(/Diagonal/gi, "八方向")
      .replace(/Standard/gi, "标准")
      .replace(/Classic/gi, "经典")
      .replace(/Capped/gi, "封顶")
      .replace(/Spawn/gi, "概率")
      .replace(/No Undo/gi, "无撤回")
      .replace(/Undo/gi, "可撤回")
      .replace(/(\d+)x(\d+)/gi, "$1×$2");
  }

  function getPracticeBoardCodeCopy() {
    var lang = readPracticeUiLang();
    if (lang === "en") {
      return {
        buttonLabel: "Enter Board Code",
        title: "Enter Board Code",
        placeholder: "Enter board code",
        confirm: "Confirm",
        gameNotReady: "The game has not finished initializing. Please try again later.",
        emptyCode: "Enter a board code.",
        invalidChars: "Board code only supports 0-9 and A-F.",
        invalidLength: "Length must be 8, 9, 12, or 16 characters.",
        invalidCell: "Board code contains invalid characters.",
        invalidNumber: "Board code contains an invalid number.",
        cappedOverflow: "This capped mode only supports tiles up to ",
        applyFail: "Failed to apply board code. Please try again later."
      };
    }
    return {
      buttonLabel: "输入盘面代码",
      title: "输入盘面代码",
      placeholder: "输入盘面代码",
      confirm: "确认",
      gameNotReady: "游戏尚未完成初始化，请稍后重试。",
      emptyCode: "请输入盘面代码。",
      invalidChars: "盘面代码仅支持 0-9 和 A-F。",
      invalidLength: "长度仅支持 8、9、12、16 位。",
      invalidCell: "盘面代码包含非法字符。",
      invalidNumber: "棋盘码包含非法数字。",
      cappedOverflow: "当前封顶模式最多只能放置到 ",
      applyFail: "应用盘面代码失败，请稍后重试。"
    };
  }

  function syncPracticeBoardCodeUi() {
    var copy = getPracticeBoardCodeCopy();
    if (practiceBoardCodeToggleBtn) {
      practiceBoardCodeToggleBtn.setAttribute("title", copy.buttonLabel);
      practiceBoardCodeToggleBtn.setAttribute("aria-label", copy.buttonLabel);
    }
    var title = document.getElementById("practice-board-code-title");
    if (title) title.textContent = copy.title;
    if (practiceBoardCodeInput) practiceBoardCodeInput.setAttribute("placeholder", copy.placeholder);
    if (practiceBoardCodeConfirmBtn) practiceBoardCodeConfirmBtn.textContent = copy.confirm;
  }

  function resolvePracticeModeKeyParam() {
    var practiceRuntime = getPracticeModeRuntime();
    if (practiceRuntime && typeof practiceRuntime.parsePracticeModeKey === "function") {
      return practiceRuntime.parsePracticeModeKey(window.location.search || "");
    }
    try {
      var params = new URLSearchParams(window.location.search || "");
      var raw = params.get("practice_mode_key");
      var key = typeof raw === "string" ? raw.trim() : "";
      return key && key !== "practice" ? key : "";
    } catch (_err) {
      return "";
    }
  }

  function resolveDefaultPracticeSpawnTable(ruleset) {
    return ruleset === "fibonacci"
      ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
      : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  }

  function buildPracticeModeConfigFromCatalogMode(mode) {
    var practiceRuntime = getPracticeModeRuntime();
    if (
      practiceRuntime &&
      typeof practiceRuntime.buildPracticeModeConfigFromSelection === "function"
    ) {
      return practiceRuntime.buildPracticeModeConfigFromSelection(mode || {});
    }
    var source = cloneJsonSafe(mode || {}) || {};
    var ruleset = source.ruleset === "fibonacci" ? "fibonacci" : "pow2";
    source.key = "practice";
    source.label = "练习板（直通）";
    source.board_width = toPositiveInt(source.board_width, 4);
    source.board_height = toPositiveInt(source.board_height, source.board_width);
    source.ruleset = ruleset;
    source.undo_enabled = true;
    source.spawn_table =
      Array.isArray(source.spawn_table) && source.spawn_table.length > 0
        ? (cloneJsonSafe(source.spawn_table) || source.spawn_table)
        : resolveDefaultPracticeSpawnTable(ruleset);
    source.ranked_bucket = "none";
    source.mode_family =
      typeof source.mode_family === "string" && source.mode_family
        ? source.mode_family
        : (ruleset === "fibonacci" ? "fibonacci" : "pow2");
    source.rank_policy = "unranked";
    source.special_rules =
      source.special_rules && typeof source.special_rules === "object" && !Array.isArray(source.special_rules)
        ? (cloneJsonSafe(source.special_rules) || source.special_rules)
        : {};
    if (Number.isInteger(source.max_tile) && Number(source.max_tile) > 0) {
      source.max_tile = Number(source.max_tile);
      source.special_rules.enforce_max_tile = true;
    } else {
      delete source.max_tile;
    }
    return source;
  }

  function isPracticeSelectableCatalogMode(mode) {
    if (!(mode && typeof mode === "object")) return false;
    var key = typeof mode.key === "string" ? mode.key.trim() : "";
    if (!key || key === "practice") return false;
    if (key === "standard_4x4_pow2_no_undo") return true;
    if (key.indexOf("board_") === 0 && key.indexOf("_pow2_no_undo") !== -1) return true;
    if (key.indexOf("capped_") === 0 && key.indexOf("_no_undo") !== -1) return true;
    if (key.indexOf("fib_") === 0 && key.indexOf("_no_undo") !== -1) return true;
    if (key.indexOf("diag_") === 0 && key.indexOf("_no_undo") !== -1) return true;
    if (key.indexOf("nox_") === 0 && key.indexOf("_no_undo") !== -1) return true;
    return false;
  }

  function getPracticeModeSignature(modeConfig) {
    if (!(modeConfig && typeof modeConfig === "object")) return "";
    return JSON.stringify({
      board_width: toPositiveInt(modeConfig.board_width, 4),
      board_height: toPositiveInt(modeConfig.board_height, toPositiveInt(modeConfig.board_width, 4)),
      ruleset: modeConfig.ruleset === "fibonacci" ? "fibonacci" : "pow2",
      mode_family:
        typeof modeConfig.mode_family === "string" && modeConfig.mode_family
          ? modeConfig.mode_family
          : "",
      max_tile:
        Number.isInteger(modeConfig.max_tile) && Number(modeConfig.max_tile) > 0
          ? Number(modeConfig.max_tile)
          : null,
      spawn_table:
        Array.isArray(modeConfig.spawn_table) && modeConfig.spawn_table.length > 0
          ? (cloneJsonSafe(modeConfig.spawn_table) || modeConfig.spawn_table)
          : [],
      special_rules:
        modeConfig.special_rules && typeof modeConfig.special_rules === "object" && !Array.isArray(modeConfig.special_rules)
          ? (cloneJsonSafe(modeConfig.special_rules) || modeConfig.special_rules)
          : {}
    });
  }

  function normalizePracticeModeOptionLabel(label) {
    var text = typeof label === "string" ? label.trim() : "";
    return text
      .replace(/（\s*([^（）]*?)\s*[，,]\s*无撤回\s*）/g, "（$1）")
      .replace(/\(\s*([^()]*?)\s*,\s*No Undo\s*\)/gi, "($1)")
      .replace(/（\s*无撤回\s*）/g, "")
      .replace(/\(\s*No Undo\s*\)/gi, "")
      .replace(/无撤回/g, "")
      .replace(/\bNo Undo\b/gi, "")
      .replace(/[，,]\s*）/g, "）")
      .replace(/[，,]\s*\)/g, ")")
      .replace(/\(\s*\)/g, "")
      .replace(/（\s*）/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([）)])/g, "$1")
      .replace(/([（(])\s+/g, "$1")
      .trim();
  }

  function getPracticeSelectableModes() {
    if (!(window.ModeCatalog && typeof window.ModeCatalog.listModes === "function")) return [];
    var rawModes = window.ModeCatalog.listModes();
    var out = [];
    var seen = {};
    for (var i = 0; i < rawModes.length; i++) {
      var mode = rawModes[i];
      if (!isPracticeSelectableCatalogMode(mode)) continue;
      var practiceConfig = buildPracticeModeConfigFromCatalogMode(mode);
      var signature = getPracticeModeSignature(practiceConfig);
      if (!signature || seen[signature]) continue;
      seen[signature] = true;
      out.push({
        key: mode.key,
        label: normalizePracticeModeOptionLabel(typeof mode.label === "string" && mode.label ? mode.label : mode.key),
        ruleset: practiceConfig.ruleset,
        board_width: practiceConfig.board_width,
        board_height: practiceConfig.board_height,
        practiceConfig: practiceConfig
      });
    }
    return out;
  }

  function findPracticeSelectableModeByKey(key) {
    if (!key) return null;
    var modes = getPracticeSelectableModes();
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].key === key) return modes[i];
    }
    return null;
  }

  function resolveCurrentPracticeModeSelectionKey() {
    if (currentPracticeModeSelectionKey && findPracticeSelectableModeByKey(currentPracticeModeSelectionKey)) {
      return currentPracticeModeSelectionKey;
    }
    var paramKey = resolvePracticeModeKeyParam();
    if (paramKey && findPracticeSelectableModeByKey(paramKey)) {
      return paramKey;
    }
    var currentConfig =
      window.game_manager && window.game_manager.modeConfig
        ? window.game_manager.modeConfig
        : window.GAME_MODE_CONFIG;
    var currentSignature = getPracticeModeSignature(currentConfig);
    if (!currentSignature) return "";
    var modes = getPracticeSelectableModes();
    for (var i = 0; i < modes.length; i++) {
      if (getPracticeModeSignature(modes[i].practiceConfig) === currentSignature) {
        return modes[i].key;
      }
    }
    return "";
  }

  function getPracticeModeRulesetText(ruleset) {
    var lang = readPracticeUiLang();
    if (ruleset === "fibonacci") return lang === "en" ? "Fibonacci" : "斐波那契";
    return lang === "en" ? "Powers of 2" : "2 的幂";
  }

  function syncPracticeModePickerUi() {
    syncPracticeBoardCodeUi();
    var lang = readPracticeUiLang();
    var activeKey = resolveCurrentPracticeModeSelectionKey();
    if (activeKey) currentPracticeModeSelectionKey = activeKey;
    var activeMode = findPracticeSelectableModeByKey(activeKey);
    var activeLabel = localizePracticeModeLabel(
      activeMode ? activeMode.label : (lang === "en" ? "Default Practice Board" : "默认练习板"),
      lang
    );
    if (practiceModePickerBtn) {
      var title = lang === "en"
        ? "Choose Mode (Current: " + activeLabel + ")"
        : "选择模式（当前：" + activeLabel + "）";
      practiceModePickerBtn.setAttribute("title", title);
      practiceModePickerBtn.setAttribute("aria-label", title);
      practiceModePickerBtn.setAttribute("data-active-practice-mode-key", activeKey || "");
    }
    if (practiceModeCurrent) {
      practiceModeCurrent.textContent = lang === "en"
        ? "Current Mode: " + activeLabel
        : "当前模式：" + activeLabel;
    }
    if (practiceModeBadge) {
      practiceModeBadge.textContent = activeLabel;
      practiceModeBadge.setAttribute("title", activeLabel);
      practiceModeBadge.setAttribute(
        "aria-label",
        lang === "en" ? "Current practice board mode: " + activeLabel : "当前练习板模式：" + activeLabel
      );
    }
    if (!practiceModeList) return;
    practiceModeList.innerHTML = "";
    var modes = getPracticeSelectableModes();
    if (!modes.length) {
      var empty = document.createElement("div");
      empty.className = "practice-mode-empty";
      empty.textContent = lang === "en" ? "No modes available" : "暂无可选模式";
      practiceModeList.appendChild(empty);
      return;
    }
    for (var i = 0; i < modes.length; i++) {
      var option = modes[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "practice-mode-option";
      if (option.key === activeKey) {
        button.classList.add("is-active");
      }
      button.setAttribute("data-practice-mode-key", option.key);

      var label = document.createElement("span");
      label.className = "practice-mode-option-label";
      label.textContent = localizePracticeModeLabel(option.label, lang);
      button.appendChild(label);

      var meta = document.createElement("span");
      meta.className = "practice-mode-option-meta";
      meta.textContent =
        formatPracticeDimension(option.board_width, option.board_height, lang) +
        " · " +
        getPracticeModeRulesetText(option.ruleset);
      button.appendChild(meta);

      practiceModeList.appendChild(button);
    }
  }

  function bindPracticeLanguageSync() {
    window.addEventListener("uilanguagechange", function () {
      syncPracticeModePickerUi();
    });
    window.addEventListener("storage", function (event) {
      if (!event || event.key === "ui_language_v1") {
        syncPracticeModePickerUi();
      }
    });
  }

  function setPracticeModePanelOpen(open) {
    if (!practiceModePanel) return;
    var shouldOpen = !!open;
    if (shouldOpen && practiceBoardCodePanel && practiceBoardCodePanel.classList.contains("is-open")) {
      setPracticeBoardCodePanelOpen(false);
    }
    practiceModePanel.classList.toggle("is-open", shouldOpen);
    practiceModePanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    if (document.body && document.body.classList) {
      document.body.classList.toggle("practice-mode-open", shouldOpen);
    }
    if (practiceModePickerBtn) {
      practiceModePickerBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    }
    if (shouldOpen) {
      syncPracticeModePickerUi();
      if (practiceModeCloseBtn) practiceModeCloseBtn.focus();
    }
  }

  function buildEmptyPracticeBoardForModeConfig(modeConfig) {
    var width = toPositiveInt(modeConfig && modeConfig.board_width, 4);
    var height = toPositiveInt(modeConfig && modeConfig.board_height, width);
    var board = [];
    for (var y = 0; y < height; y++) {
      var row = [];
      for (var x = 0; x < width; x++) {
        row.push(0);
      }
      board.push(row);
    }
    return board;
  }

  function updatePracticeModeUrlState(modeKey, ruleset) {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    try {
      var params = new URLSearchParams(window.location.search || "");
      params.delete("practice_fresh");
      params.delete("practice_payload");
      params.delete("practice_token");
      if (modeKey && modeKey !== "practice") {
        params.set("practice_mode_key", modeKey);
      } else {
        params.delete("practice_mode_key");
      }
      params.set("practice_ruleset", ruleset === "fibonacci" ? "fibonacci" : "pow2");
      var next = "Practice_board.html";
      var query = params.toString();
      if (query) next += "?" + query;
      window.history.replaceState(null, "", next);
    } catch (_err) {}
  }

  function applyPracticeModeSelection(modeKey) {
    var option = findPracticeSelectableModeByKey(modeKey);
    var manager = window.game_manager;
    if (!option) return false;
    if (!manager || typeof manager.restartWithBoard !== "function") {
      showGameAlert(getPracticeBoardCodeCopy().gameNotReady);
      return false;
    }
    var modeConfig = cloneJsonSafe(option.practiceConfig) || option.practiceConfig;
    var emptyBoard = buildEmptyPracticeBoardForModeConfig(modeConfig);
    try {
      manager.restartWithBoard(emptyBoard, modeConfig, {
        setPracticeRestartBase: true,
        asReplay: false
      });
      manager.isTestMode = true;
      currentPracticeModeSelectionKey = option.key;
      updatePracticeModeUrlState(option.key, modeConfig.ruleset);
      syncSelectionGridByRuleset();
      syncPracticeSetupPhaseUi();
      syncPracticeModePickerUi();
      requestPracticeRelayout();
      return true;
    } catch (err) {
      console.error("Practice mode selection failed:", err);
      showGameAlert("切换练习模式失败，请稍后重试。");
      return false;
    }
  }

  function normalizePracticeBoardCodeInput(raw) {
    if (typeof raw !== "string") return "";
    return raw.replace(/\s+/g, "").toUpperCase();
  }

  function resolvePracticeBoardShapeByLength(codeLength) {
    if (!Number.isInteger(codeLength)) return null;
    if (Object.prototype.hasOwnProperty.call(PRACTICE_CODE_SHAPES, codeLength)) {
      return PRACTICE_CODE_SHAPES[codeLength];
    }
    return null;
  }

  function decodePracticeBoardCellValue(ch) {
    var digit = Number.parseInt(ch, 16);
    if (!Number.isInteger(digit) || digit < 0 || digit > 15) return null;
    if (digit === 0) return 0;
    return Math.pow(2, digit);
  }

  function decodePracticeBoardCode(raw) {
    var copy = getPracticeBoardCodeCopy();
    var code = normalizePracticeBoardCodeInput(raw);
    if (!code) {
      return { ok: false, message: copy.emptyCode };
    }
    if (!/^[0-9A-F]+$/.test(code)) {
      return { ok: false, message: copy.invalidChars };
    }
    var shape = resolvePracticeBoardShapeByLength(code.length);
    if (!shape) {
      return { ok: false, message: copy.invalidLength };
    }

    var board = [];
    var cursor = 0;
    for (var y = 0; y < shape.height; y++) {
      var row = [];
      for (var x = 0; x < shape.width; x++) {
        var value = decodePracticeBoardCellValue(code.charAt(cursor));
        if (value === null) {
          return { ok: false, message: copy.invalidCell };
        }
        row.push(value);
        cursor += 1;
      }
      board.push(row);
    }

    return {
      ok: true,
      code: code,
      width: shape.width,
      height: shape.height,
      board: board
    };
  }

  function buildPracticeModeConfigForBoard(manager, width, height) {
    var base =
      manager && manager.modeConfig && typeof manager.clonePlain === "function"
        ? manager.clonePlain(manager.modeConfig)
        : cloneJsonSafe(manager ? manager.modeConfig : null);
    if (!(base && typeof base === "object" && !Array.isArray(base))) {
      base = {};
    }
    if (typeof base.key !== "string" || !base.key) {
      base.key = "practice";
    }
    base.board_width = width;
    base.board_height = height;
    return base;
  }

  function applyPracticeBoardCode(rawCode) {
    var manager = window.game_manager;
    if (!manager || typeof manager.restartWithBoard !== "function") {
      showGameAlert(getPracticeBoardCodeCopy().gameNotReady);
      return false;
    }

    var decoded = decodePracticeBoardCode(rawCode);
    if (!decoded.ok) {
      showGameAlert(decoded.message);
      return false;
    }

    var modeConfig = buildPracticeModeConfigForBoard(manager, decoded.width, decoded.height);
    var maxTile = Number(modeConfig && modeConfig.max_tile);
    var boardValidation = validatePracticeBoardValuesAgainstMaxTile(decoded.board, maxTile);
    if (!boardValidation.ok) {
      showGameAlert(boardValidation.message);
      return false;
    }
    try {
      manager.restartWithBoard(decoded.board, modeConfig, {
        setPracticeRestartBase: true,
        asReplay: false
      });
      manager.isTestMode = true;
      syncSelectionGridByRuleset();
      syncPracticeSetupPhaseUi();
      requestPracticeRelayout();
      return true;
    } catch (err) {
      console.error("Practice board code apply failed:", err);
      showGameAlert(getPracticeBoardCodeCopy().applyFail);
      return false;
    }
  }

  function setPracticeBoardCodePanelOpen(open) {
    if (!practiceBoardCodePanel) return;
    var shouldOpen = !!open;
    if (shouldOpen && practiceModePanel && practiceModePanel.classList.contains("is-open")) {
      setPracticeModePanelOpen(false);
    }
    practiceBoardCodePanel.classList.toggle("is-open", shouldOpen);
    practiceBoardCodePanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    if (document.body && document.body.classList) {
      document.body.classList.toggle("practice-board-code-open", shouldOpen);
    }
    if (practiceBoardCodeToggleBtn) {
      practiceBoardCodeToggleBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    }
    if (shouldOpen && practiceBoardCodeInput) {
      practiceBoardCodeInput.focus();
      practiceBoardCodeInput.select();
    }
  }

  function bindPracticeBoardCodePanel() {
    setPracticeBoardCodePanelOpen(false);

    if (practiceBoardCodeToggleBtn) {
      practiceBoardCodeToggleBtn.addEventListener("click", function (e) {
        if (e && e.cancelable) e.preventDefault();
        var open = !!(
          practiceBoardCodePanel &&
          practiceBoardCodePanel.classList &&
          practiceBoardCodePanel.classList.contains("is-open")
        );
        setPracticeBoardCodePanelOpen(!open);
      });
    }

    if (practiceBoardCodePanel) {
      practiceBoardCodePanel.addEventListener("click", function (e) {
        if (
          !practiceBoardCodePanel.classList ||
          !practiceBoardCodePanel.classList.contains("is-open")
        ) {
          return;
        }
        if (e && e.target === practiceBoardCodePanel) {
          if (e.cancelable) e.preventDefault();
          setPracticeBoardCodePanelOpen(false);
        }
      });
    }

    if (practiceBoardCodeConfirmBtn) {
      practiceBoardCodeConfirmBtn.addEventListener("click", function (e) {
        if (e && e.cancelable) e.preventDefault();
        var raw = practiceBoardCodeInput ? String(practiceBoardCodeInput.value || "") : "";
        var applied = applyPracticeBoardCode(raw);
        if (!applied) return;
        if (practiceBoardCodeInput) {
          practiceBoardCodeInput.value = normalizePracticeBoardCodeInput(raw);
        }
        setPracticeBoardCodePanelOpen(false);
      });
    }

    if (practiceBoardCodeInput) {
      practiceBoardCodeInput.addEventListener("input", function () {
        var normalized = normalizePracticeBoardCodeInput(String(practiceBoardCodeInput.value || ""));
        if (normalized !== practiceBoardCodeInput.value) {
          practiceBoardCodeInput.value = normalized;
        }
      });
      practiceBoardCodeInput.addEventListener("keydown", function (e) {
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
        if (!e || e.key !== "Enter") return;
        if (e.cancelable) e.preventDefault();
        if (!practiceBoardCodeConfirmBtn || typeof practiceBoardCodeConfirmBtn.click !== "function") return;
        practiceBoardCodeConfirmBtn.click();
      });
      practiceBoardCodeInput.addEventListener("keyup", function (e) {
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
      });
      practiceBoardCodeInput.addEventListener("keypress", function (e) {
        if (e && typeof e.stopPropagation === "function") {
          e.stopPropagation();
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!e) return;
      var key = String(e.key || "");
      var code = String(e.code || "");
      if (key !== "Escape" && code !== "Escape") return;
      if (
        !practiceBoardCodePanel ||
        !practiceBoardCodePanel.classList ||
        !practiceBoardCodePanel.classList.contains("is-open")
      ) {
        return;
      }
      if (e.cancelable) e.preventDefault();
      setPracticeBoardCodePanelOpen(false);
    });
  }

  function getCellKey(x, y) {
    return String(x) + ":" + String(y);
  }

  function getNextZeroCycleValue(x, y) {
    var key = getCellKey(x, y);
    var phase = Object.prototype.hasOwnProperty.call(zeroCyclePhaseByCell, key)
      ? zeroCyclePhaseByCell[key]
      : -1;
    phase += 1;
    if (phase >= zeroCycleValues.length) phase = 0;
    zeroCyclePhaseByCell[key] = phase;
    return zeroCycleValues[phase];
  }

  function resetZeroCycleValue(x, y) {
    var key = getCellKey(x, y);
    if (Object.prototype.hasOwnProperty.call(zeroCyclePhaseByCell, key)) {
      delete zeroCyclePhaseByCell[key];
    }
  }

  function getPracticeToken() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var token = params.get("practice_token");
      return token && token.trim() ? token.trim() : "";
    } catch (_err) {
      return "";
    }
  }

  function shouldStartPracticeFresh() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("practice_fresh") === "1";
    } catch (_err) {
      return false;
    }
  }

  function getPracticePayloadParam() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var payload = params.get("practice_payload");
      return payload && payload.trim() ? payload : "";
    } catch (_err) {
      return "";
    }
  }

  function replacePracticeUrlSearchParams(params) {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    try {
      var next = "Practice_board.html";
      var query = params && typeof params.toString === "function" ? params.toString() : "";
      if (query) next += "?" + query;
      window.history.replaceState(null, "", next);
    } catch (_err) {}
  }

  function stripPracticeFreshFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (params.get("practice_fresh") !== "1") return;
      params.delete("practice_fresh");
      replacePracticeUrlSearchParams(params);
    } catch (_err) {}
  }

  function getStorageByName(name) {
    try {
      return window && window[name] ? window[name] : null;
    } catch (_err) {
      return null;
    }
  }

  function readStorageItem(storage, key) {
    if (!storage || !key) return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function removeStorageItem(storage, key) {
    if (!storage || !key) return;
    try {
      storage.removeItem(key);
    } catch (_err) {}
  }

  function writeStorageItem(storage, key, value) {
    if (!storage || !key) return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function parsePayload(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function stripPayloadFromUrl(token) {
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (token && !params.get("practice_token")) {
        params.set("practice_token", token);
      }
      params.delete("practice_payload");
      replacePracticeUrlSearchParams(params);
    } catch (_err) {}
  }

  function getPracticeRulesetParam() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var raw = params.get("practice_ruleset");
      if (raw === "fibonacci") return "fibonacci";
      var practiceModeKey = resolvePracticeModeKeyParam();
      if (practiceModeKey) {
        var selectedMode = findPracticeSelectableModeByKey(practiceModeKey);
        if (selectedMode && selectedMode.ruleset === "fibonacci") return "fibonacci";
      }
      return "pow2";
    } catch (_err) {
      return "pow2";
    }
  }

  function getCurrentRuleset() {
    try {
      if (window.game_manager && typeof window.game_manager.isFibonacciMode === "function") {
        return window.game_manager.isFibonacciMode() ? "fibonacci" : "pow2";
      }
    } catch (_err) {}
    try {
      if (
        window.GAME_MODE_CONFIG &&
        typeof window.GAME_MODE_CONFIG === "object" &&
        window.GAME_MODE_CONFIG.ruleset === "fibonacci"
      ) {
        return "fibonacci";
      }
    } catch (_errWindow) {}
    try {
      if (document.body && document.body.getAttribute("data-ruleset") === "fibonacci") return "fibonacci";
    } catch (_err2) {}
    return getPracticeRulesetParam();
  }

  function resolvePracticePlacementMaxTile() {
    var manager = window.game_manager;
    var sources = [
      manager && manager.modeConfig ? manager.modeConfig : null,
      window.GAME_MODE_CONFIG && typeof window.GAME_MODE_CONFIG === "object" ? window.GAME_MODE_CONFIG : null
    ];
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      var raw = Number(source && source.max_tile);
      if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    }
    var managerMaxTile = Number(manager && manager.maxTile);
    if (Number.isFinite(managerMaxTile) && managerMaxTile > 0) {
      return Math.floor(managerMaxTile);
    }
    return null;
  }

  function isPracticePlacementValueAllowed(value, maxTile) {
    var numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) return false;
    if (numeric === 0) return true;
    if (!Number.isFinite(maxTile) || maxTile <= 0) return true;
    return numeric <= maxTile;
  }

  function filterPracticePlacementValues(values, maxTile) {
    var list = Array.isArray(values) ? values : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var value = Number(list[i]);
      if (!isPracticePlacementValueAllowed(value, maxTile)) continue;
      out.push(value);
    }
    if (out.indexOf(0) === -1) out.unshift(0);
    return out;
  }

  function resolvePracticeDefaultSelectionValue(ruleset, values) {
    var preferred = ruleset === "fibonacci" ? 1 : 2;
    var list = Array.isArray(values) ? values : [];
    if (list.indexOf(preferred) !== -1) return preferred;
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i]) > 0) return Number(list[i]);
    }
    return 0;
  }

  function validatePracticeBoardValuesAgainstMaxTile(board, maxTile) {
    var copy = getPracticeBoardCodeCopy();
    if (!Number.isFinite(maxTile) || maxTile <= 0) {
      return { ok: true };
    }
    var rows = Array.isArray(board) ? board : [];
    for (var y = 0; y < rows.length; y++) {
      var row = Array.isArray(rows[y]) ? rows[y] : [];
      for (var x = 0; x < row.length; x++) {
        var value = Number(row[x]);
        if (!Number.isInteger(value) || value < 0) {
          return { ok: false, message: copy.invalidNumber };
        }
        if (value > maxTile) {
          return {
            ok: false,
            message: copy.cappedOverflow + String(maxTile) + (readPracticeUiLang() === "en" ? "." : "。")
          };
        }
      }
    }
    return { ok: true };
  }

  function getSelectionValuesForRuleset(ruleset) {
    if (ruleset === "fibonacci") return [0].concat(FIBONACCI_VALUES);
    return [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  }

  function isPracticeMobileViewport() {
    if (typeof window !== "undefined" && typeof window.isCompactGameViewport === "function") {
      return !!window.isCompactGameViewport();
    }
    return typeof window !== "undefined" ? window.innerWidth <= 980 : false;
  }

  function syncPracticeGestureEntryUi() {
    var scores = document.querySelector(".scores-container");
    if (!scores) return;
    var enabled = isPracticeMobileViewport();
    scores.classList.toggle("practice-gesture-entry", enabled);
    scores.classList.toggle("practice-gesture-active", enabled && selectedValue === null);
    if (enabled) {
      scores.setAttribute("title", "点击切换手势模式（不放置砖块）");
    } else {
      scores.removeAttribute("title");
    }
  }

  function resolvePracticeEditLocked() {
    var pageVariant = "";
    try {
      pageVariant = String(
        (document.body && document.body.getAttribute("data-page-variant")) || ""
      ).toLowerCase();
    } catch (_err) {
      pageVariant = "";
    }
    if (pageVariant === "pku2048") {
      var pkuManager = window.game_manager;
      return !!(pkuManager && pkuManager.hasGameStarted);
    }
    var path = "";
    try {
      path = String((window.location && window.location.pathname) || "").toLowerCase();
    } catch (_err2) {
      path = "";
    }
    if (path.indexOf("practice_board") !== -1) {
      return false;
    }
    var manager = window.game_manager;
    return !!(manager && manager.hasGameStarted);
  }

  function syncPracticeSetupPhaseUi() {
    var locked = resolvePracticeEditLocked();
    if (lastPracticeEditLocked === locked) return locked;
    lastPracticeEditLocked = locked;

    if (document.body) {
      document.body.classList.toggle("practice-setup-locked", locked);
    }
    if (selectionGrid) {
      selectionGrid.classList.toggle("selection-grid-locked", locked);
      selectionGrid.setAttribute("aria-disabled", locked ? "true" : "false");
      if (locked) {
        selectionGrid.setAttribute("title", "游戏已开始，重新开始后才能继续摆盘");
      } else {
        selectionGrid.removeAttribute("title");
      }
    }
    if (gridContainer) {
      gridContainer.classList.toggle("practice-grid-locked", locked);
    }
    if (locked) {
      setSelectedValue(null);
    } else if (selectedValue === null) {
      setSelectedValue(currentSelectionRuleset === "fibonacci" ? 1 : 2);
    } else {
      syncPracticeGestureEntryUi();
    }
    return locked;
  }

  function setSelectedValue(value) {
    selectedValue = value;
    if (selectionGrid) {
      var tiles = selectionGrid.querySelectorAll(".selection-tile");
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var shouldSelect = (parseInt(tile.getAttribute("data-value"), 10) === value);
        tile.classList.toggle("selected", !!shouldSelect);
      }
    }
    syncPracticeGestureEntryUi();
  }

  function renderSelectionGrid(values, defaultValue) {
    if (!selectionGrid) return;
    selectionGrid.innerHTML = "";

    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      var tile = document.createElement("div");
      tile.className = value === 0 ? "selection-tile tile-0" : ("selection-tile tile tile-" + String(value));
      tile.setAttribute("data-value", String(value));

      var inner = document.createElement("div");
      inner.className = "tile-inner";
      inner.textContent = String(value);
      tile.appendChild(inner);
      selectionGrid.appendChild(tile);
    }
    setSelectedValue(defaultValue);
  }

  function syncSelectionGridByRuleset() {
    var ruleset = getCurrentRuleset();
    var maxTile = resolvePracticePlacementMaxTile();
    currentSelectionRuleset = ruleset;
    zeroCycleValues = filterPracticePlacementValues(
      ruleset === "fibonacci" ? FIBONACCI_ZERO_CYCLE_VALUES.slice() : POW2_ZERO_CYCLE_VALUES.slice(),
      maxTile
    );
    var values = filterPracticePlacementValues(getSelectionValuesForRuleset(ruleset), maxTile);
    var defaultValue = resolvePracticeDefaultSelectionValue(ruleset, values);
    zeroCyclePhaseByCell = {};
    renderSelectionGrid(values, defaultValue);
    syncPracticeSetupPhaseUi();
    syncPracticeModePickerUi();
  }

  function requestPracticeRelayout() {
    if (practiceRelayoutTimer) clearTimeout(practiceRelayoutTimer);
    practiceRelayoutTimer = setTimeout(function () {
      syncPracticeGestureEntryUi();
      var gm = window.game_manager;
      if (!gm) return;
      if (gm.actuator && typeof gm.actuator.invalidateLayoutCache === "function") {
        gm.actuator.invalidateLayoutCache();
      }
      if (typeof gm.clearTransientTileVisualState === "function") {
        gm.clearTransientTileVisualState();
      }
      if (typeof gm.actuate === "function") {
        gm.actuate();
      }
    }, 120);
  }

  function applyPracticeTransfer(retriesLeft) {
    var token = getPracticeToken();
    if (!token) return;

    if (!window.game_manager || typeof window.game_manager.restartWithBoard !== "function") {
      if (retriesLeft > 0) {
        setTimeout(function () { applyPracticeTransfer(retriesLeft - 1); }, 60);
      }
      return;
    }

    var payload = null;
    var fromKey = "";
    var localStore = getStorageByName("localStorage");
    var sessionStore = getStorageByName("sessionStorage");

    var rawLocal = readStorageItem(localStore, PRACTICE_TRANSFER_KEY);
    payload = parsePayload(rawLocal);
    if (payload && payload.token === token) {
      fromKey = "local";
    } else {
      payload = null;
    }

    if (!payload) {
      var rawSession = readStorageItem(sessionStore, PRACTICE_TRANSFER_SESSION_KEY);
      payload = parsePayload(rawSession);
      if (payload && payload.token === token) {
        fromKey = "session";
      } else {
        payload = null;
      }
    }

    if (!payload) {
      var rawParam = getPracticePayloadParam();
      payload = parsePayload(rawParam);
      if (payload && payload.token === token) {
        fromKey = "url";
      } else {
        payload = null;
      }
    }
    if (!payload) return;

    if (fromKey === "local") {
      removeStorageItem(localStore, PRACTICE_TRANSFER_KEY);
    } else if (fromKey === "session") {
      removeStorageItem(sessionStore, PRACTICE_TRANSFER_SESSION_KEY);
    } else if (fromKey === "url") {
      stripPayloadFromUrl(token);
    }

    var createdAt = Number(payload.created_at) || 0;
    if (createdAt && Math.abs(Date.now() - createdAt) > 10 * 60 * 1000) return;

    if (!Array.isArray(payload.board) || payload.board.length === 0) return;

    var board = cloneJsonSafe(payload.board) || payload.board;
    var modeConfig = (payload.mode_config && typeof payload.mode_config === "object")
      ? (cloneJsonSafe(payload.mode_config) || payload.mode_config)
      : null;
    var noXTarget = Number(modeConfig && modeConfig.special_rules && modeConfig.special_rules.no_x_target);
    var restartOptions = {
      setPracticeRestartBase: true,
      asReplay: false
    };
    if (Number.isInteger(noXTarget) && noXTarget > 0) {
      restartOptions.noXTarget = noXTarget;
      restartOptions.skipNoXSelection = true;
    }

    try {
      window.game_manager.restartWithBoard(board, modeConfig, restartOptions);
      window.game_manager.isTestMode = true;
      syncSelectionGridByRuleset();
      syncPracticeSetupPhaseUi();
    } catch (err) {
      console.error("Practice transfer restore failed:", err);
      showGameAlert("练习板载入盘面失败，请重试。");
    }
  }

  function buildEmptyPracticeBoard(manager, modeConfig) {
    if (modeConfig) return buildEmptyPracticeBoardForModeConfig(modeConfig);
    var width = Number.isInteger(manager && manager.width) && manager.width > 0 ? manager.width : 4;
    var height = Number.isInteger(manager && manager.height) && manager.height > 0 ? manager.height : width;
    return buildEmptyPracticeBoardForModeConfig({
      board_width: width,
      board_height: height
    });
  }

  function applyPracticeFreshStart(retriesLeft) {
    if (!shouldStartPracticeFresh()) return;
    if (getPracticeToken()) return;

    if (!window.game_manager || typeof window.game_manager.restartWithBoard !== "function") {
      if (retriesLeft > 0) {
        setTimeout(function () { applyPracticeFreshStart(retriesLeft - 1); }, 60);
      }
      return;
    }

    var manager = window.game_manager;
    var emptyBoard = buildEmptyPracticeBoard(manager);
    try {
      manager.restartWithBoard(emptyBoard, manager.modeConfig || null, {
        setPracticeRestartBase: true,
        asReplay: false
      });
      manager.isTestMode = true;
      syncSelectionGridByRuleset();
      syncPracticeSetupPhaseUi();
      stripPracticeFreshFromUrl();
    } catch (err) {
      console.error("Practice fresh start failed:", err);
    }
  }

  syncSelectionGridByRuleset();
  syncPracticeModePickerUi();
  bindPracticeLanguageSync();
  bindPracticeModePicker();
  bindPracticeBoardCodePanel();

  function bindPracticeModePicker() {
    setPracticeModePanelOpen(false);

    if (practiceModePickerBtn) {
      practiceModePickerBtn.addEventListener("click", function (e) {
        if (e && e.cancelable) e.preventDefault();
        var open = !!(
          practiceModePanel &&
          practiceModePanel.classList &&
          practiceModePanel.classList.contains("is-open")
        );
        setPracticeModePanelOpen(!open);
      });
    }

    if (practiceModeCloseBtn) {
      practiceModeCloseBtn.addEventListener("click", function (e) {
        if (e && e.cancelable) e.preventDefault();
        setPracticeModePanelOpen(false);
      });
    }

    if (practiceModePanel) {
      practiceModePanel.addEventListener("click", function (e) {
        if (!practiceModePanel.classList || !practiceModePanel.classList.contains("is-open")) {
          return;
        }
        if (e && e.target === practiceModePanel) {
          if (e.cancelable) e.preventDefault();
          setPracticeModePanelOpen(false);
        }
      });
    }

    if (practiceModeList) {
      practiceModeList.addEventListener("click", function (e) {
        var target = e && e.target && e.target.closest
          ? e.target.closest("[data-practice-mode-key]")
          : null;
        if (!target) return;
        if (e && e.cancelable) e.preventDefault();
        var modeKey = String(target.getAttribute("data-practice-mode-key") || "");
        if (!modeKey) return;
        if (!applyPracticeModeSelection(modeKey)) return;
        setPracticeModePanelOpen(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!e || e.defaultPrevented || e.key !== "Escape") return;
      if (practiceModePanel && practiceModePanel.classList.contains("is-open")) {
        if (e.cancelable) e.preventDefault();
        setPracticeModePanelOpen(false);
      }
    });
  }

  if (window.game_manager) {
    window.game_manager.isTestMode = true;
  }

  if (selectionGrid) {
    function handleSelectionInteraction(e) {
      if (syncPracticeSetupPhaseUi()) return;
      var target = e.target.closest(".selection-tile");
      if (target) {
        if (e && e.cancelable) e.preventDefault();
        var value = parseInt(target.getAttribute("data-value"), 10);
        if (!Number.isFinite(value)) return;
        setSelectedValue(value);
      }
    }

    selectionGrid.addEventListener("click", handleSelectionInteraction);
    selectionGrid.addEventListener("touchend", handleSelectionInteraction, { passive: false });
  }

  var scoreContainer = document.querySelector(".scores-container");
  if (scoreContainer) {
    var setGestureMode = function (e) {
      if (!isPracticeMobileViewport()) return;
      if (e && e.cancelable) e.preventDefault();
      setSelectedValue(null);
    };
    scoreContainer.addEventListener("click", setGestureMode);
    scoreContainer.addEventListener("touchend", setGestureMode, { passive: false });
  }

  if (gridContainer) {
    function applyPracticeTimerPlaceholderForValue(value) {
      var numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 2048) return;
      var timerEl = document.getElementById("timer" + String(numeric));
      if (timerEl && String(timerEl.textContent || "") === "") {
        timerEl.textContent = "---------";
      }
      if (numeric === 16384) {
        var subTimerEl = document.getElementById("timer-secondary-32768-16384");
        if (subTimerEl && String(subTimerEl.textContent || "") === "") {
          subTimerEl.textContent = "---------";
        }
      }
    }

    function resolveGridCellFromEvent(e) {
      var cell = e && e.target && e.target.closest ? e.target.closest(".grid-cell") : null;
      if (cell) return cell;

      var touch = null;
      if (e && e.changedTouches && e.changedTouches.length > 0) {
        touch = e.changedTouches[0];
      } else if (e && e.touches && e.touches.length > 0) {
        touch = e.touches[0];
      }
      if (!touch || typeof document === "undefined" || !document.elementFromPoint) return null;

      var hit = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!hit || !hit.closest) return null;
      return hit.closest(".grid-cell");
    }

    function applyCustomTileToCell(cell) {
      if (!cell) return;
      if (syncPracticeSetupPhaseUi()) return;
      var x = parseInt(cell.getAttribute("data-x"), 10);
      var y = parseInt(cell.getAttribute("data-y"), 10);
      if (!window.game_manager) return;
      if (selectedValue === null) return;

      if (selectedValue === 0) {
        var cycleValue = getNextZeroCycleValue(x, y);
        window.game_manager.insertCustomTile(x, y, cycleValue);
        applyPracticeTimerPlaceholderForValue(cycleValue);
      } else {
        resetZeroCycleValue(x, y);
        window.game_manager.insertCustomTile(x, y, selectedValue);
        applyPracticeTimerPlaceholderForValue(selectedValue);
      }
    }

    function handleGridInteraction(e, fromTouch, touchCanPlace) {
      if (fromTouch) {
        lastGridTouchAt = Date.now();
        if (!touchCanPlace) return;
      } else if (Date.now() - lastGridTouchAt < 450) {
        // Ignore synthetic click immediately following touchend.
        return;
      }

      var tileContainer = document.querySelector(".tile-container");
      if (tileContainer) tileContainer.style.pointerEvents = "none";
      if (e && e.cancelable) e.preventDefault();

      var cell = resolveGridCellFromEvent(e);
      applyCustomTileToCell(cell);
    }

    gridContainer.addEventListener("click", function (e) {
      handleGridInteraction(e, false, true);
    });
    gridContainer.addEventListener("touchstart", function (e) {
      if (!e || !e.touches || !e.touches.length) return;
      gridTouchMoved = false;
      gridTouchStartX = e.touches[0].clientX;
      gridTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    gridContainer.addEventListener("touchmove", function (e) {
      if (!e || !e.touches || !e.touches.length) return;
      var dx = Math.abs(e.touches[0].clientX - gridTouchStartX);
      var dy = Math.abs(e.touches[0].clientY - gridTouchStartY);
      if (dx > TOUCH_TAP_MAX_DISTANCE || dy > TOUCH_TAP_MAX_DISTANCE) {
        gridTouchMoved = true;
      }
    });
    gridContainer.addEventListener("touchend", function (e) {
      handleGridInteraction(e, true, !gridTouchMoved);
      gridTouchMoved = false;
    }, { passive: false });
  }

  applyPracticeTransfer(30);
  applyPracticeFreshStart(30);

  setTimeout(function () {
    if (window.game_manager) {
      window.game_manager.isTestMode = true;
      syncPracticeSetupPhaseUi();
    }
  }, 100);

  if (!window.__practicePhaseSyncBound) {
    window.__practicePhaseSyncBound = true;
    practicePhaseSyncTimer = window.setInterval(function () {
      syncPracticeSetupPhaseUi();
    }, 150);
  }

  if (!window.__practiceRelayoutBound) {
    window.__practiceRelayoutBound = true;
    window.addEventListener("resize", requestPracticeRelayout);
    window.addEventListener("orientationchange", requestPracticeRelayout);
  }

  if (!window.__practiceRedoShortcutBound) {
    window.__practiceRedoShortcutBound = true;
    document.addEventListener("keydown", function (e) {
      if (!e || e.defaultPrevented) return;
      var target = e.target;
      var editable = !!(
        target &&
        target.closest &&
        target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")
      );
      if (editable) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var key = String(e.key || "");
      var code = String(e.code || "");
      var which = Number(e.which || e.keyCode || 0);
      var isRedoKey = which === 89 || code === "KeyY" || key === "y" || key === "Y";
      if (!isRedoKey) return;
      var manager = window.game_manager;
      if (!manager || manager.replayMode) return;
      var modeKey = String(manager.modeKey || manager.mode || "").toLowerCase();
      var pathname = String((window.location && window.location.pathname) || "").toLowerCase();
      if (modeKey !== "practice" && pathname.indexOf("practice_board") === -1) return;
      if (e.cancelable) e.preventDefault();
      if (typeof manager.move === "function") manager.move(-2);
    });
  }
  syncPracticeBoardCodeUi();
  syncPracticeGestureEntryUi();
  syncPracticeSetupPhaseUi();
  requestPracticeRelayout();
});
