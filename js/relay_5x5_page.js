(function (global) {
  "use strict";

  if (!global || !global.document) return;

  var STORAGE_TOKEN_KEY = "2048_auth_token_v1";
  var STORAGE_USER_ID_KEY = "2048_auth_userId_v1";
  var UI_LANG_STORAGE_KEY = "ui_language_v1";
  var DEFAULT_TIMEOUT_MS = 12000;
  var NOTE_AUTO_HIDE_MS = 5000;
  var RELAY_MODE_KEY = "board_5x5_pow2_no_undo";
  var SAVED_GAME_STATE_KEY_PREFIX = "savedGameStateByMode:v1:";
  var SAVED_GAME_STATE_LITE_KEY_PREFIX = "savedGameStateLiteByMode:v1:";
  var DEFAULT_REPLAY_V1_BASE64_PREFIX = "REPLAY_v1RPL_B64_";

  var _u = global.ApiSharedUtils || {};
  var toText = _u.toText || function (v) { return v == null ? "" : String(v); };
  var safeGetStorage = _u.safeGetStorage || function () { return null; };
  var safeRemoveStorage = _u.safeRemoveStorage || function () { };
  var buildApiBaseCandidates = _u.buildApiBaseCandidates || function () { return []; };
  var resolveApiTimeoutMs = _u.resolveApiTimeoutMs || function (fallback) {
    var n = Number(fallback);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TIMEOUT_MS;
  };
  var callFetch = _u.callFetch || function (url, init) {
    var fetchFn = global && global["fetch"];
    if (typeof fetchFn !== "function") {
      return Promise.reject(new Error("fetch_unavailable"));
    }
    return fetchFn.call(global, url, init);
  };

  var COPY = {
    zh: {
      title: "5x5 接力模式（MVP）",
      subtitle: "单档接力，接档需先申请并由持有者批准，持有权持续到交接或释放。",
      navHome: "回首页",
      navModes: "模式选择",
      listTitle: "接力档案列表",
      actionTitle: "接力操作",
      open5x5: "前往5x5无撤回版",
      loginStateGuest: "登录状态：未登录",
      loginStateAuthed: "登录状态：用户 ",
      apiIdle: "API：未连接",
      apiConnected: "API：已连接 ",
      apiUnavailable: "API：未部署接力接口",
      myCaseGuest: "未登录",
      myCaseNone: "无存档",
      myCasePrefix: "",
      heldSnapshotTitle: "当前持有存档快照",
      heldSnapshotGuest: "未登录，暂无可显示快照。",
      heldSnapshotNone: "当前无持有存档，暂无快照。",
      heldSnapshotLoading: "正在加载当前持有存档快照...",
      heldSnapshotLoadFailed: "快照加载失败：",
      replayChainTitle: "整档回放聚合",
      replayCaseNamePrefix: "",
      replayCopyFull: "复制回放代码",
      replayExportFull: "导出回放文件",
      replayCopySegment: "复制当前段",
      replaySegmentLabel: "分段回放",
      replaySegmentBoardTitle: "分段终盘快照",
      replaySegmentBoardEmpty: "该分段暂无终盘快照。",
      replaySegmentBoardLoading: "正在加载分段终盘快照...",
      replayGuest: "未登录，暂无可显示回放链。",
      replayNone: "当前无持有存档，暂无回放链。",
      replayLoading: "正在加载回放链...",
      replayLoadFailed: "回放链加载失败：",
      replayEmpty: "当前存档暂无回放段。",
      replayCopyFailed: "复制失败，请稍后重试。",
      replayCopyEmpty: "暂无可复制的回放内容。",
      replayCopyFullOk: "已复制可导入回放代码（优先最新可播放段）。",
      replayExportFullOk: "已导出可导入回放文件（优先最新可播放段）。",
      replayExportFailed: "导出失败，请稍后重试。",
      replayCopySegmentOk: "已复制当前段回放。",
      replaySegmentOptionPrefix: "第",
      replaySegmentOptionSuffix: "段",
      replaySegmentAnchorPrefix: "锚点",
      pagePrev: "上一页",
      pageNext: "下一页",
      refresh: "刷新列表",
      colCase: "档案",
      colHolder: "持有者",
      colUpdated: "更新时间",
      colClaim: "接档",
      claimManageTitle: "申请接档管理",
      claimManageGuest: "未登录，无法查看申请列表。",
      claimManageNoHeld: "你当前没有持有存档。",
      claimManageNone: "当前没有待处理接档申请。",
      claimManagePendingTarget: "已指定接档目标：",
      claimManageApprove: "批准交接",
      claimManageApplicantPrefix: "申请人：",
      claimManageCasePrefix: "档案：",
      incomingClaimTitle: "接档确认",
      incomingClaimGuest: "未登录，无法确认接档。",
      incomingClaimHasCase: "你已持有存档，需先移交或销档后再接档。",
      incomingClaimNone: "当前没有指定给你的待接档案。",
      incomingClaimConfirm: "确认接档",
      incomingClaimCasePrefix: "档案：",
      incomingClaimFromPrefix: "来自持有者：",
      labelCase: "档案 ID",
      labelTargetNickname: "目标用户昵称",
      casePlaceholder: "例如：档案-001",
      targetNicknamePlaceholder: "例如：玩家A",
      heldSnapshotBoardAria: "当前持有存档快照棋盘",
      segmentBoardAria: "选定分段的最后盘面",
      designateTarget: "指定递交",
      labelOp: "幂等操作 ID（可选）",
      labelPayload: "提交快照（JSON 或回放代码）",
      advancedToggleShow: "显示高级输入",
      advancedToggleHide: "收起高级输入",
      requestClaim: "申请接档",
      requestClaimed: "已申请",
      claimOwned: "当前持有",
      claim: "接档",
      create: "制档",
      load: "读档",
      destroy: "销档",
      submit: "提交进度",
      handoff: "批准交接",
      loading: "正在加载接力档案...",
      loaded: "接力档案已刷新。",
      empty: "暂无接力档案。",
      apiNotReady: "接力接口尚未部署（预期 /api/relay/*）。",
      needLogin: "请先登录账号后再执行接力写操作。",
      requireCase: "请先输入档案 ID。",
      requireTargetNickname: "请先输入目标用户昵称。",
      requirePayload: "请先输入提交内容。",
      requestClaimOk: "已申请，等待持有者批准",
      loginDetectedSyncing: "已检测到登录成功，正在同步接力档案...",
      createOk: "制档成功。",
      loadOk: "读档成功，快照已加载到输入框。",
      deleteOk: "销档成功。",
      deleteConfirm: "确认销档？该操作不可恢复。\n档案：",
      deleteCanceled: "已取消销档。",
      claimOk: "接档成功。",
      submitOk: "提交成功。",
      handoffOk: "已批准并完成移交，目标用户已获得该档案。",
      designateTargetOkPrefix: "已指定递交给用户：",
      unknownHolder: "暂无持有者",
      opFailed: "操作失败：",
      caseMissing: "档案不存在",
      caseExists: "档案已存在",
      holderAlreadyHasCase: "你已持有档案，无法再持有多个：",
      targetAlreadyHasCase: "目标用户已持有档案，无法接收：",
      targetNicknameNotFound: "未找到该昵称对应的用户：",
      approvalRequired: "需要持有者先批准你的接档申请。",
      requestPending: "你的接档申请仍在等待持有者批准。",
      requestRequired: "当前没有可批准的接档申请。",
      requestAlreadyExists: "已有其他用户正在申请该档案，请稍后再试。",
      requestSelfForbidden: "你已是该档案持有者，不能申请接档。",
      unauthorized: "登录已失效，请重新登录。",
      snapshotInvalid: "档案快照格式无效，无法载入5x5。",
      payloadOrBoardRequired: "请先去5x5无撤回版游玩，确保已有当前盘面存档。",
      extractedFrom5x5: "已从5x5无撤回版提取当前盘面并制档。",
      loadAndRedirecting: "读档成功，正在跳转到5x5无撤回版..."
    },
    en: {
      title: "5x5 Relay Mode (MVP)",
      subtitle: "Single-case relay: claim requires request and holder approval, with ownership retained until handoff or release.",
      navHome: "Home",
      navModes: "Modes",
      listTitle: "Relay Cases",
      actionTitle: "Relay Actions",
      open5x5: "Open 5x5 No-Undo",
      loginStateGuest: "Auth: Guest",
      loginStateAuthed: "Auth: User ",
      apiIdle: "API: Disconnected",
      apiConnected: "API: Connected ",
      apiUnavailable: "API: Relay endpoint unavailable",
      myCaseGuest: "Guest",
      myCaseNone: "No Case",
      myCasePrefix: "",
      heldSnapshotTitle: "Snapshot Of Current Held Case",
      heldSnapshotGuest: "Not signed in. No snapshot to display.",
      heldSnapshotNone: "No case currently held. No snapshot to display.",
      heldSnapshotLoading: "Loading snapshot of current held case...",
      heldSnapshotLoadFailed: "Failed to load snapshot: ",
      replayChainTitle: "Full Replay Aggregate",
      replayCaseNamePrefix: "",
      replayCopyFull: "Copy Replay Code",
      replayExportFull: "Export Replay File",
      replayCopySegment: "Copy Segment",
      replaySegmentLabel: "Segment Replay",
      replaySegmentBoardTitle: "Selected Segment End Snapshot",
      replaySegmentBoardEmpty: "No end-board snapshot for this segment.",
      replaySegmentBoardLoading: "Loading segment end-board snapshot...",
      replayGuest: "Not signed in. No replay chain to display.",
      replayNone: "No case currently held. No replay chain to display.",
      replayLoading: "Loading replay chain...",
      replayLoadFailed: "Failed to load replay chain: ",
      replayEmpty: "No replay segments for this case yet.",
      replayCopyFailed: "Copy failed. Please try again later.",
      replayCopyEmpty: "No replay content to copy.",
      replayCopyFullOk: "Importable replay copied (latest playable segment first).",
      replayExportFullOk: "Importable replay file exported (latest playable segment first).",
      replayExportFailed: "Export failed. Please try again later.",
      replayCopySegmentOk: "Current replay segment copied.",
      replaySegmentOptionPrefix: "Segment ",
      replaySegmentOptionSuffix: "",
      replaySegmentAnchorPrefix: "Anchor",
      pagePrev: "Prev",
      pageNext: "Next",
      refresh: "Refresh",
      colCase: "Case",
      colHolder: "Holder",
      colUpdated: "Updated At",
      colClaim: "Claim",
      claimManageTitle: "Claim Request Management",
      claimManageGuest: "Sign in to view claim requests.",
      claimManageNoHeld: "You do not currently hold any case.",
      claimManageNone: "No pending claim request.",
      claimManagePendingTarget: "Approved target: ",
      claimManageApprove: "Approve Handoff",
      claimManageApplicantPrefix: "Requester: ",
      claimManageCasePrefix: "Case: ",
      incomingClaimTitle: "Claim Confirmation",
      incomingClaimGuest: "Sign in to confirm claim.",
      incomingClaimHasCase: "You already hold a case. Hand off or delete it before claiming another.",
      incomingClaimNone: "No case has been assigned to you.",
      incomingClaimConfirm: "Confirm Claim",
      incomingClaimCasePrefix: "Case: ",
      incomingClaimFromPrefix: "Current holder: ",
      labelCase: "Case ID",
      labelTargetNickname: "Target User Nickname",
      casePlaceholder: "Example: case-001",
      targetNicknamePlaceholder: "Example: PlayerA",
      heldSnapshotBoardAria: "Current held-case snapshot board",
      segmentBoardAria: "Selected segment final board",
      designateTarget: "Designate Handoff",
      labelOp: "Idempotency Op ID (Optional)",
      labelPayload: "Submit Payload (JSON or replay code)",
      advancedToggleShow: "Show Advanced Inputs",
      advancedToggleHide: "Hide Advanced Inputs",
      requestClaim: "Request Claim",
      requestClaimed: "Requested",
      claimOwned: "Holding",
      claim: "Claim",
      create: "Create",
      load: "Load",
      destroy: "Delete",
      submit: "Submit",
      handoff: "Approve Handoff",
      loading: "Loading relay cases...",
      loaded: "Relay cases refreshed.",
      empty: "No relay case available.",
      apiNotReady: "Relay API is not deployed yet (expected /api/relay/*).",
      needLogin: "Please log in before relay write operations.",
      requireCase: "Please enter case id first.",
      requireTargetNickname: "Please enter target user nickname first.",
      requirePayload: "Please enter submit payload first.",
      requestClaimOk: "Claim request submitted. Waiting for holder approval.",
      loginDetectedSyncing: "Login detected. Syncing relay cases...",
      createOk: "Case created.",
      loadOk: "Snapshot loaded into payload field.",
      deleteOk: "Case deleted.",
      deleteConfirm: "Delete this case? This cannot be undone.\nCase: ",
      deleteCanceled: "Delete cancelled.",
      claimOk: "Claim succeeded.",
      submitOk: "Submit succeeded.",
      handoffOk: "Handoff approved and completed. Target user now holds this case.",
      designateTargetOkPrefix: "Handoff target designated: ",
      unknownHolder: "No holder",
      opFailed: "Operation failed: ",
      caseMissing: "Case not found",
      caseExists: "Case already exists",
      holderAlreadyHasCase: "You already hold a case: ",
      targetAlreadyHasCase: "Target user already holds a case: ",
      targetNicknameNotFound: "Target nickname not found: ",
      approvalRequired: "Holder approval is required before claim.",
      requestPending: "Your claim request is pending holder approval.",
      requestRequired: "No pending claim request to approve.",
      requestAlreadyExists: "Another user already has a pending claim request.",
      requestSelfForbidden: "You already hold this case.",
      unauthorized: "Session expired, please sign in again.",
      snapshotInvalid: "Invalid snapshot format, cannot load to 5x5.",
      payloadOrBoardRequired: "Play on 5x5 no-undo first so current board snapshot exists.",
      extractedFrom5x5: "Current 5x5 board snapshot extracted for archive.",
      loadAndRedirecting: "Snapshot loaded. Redirecting to 5x5 no-undo..."
    }
  };

  var state = {
    cases: [],
    casePage: 1,
    casePageSize: 10,
    loading: false,
    activeApiBase: "",
    heldSnapshotCaseId: "",
    replaySegments: [],
    replayActiveSegmentIndex: 0,
    replayFull: null,
    replayCaseId: "",
    language: "zh",
    advancedOpen: false,
    pendingClaimCaseMap: {},
    authWasLoggedIn: false,
    requestClaimCaseIdInFlight: ""
  };

  var refs = {};
  var noteTimerId = 0;

  var SNAPSHOT_TILE_VISUALS = {
    2: { bg: "#eee4da", color: "#776e65" },
    4: { bg: "#ede0c8", color: "#776e65" },
    8: { bg: "#f2b179", color: "#f9f6f2" },
    16: { bg: "#f59563", color: "#f9f6f2" },
    32: { bg: "#f67c5f", color: "#f9f6f2" },
    64: { bg: "#f65e3b", color: "#f9f6f2" },
    128: { bg: "#edcf72", color: "#f9f6f2" },
    256: { bg: "#edcc61", color: "#f9f6f2" },
    512: { bg: "#edc850", color: "#f9f6f2" },
    1024: { bg: "#edc53f", color: "#f9f6f2" },
    2048: { bg: "#edc22e", color: "#f9f6f2" }
  };

  function currentCopy() {
    return COPY[state.language] || COPY.zh;
  }

  function resolveLanguage() {
    var raw = toText(safeGetStorage(UI_LANG_STORAGE_KEY)).toLowerCase();
    if (raw.indexOf("en") === 0) return "en";
    return "zh";
  }

  function resolveToken() {
    return toText(safeGetStorage(STORAGE_TOKEN_KEY)).trim();
  }

  function resolveUserIdText() {
    return toText(safeGetStorage(STORAGE_USER_ID_KEY)).trim();
  }

  function clearRelayAuthStorage() {
    safeRemoveStorage(STORAGE_TOKEN_KEY);
    safeRemoveStorage(STORAGE_USER_ID_KEY);
    safeRemoveStorage("2048_auth_nickname_v1");
  }

  function setNote(text, type) {
    if (!refs.noteEl && !refs.noteSecondaryEl) return;
    if (noteTimerId) {
      global.clearTimeout(noteTimerId);
      noteTimerId = 0;
    }
    var message = toText(text);
    var applyNote = function (el) {
      if (!el) return;
      el.classList.toggle("is-error", type === "error");
      el.textContent = message;
    };
    applyNote(refs.noteEl);
    applyNote(refs.noteSecondaryEl);
    if (!message) return;
    noteTimerId = global.setTimeout(function () {
      var clearNote = function (el) {
        if (!el) return;
        el.textContent = "";
        el.classList.remove("is-error");
      };
      clearNote(refs.noteEl);
      clearNote(refs.noteSecondaryEl);
      noteTimerId = 0;
    }, NOTE_AUTO_HIDE_MS);
  }

  function setApiPill(text) {
    if (!refs.apiPill) return;
    refs.apiPill.textContent = toText(text);
  }

  function setLoginPill() {
    if (!refs.loginPill) return;
    var copy = currentCopy();
    var userIdText = resolveUserIdText();
    if (!userIdText) {
      refs.loginPill.textContent = copy.loginStateGuest;
      return;
    }
    refs.loginPill.textContent = copy.loginStateAuthed + userIdText;
  }

  function resolveMyHeldCaseId() {
    var userId = resolveUserIdText();
    if (!userId) return "";
    for (var i = 0; i < state.cases.length; i += 1) {
      var item = state.cases[i];
      if (toText(item && item.holderUserId).trim() === userId) {
        return toText(item.caseId).trim();
      }
    }
    return "";
  }

  function setMyCasePill() {
    if (!refs.myCasePill) return;
    var copy = currentCopy();
    var userId = resolveUserIdText();
    if (!userId) {
      refs.myCasePill.textContent = copy.myCaseGuest;
      return;
    }
    var caseId = resolveMyHeldCaseId();
    if (!caseId) {
      refs.myCasePill.textContent = copy.myCaseNone;
      return;
    }
    refs.myCasePill.textContent = copy.myCasePrefix + caseId;
  }

  function setHeldSnapshotHint(text) {
    if (!refs.heldSnapshotHintEl) return;
    refs.heldSnapshotHintEl.textContent = toText(text);
  }

  function setReplaySegmentBoardHint(text) {
    if (!refs.replaySegmentBoardHintEl) return;
    refs.replaySegmentBoardHintEl.textContent = toText(text);
  }

  function resolveSnapshotBoardRenderPayload(snapshotLike) {
    var compact = buildCompactRelaySnapshot(snapshotLike);
    if (!compact) return null;
    var board = normalizeBoardMatrix(compact.board);
    if (!board || board.length <= 0 || board[0].length <= 0) return null;
    var fixed = [];
    for (var y = 0; y < 5; y += 1) {
      var row = [];
      for (var x = 0; x < 5; x += 1) {
        var value = 0;
        if (Array.isArray(board[y])) {
          value = Number(board[y][x]) || 0;
        }
        row.push(value > 0 ? Math.floor(value) : 0);
      }
      fixed.push(row);
    }
    return { board: fixed };
  }

  function resolveSnapshotTileVisual(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    n = Math.floor(n);
    if (Object.prototype.hasOwnProperty.call(SNAPSHOT_TILE_VISUALS, n)) {
      return SNAPSHOT_TILE_VISUALS[n];
    }
    if (n > 2048) {
      return { bg: "#3c3a32", color: "#f9f6f2" };
    }
    return { bg: "#cdc1b4", color: "#776e65" };
  }

  function resolveSnapshotTileFontSize(text) {
    var length = toText(text).length;
    if (length >= 7) return "18px";
    if (length >= 6) return "22px";
    if (length >= 5) return "26px";
    return "";
  }

  function renderSnapshotBoard(boardEl, snapshotLike) {
    if (!boardEl) return false;
    var payload = resolveSnapshotBoardRenderPayload(snapshotLike);
    boardEl.innerHTML = "";

    var width = 5;
    var height = 5;
    boardEl.style.gridTemplateColumns = "repeat(" + width + ", 1fr)";
    boardEl.style.aspectRatio = String(width) + " / " + String(height);

    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        var value = 0;
        if (payload && payload.board && Array.isArray(payload.board[y])) {
          value = Number(payload.board[y][x]) || 0;
        }
        var cell = document.createElement("div");
        cell.className = "relay-snapshot-cell";
        if (value > 0) {
          var tile = document.createElement("div");
          tile.className = "relay-snapshot-tile";
          var display = String(Math.floor(value));
          var visual = resolveSnapshotTileVisual(value);
          if (visual) {
            tile.style.background = visual.bg;
            tile.style.color = visual.color;
          }
          var customFontSize = resolveSnapshotTileFontSize(display);
          if (customFontSize) tile.style.fontSize = customFontSize;
          tile.textContent = display;
          cell.appendChild(tile);
        }
        boardEl.appendChild(cell);
      }
    }
    return !!payload;
  }

  function renderHeldSnapshotBoard(snapshotLike) {
    return renderSnapshotBoard(refs.heldSnapshotBoardEl, snapshotLike);
  }

  function renderReplaySegmentBoard(snapshotLike) {
    return renderSnapshotBoard(refs.replaySegmentBoardEl, snapshotLike);
  }

  function resolveReplaySegmentEndSnapshot(segmentLike) {
    if (!(segmentLike && typeof segmentLike === "object")) return null;
    var segment = segmentLike;
    if (segment.end_snapshot && typeof segment.end_snapshot === "object") return segment.end_snapshot;
    if (segment.endSnapshot && typeof segment.endSnapshot === "object") return segment.endSnapshot;
    if (segment.snapshot && typeof segment.snapshot === "object") return segment.snapshot;
    if (segment.end_anchor && typeof segment.end_anchor === "object") {
      if (segment.end_anchor.snapshot && typeof segment.end_anchor.snapshot === "object") {
        return segment.end_anchor.snapshot;
      }
      if (segment.end_anchor.payload && typeof segment.end_anchor.payload === "object") {
        return segment.end_anchor.payload;
      }
    }
    return null;
  }

  function setHeldSnapshotPlaceholder() {
    var copy = currentCopy();
    var userId = resolveUserIdText();
    if (!userId) {
      renderHeldSnapshotBoard(null);
      setHeldSnapshotHint(copy.heldSnapshotGuest);
      return;
    }
    var caseId = resolveMyHeldCaseId();
    if (!caseId) {
      renderHeldSnapshotBoard(null);
      setHeldSnapshotHint(copy.heldSnapshotNone);
      return;
    }
    setHeldSnapshotHint("");
  }

  async function refreshHeldSnapshot() {
    var copy = currentCopy();
    var userId = resolveUserIdText();
    if (!userId) {
      state.heldSnapshotCaseId = "";
      renderHeldSnapshotBoard(null);
      setHeldSnapshotHint(copy.heldSnapshotGuest);
      return;
    }
    var caseId = resolveMyHeldCaseId();
    if (!caseId) {
      state.heldSnapshotCaseId = "";
      renderHeldSnapshotBoard(null);
      setHeldSnapshotHint(copy.heldSnapshotNone);
      return;
    }
    state.heldSnapshotCaseId = caseId;
    setHeldSnapshotHint(copy.heldSnapshotLoading);
    try {
      var payload = await requestRelayApi("/relay/cases/" + encodeURIComponent(caseId) + "/snapshot", {
        method: "GET"
      });
      var rawSnapshot = payload && payload.case ? payload.case.snapshot : (payload ? payload.snapshot : null);
      var snapshot = extractSnapshotPayload(rawSnapshot) || rawSnapshot;
      var rendered = renderHeldSnapshotBoard(snapshot);
      if (rendered) {
        setHeldSnapshotHint("");
      } else {
        renderHeldSnapshotBoard(null);
        setHeldSnapshotHint(copy.snapshotInvalid);
      }
    } catch (err) {
      renderHeldSnapshotBoard(null);
      setHeldSnapshotHint(copy.heldSnapshotLoadFailed + toText(err && err.message));
    }
  }

  function setReplayFullText(text) {
    if (!refs.replayFullEl) return;
    refs.replayFullEl.value = toText(text);
  }

  function setReplaySegmentText(text) {
    if (!refs.replaySegmentEl) return;
    refs.replaySegmentEl.value = toText(text);
  }

  function setReplayCaseNameText(text) {
    if (!refs.replayCaseNameEl) return;
    refs.replayCaseNameEl.textContent = toText(text);
  }

  function renderAdvancedPanelState() {
    if (!refs.advancedPanelEl || !refs.advancedToggleBtn) return;
    refs.advancedPanelEl.hidden = !state.advancedOpen;
    refs.advancedToggleBtn.setAttribute("aria-expanded", state.advancedOpen ? "true" : "false");
    var copy = currentCopy();
    refs.advancedToggleBtn.textContent = state.advancedOpen
      ? copy.advancedToggleHide
      : copy.advancedToggleShow;
  }

  function serializeJsonDisplay(value) {
    if (value == null) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch (_err) {
      return toText(value);
    }
  }

  function resetReplayChainState() {
    state.replaySegments = [];
    state.replayActiveSegmentIndex = 0;
    state.replayFull = null;
    state.replayCaseId = "";
    if (refs.replaySegmentSelect) {
      refs.replaySegmentSelect.innerHTML = "";
    }
    renderReplaySegmentBoard(null);
    setReplaySegmentBoardHint(currentCopy().replaySegmentBoardEmpty);
  }

  function buildReplaySegmentOptionLabel(segment, activeIndex) {
    var copy = currentCopy();
    var index = Number(segment && segment.index);
    if (!Number.isFinite(index) || index <= 0) index = 1;
    var ownerNickname = toText(segment && segment.owner_nickname).trim() || copy.unknownHolder;
    return (
      copy.replaySegmentOptionPrefix +
      index +
      copy.replaySegmentOptionSuffix +
      " | " +
      ownerNickname
    );
  }

  function renderReplaySegmentSelect() {
    if (!refs.replaySegmentSelect) return;
    refs.replaySegmentSelect.innerHTML = "";
    var copy = currentCopy();
    if (!Array.isArray(state.replaySegments) || state.replaySegments.length === 0) {
      var emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = copy.replayEmpty;
      refs.replaySegmentSelect.appendChild(emptyOption);
      return;
    }
    for (var i = 0; i < state.replaySegments.length; i += 1) {
      var segment = state.replaySegments[i] || {};
      var option = document.createElement("option");
      option.value = toText(segment.segment_id || segment.index || "");
      option.textContent = buildReplaySegmentOptionLabel(segment, state.replayActiveSegmentIndex);
      refs.replaySegmentSelect.appendChild(option);
    }
    var selectedIndex = 0;
    for (var s = 0; s < state.replaySegments.length; s += 1) {
      if (Number(state.replaySegments[s] && state.replaySegments[s].index) === Number(state.replayActiveSegmentIndex)) {
        selectedIndex = s;
        break;
      }
    }
    refs.replaySegmentSelect.selectedIndex = selectedIndex;
  }

  function updateReplaySegmentDisplay() {
    var copy = currentCopy();
    if (!Array.isArray(state.replaySegments) || state.replaySegments.length === 0) {
      setReplaySegmentText(copy.replayEmpty);
      renderReplaySegmentBoard(null);
      setReplaySegmentBoardHint(copy.replaySegmentBoardEmpty);
      return;
    }
    var selectedSegment = null;
    if (refs.replaySegmentSelect) {
      var selectedValue = toText(refs.replaySegmentSelect.value).trim();
      if (selectedValue) {
        for (var i = 0; i < state.replaySegments.length; i += 1) {
          var candidate = state.replaySegments[i] || {};
          if (toText(candidate.segment_id || candidate.index).trim() === selectedValue) {
            selectedSegment = candidate;
            break;
          }
        }
      }
    }
    if (!selectedSegment) selectedSegment = state.replaySegments[0];
    setReplaySegmentText(serializeJsonDisplay(selectedSegment));
    var selectedEndSnapshot = resolveReplaySegmentEndSnapshot(selectedSegment);
    var rendered = renderReplaySegmentBoard(selectedEndSnapshot);
    setReplaySegmentBoardHint(rendered ? "" : copy.replaySegmentBoardEmpty);
  }

  function setReplayChainPlaceholder() {
    var copy = currentCopy();
    var userId = resolveUserIdText();
    if (!userId) {
      resetReplayChainState();
      setReplayCaseNameText(copy.myCaseGuest);
      setReplayFullText(copy.replayGuest);
      setReplaySegmentText(copy.replayGuest);
      renderReplaySegmentBoard(null);
      setReplaySegmentBoardHint(copy.replayGuest);
      return false;
    }
    var caseId = resolveMyHeldCaseId();
    if (!caseId) {
      resetReplayChainState();
      setReplayCaseNameText(copy.myCaseNone);
      setReplayFullText(copy.replayNone);
      setReplaySegmentText(copy.replayNone);
      renderReplaySegmentBoard(null);
      setReplaySegmentBoardHint(copy.replayNone);
      return false;
    }
    setReplayCaseNameText(copy.replayCaseNamePrefix + caseId);
    return true;
  }

  async function refreshReplayChain() {
    var copy = currentCopy();
    if (!setReplayChainPlaceholder()) return;
    var caseId = resolveMyHeldCaseId();
    if (!caseId) return;
    state.replayCaseId = caseId;
    setReplayCaseNameText(copy.replayCaseNamePrefix + caseId);
    setReplayFullText(copy.replayLoading);
    setReplaySegmentText(copy.replayLoading);
    renderReplaySegmentBoard(null);
    setReplaySegmentBoardHint(copy.replaySegmentBoardLoading);
    try {
      var payload = await requestRelayApi("/relay/cases/" + encodeURIComponent(caseId) + "/replay", {
        method: "GET"
      });
      var caseData = payload && payload.case ? payload.case : {};
      var fullReplay = payload && payload.full_replay ? payload.full_replay : {};
      var segments = Array.isArray(caseData.replay_segments) ? caseData.replay_segments : [];
      state.replaySegments = segments;
      state.replayActiveSegmentIndex = Number(caseData.active_segment_index || 0);
      state.replayFull = fullReplay || null;
      state.replayCaseId = toText(caseData.case_id).trim() || caseId;
      setReplayCaseNameText(copy.replayCaseNamePrefix + state.replayCaseId);
      renderReplaySegmentSelect();
      updateReplaySegmentDisplay();
      setReplayFullText(serializeJsonDisplay(fullReplay));
    } catch (err) {
      resetReplayChainState();
      setReplayCaseNameText(copy.replayCaseNamePrefix + caseId);
      setReplayFullText(copy.replayLoadFailed + toText(err && err.message));
      setReplaySegmentText(copy.replayLoadFailed + toText(err && err.message));
      renderReplaySegmentBoard(null);
      setReplaySegmentBoardHint(copy.replayLoadFailed + toText(err && err.message));
    }
  }

  function resolveSelectedReplaySegment() {
    if (!Array.isArray(state.replaySegments) || state.replaySegments.length === 0) return null;
    if (refs.replaySegmentSelect) {
      var selectedValue = toText(refs.replaySegmentSelect.value).trim();
      if (selectedValue) {
        for (var i = 0; i < state.replaySegments.length; i += 1) {
          var candidate = state.replaySegments[i] || {};
          if (toText(candidate.segment_id || candidate.index).trim() === selectedValue) {
            return candidate;
          }
        }
      }
    }
    return state.replaySegments[0] || null;
  }

  function serializeReplayForClipboard(value) {
    if (typeof value === "string") return value;
    if (value == null) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch (_err) {
      return toText(value);
    }
  }

  function resolveReplayV1Base64Prefix() {
    var gameManager = global && global.GameManager ? global.GameManager : null;
    var runtimePrefix = gameManager && typeof gameManager.REPLAY_V1_RPL_BASE64_PREFIX === "string"
      ? gameManager.REPLAY_V1_RPL_BASE64_PREFIX
      : "";
    var prefix = toText(runtimePrefix).trim();
    return prefix || DEFAULT_REPLAY_V1_BASE64_PREFIX;
  }

  function normalizeReplayV1Base64Code(raw) {
    var text = toText(raw).trim();
    if (!text) return "";
    var prefix = resolveReplayV1Base64Prefix();
    if (text.indexOf(prefix) !== 0) return "";
    if (text.length <= prefix.length) return "";
    return text;
  }

  function tryResolveImportableReplayPayload(raw, depth) {
    var level = Number(depth) || 0;
    if (level > 8) return null;
    if (typeof raw === "string") {
      return normalizeReplayV1Base64Code(raw) || null;
    }
    if (!(raw && typeof raw === "object")) return null;

    if (Array.isArray(raw.combined_replay)) {
      for (var i = raw.combined_replay.length - 1; i >= 0; i -= 1) {
        var combinedItem = raw.combined_replay[i];
        var combinedPayload = tryResolveImportableReplayPayload(combinedItem && combinedItem.replay, level + 1);
        if (combinedPayload) return combinedPayload;
      }
    }

    if (Array.isArray(raw.replay_segments)) {
      for (var j = raw.replay_segments.length - 1; j >= 0; j -= 1) {
        var segmentItem = raw.replay_segments[j];
        var segmentPayload = tryResolveImportableReplayPayload(segmentItem && segmentItem.replay, level + 1);
        if (segmentPayload) return segmentPayload;
      }
    }

    var kind = toText(raw.kind).trim().toLowerCase();
    if (kind === "code" || kind === "payload") {
      var payloadFromKind = tryResolveImportableReplayPayload(raw.value, level + 1);
      if (payloadFromKind) return payloadFromKind;
    }

    var replayCode = normalizeReplayV1Base64Code(raw.replay_code || raw.replayCode || raw.replay_string || raw.replayString);
    if (replayCode) return replayCode;

    if (raw.replay_payload != null) {
      var payloadFromReplayPayload = tryResolveImportableReplayPayload(raw.replay_payload, level + 1);
      if (payloadFromReplayPayload) return payloadFromReplayPayload;
    }
    if (raw.replayPayload != null) {
      var payloadFromReplayPayloadCamel = tryResolveImportableReplayPayload(raw.replayPayload, level + 1);
      if (payloadFromReplayPayloadCamel) return payloadFromReplayPayloadCamel;
    }

    if (raw.replay != null) {
      var payloadFromReplay = tryResolveImportableReplayPayload(raw.replay, level + 1);
      if (payloadFromReplay) return payloadFromReplay;
    }

    if (raw.full_replay != null) {
      var payloadFromFullReplay = tryResolveImportableReplayPayload(raw.full_replay, level + 1);
      if (payloadFromFullReplay) return payloadFromFullReplay;
    }

    return null;
  }

  function buildImportableReplayText(raw) {
    var payload = tryResolveImportableReplayPayload(raw, 0);
    if (!payload) return "";
    return typeof payload === "string" ? payload : "";
  }

  async function writeClipboardText(text) {
    var value = toText(text);
    if (!value) return false;
    if (global.navigator && global.navigator.clipboard && typeof global.navigator.clipboard.writeText === "function") {
      try {
        await global.navigator.clipboard.writeText(value);
        return true;
      } catch (_err) {
      }
    }
    if (!document || typeof document.createElement !== "function") return false;
    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    var copied = false;
    try {
      copied = !!document.execCommand("copy");
    } catch (_err2) {
      copied = false;
    }
    document.body.removeChild(textarea);
    return copied;
  }

  async function onReplayCopyFull() {
    var copy = currentCopy();
    var replayPayload = state.replayFull;
    if (!replayPayload) {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var text = buildImportableReplayText(replayPayload);
    if (!text) {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var copied = await writeClipboardText(text);
    if (!copied) {
      setNote(copy.replayCopyFailed, "error");
      return;
    }
    setNote(copy.replayCopyFullOk, "");
  }

  function buildReplayExportFileName(caseId) {
    var normalizedCaseId = toText(caseId).trim() || "relay-case";
    var safeCaseId = normalizedCaseId.replace(/[^a-zA-Z0-9_-]+/g, "_");
    var now = new Date();
    var yyyy = String(now.getFullYear());
    var mm = String(now.getMonth() + 1).padStart(2, "0");
    var dd = String(now.getDate()).padStart(2, "0");
    var hh = String(now.getHours()).padStart(2, "0");
    var mi = String(now.getMinutes()).padStart(2, "0");
    var ss = String(now.getSeconds()).padStart(2, "0");
    return safeCaseId + "_replay_" + yyyy + mm + dd + "_" + hh + mi + ss + ".json";
  }

  function downloadTextFile(filename, text) {
    if (!document || typeof document.createElement !== "function" || typeof global.URL === "undefined") {
      return false;
    }
    try {
      var blob = new Blob([toText(text)], { type: "application/json;charset=utf-8" });
      var objectUrl = global.URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = toText(filename).trim() || "relay_replay.json";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      global.setTimeout(function () {
        try { global.URL.revokeObjectURL(objectUrl); } catch (_err) {}
      }, 0);
      return true;
    } catch (_err2) {
      return false;
    }
  }

  function onReplayExportFull() {
    var copy = currentCopy();
    var replayPayload = state.replayFull;
    if (!replayPayload) {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var caseId = state.replayCaseId || resolveMyHeldCaseId() || "";
    var text = buildImportableReplayText(replayPayload);
    if (!text) {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var filename = buildReplayExportFileName(caseId);
    var ok = downloadTextFile(filename, text);
    if (!ok) {
      setNote(copy.replayExportFailed, "error");
      return;
    }
    setNote(copy.replayExportFullOk, "");
  }

  async function onReplayCopySegment() {
    var copy = currentCopy();
    var segment = resolveSelectedReplaySegment();
    if (!segment) {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var replayPayload = segment && segment.replay ? segment.replay : null;
    if (!replayPayload || replayPayload.kind === "none") {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var text = buildImportableReplayText(replayPayload);
    if (!text) {
      setNote(copy.replayCopyEmpty, "error");
      return;
    }
    var copied = await writeClipboardText(text);
    if (!copied) {
      setNote(copy.replayCopyFailed, "error");
      return;
    }
    setNote(copy.replayCopySegmentOk, "");
  }

  function toIsoLike(value) {
    var date = value ? new Date(value) : null;
    if (!(date && Number.isFinite(date.getTime()))) return "-";
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    var hh = String(date.getHours()).padStart(2, "0");
    var mm = String(date.getMinutes()).padStart(2, "0");
    var ss = String(date.getSeconds()).padStart(2, "0");
    return y + "-" + m + "-" + d + " " + hh + ":" + mm + ":" + ss;
  }

  function normalizeCaseListPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.cases)) return payload.cases;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
  }

  function normalizeCaseRow(raw) {
    var record = raw && typeof raw === "object" ? raw : {};
    var holderRaw = record.holder_user_id || record.holderUserId || "";
    var creatorRaw = record.created_by_user_id || record.createdByUserId || "";
    var holderText = toText(holderRaw).trim();
    var creatorText = toText(creatorRaw).trim();
    var claimRequestUserIdRaw = record.claim_request_user_id || record.claimRequestUserId || "";
    var claimRequestUserId = toText(claimRequestUserIdRaw).trim();
    var handoffTargetUserIdRaw = record.handoff_target_user_id || record.handoffTargetUserId || "";
    var handoffTargetUserId = toText(handoffTargetUserIdRaw).trim();
    var holderNicknameRaw = record.holder_nickname || record.holderNickname || "";
    var creatorNicknameRaw = record.created_by_nickname || record.createdByNickname || "";
    var handoffTargetNicknameRaw = record.handoff_target_nickname || record.handoffTargetNickname || "";
    var holderNickname = toText(holderNicknameRaw).trim();
    var creatorNickname = toText(creatorNicknameRaw).trim();
    var handoffTargetNickname = toText(handoffTargetNicknameRaw).trim();
    var resolvedHolderById = holderText || creatorText;
    var resolvedHolderNickname = holderText ? holderNickname : (creatorText ? creatorNickname : "");
    var claimRequestNicknameRaw = record.claim_request_nickname || record.claimRequestNickname || "";
    var claimRequestNickname = toText(claimRequestNicknameRaw).trim();
    return {
      caseId: toText(record.case_id || record.caseId || record.id).trim(),
      board: toText(record.board || record.board_size || record.boardSize || "5x5").trim(),
      holderUserId: resolvedHolderById,
      holderNickname: resolvedHolderNickname,
      claimRequestUserId: claimRequestUserId,
      claimRequestNickname: claimRequestNickname,
      handoffTargetUserId: handoffTargetUserId,
      handoffTargetNickname: handoffTargetNickname,
      updatedAt: toText(record.updated_at || record.updatedAt || "").trim()
    };
  }

  function resolveCaseTotalPages() {
    var total = Array.isArray(state.cases) ? state.cases.length : 0;
    var pageSize = Number(state.casePageSize);
    if (!Number.isFinite(pageSize) || pageSize <= 0) pageSize = 10;
    return Math.max(1, Math.ceil(total / pageSize));
  }

  function clampCasePage() {
    var totalPages = resolveCaseTotalPages();
    var page = Number(state.casePage);
    if (!Number.isFinite(page) || page <= 0) page = 1;
    page = Math.floor(page);
    if (page > totalPages) page = totalPages;
    state.casePage = page;
    return page;
  }

  function renderCasePager() {
    var totalPages = resolveCaseTotalPages();
    var page = clampCasePage();
    if (refs.pageInfo) refs.pageInfo.textContent = String(page) + " / " + String(totalPages);
    if (refs.pagePrevBtn) refs.pagePrevBtn.disabled = !!state.loading || page <= 1;
    if (refs.pageNextBtn) refs.pageNextBtn.disabled = !!state.loading || page >= totalPages;
  }

  function renderCaseTable() {
    if (!refs.tableBody) return;
    refs.tableBody.innerHTML = "";
    var copy = currentCopy();
    var page = clampCasePage();
    var pageSize = Number(state.casePageSize);
    if (!Number.isFinite(pageSize) || pageSize <= 0) pageSize = 10;
    if (!Array.isArray(state.cases) || state.cases.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 4;
      emptyCell.textContent = copy.empty;
      emptyRow.appendChild(emptyCell);
      refs.tableBody.appendChild(emptyRow);
      renderCasePager();
      return;
    }
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, state.cases.length);
    var currentUserId = resolveUserIdText();
    for (var i = start; i < end; i += 1) {
      var rowData = state.cases[i];
      var tr = document.createElement("tr");
      var caseIdText = toText(rowData.caseId).trim();
      var cells = [
        caseIdText || "-",
        rowData.holderNickname || copy.unknownHolder,
        toIsoLike(rowData.updatedAt)
      ];
      for (var c = 0; c < cells.length; c += 1) {
        var td = document.createElement("td");
        td.textContent = cells[c];
        tr.appendChild(td);
      }
      var claimTd = document.createElement("td");
      var claimBtn = document.createElement("button");
      claimBtn.type = "button";
      claimBtn.className = "relay-btn relay-btn--ghost relay-row-claim-btn";
      var isHeldBySelf = !!currentUserId && toText(rowData.holderUserId).trim() === currentUserId;
      var requestedBySelf = !!currentUserId && toText(rowData.claimRequestUserId).trim() === currentUserId;
      var requestedLocal = !!(caseIdText && state.pendingClaimCaseMap && state.pendingClaimCaseMap[caseIdText]);
      var requestInFlight = caseIdText && toText(state.requestClaimCaseIdInFlight).trim() === caseIdText;
      var isRequested = requestedBySelf || requestedLocal;
      claimBtn.textContent = isHeldBySelf
        ? copy.claimOwned
        : (isRequested ? copy.requestClaimed : copy.requestClaim);
      if (state.loading || !caseIdText || isHeldBySelf || isRequested || requestInFlight) {
        claimBtn.disabled = true;
      } else {
        (function bindRowClaim(caseIdValue) {
          claimBtn.addEventListener("click", function () {
            if (state.loading) return;
            onRequestClaimByCaseId(caseIdValue);
          });
        })(toText(rowData.caseId).trim());
      }
      claimTd.appendChild(claimBtn);
      tr.appendChild(claimTd);
      refs.tableBody.appendChild(tr);
    }
    renderCasePager();
  }

  function resolveDisplayUserLabel(nickname, userId, fallback) {
    var nick = toText(nickname).trim();
    if (nick) return nick;
    var uid = toText(userId).trim();
    if (uid) return "#" + uid;
    return toText(fallback || "-");
  }

  function resolveMyHeldCaseRow() {
    var heldCaseId = resolveMyHeldCaseId();
    if (!heldCaseId || !Array.isArray(state.cases)) return null;
    for (var i = 0; i < state.cases.length; i += 1) {
      var item = state.cases[i] || {};
      if (toText(item.caseId).trim() === heldCaseId) return item;
    }
    return null;
  }

  function renderClaimModules() {
    var requestBody = refs.requestManageBodyEl;
    var incomingBody = refs.incomingClaimBodyEl;
    if (!requestBody && !incomingBody) return;
    var copy = currentCopy();
    var currentUserId = resolveUserIdText();

    if (requestBody) {
      requestBody.innerHTML = "";
      if (!currentUserId) {
        var requestGuest = document.createElement("p");
        requestGuest.className = "relay-claim-empty";
        requestGuest.textContent = copy.claimManageGuest;
        requestBody.appendChild(requestGuest);
      } else {
        var heldCase = resolveMyHeldCaseRow();
        if (!heldCase) {
          var requestNoHeld = document.createElement("p");
          requestNoHeld.className = "relay-claim-empty";
          requestNoHeld.textContent = copy.claimManageNoHeld;
          requestBody.appendChild(requestNoHeld);
        } else {
          var requesterId = toText(heldCase.claimRequestUserId).trim();
          var approvedTargetId = toText(heldCase.handoffTargetUserId).trim();
          if (!requesterId && !approvedTargetId) {
            var requestNone = document.createElement("p");
            requestNone.className = "relay-claim-empty";
            requestNone.textContent = copy.claimManageNone;
            requestBody.appendChild(requestNone);
          } else if (!requesterId && approvedTargetId) {
            var pendingOnly = document.createElement("p");
            pendingOnly.className = "relay-claim-item-main";
            pendingOnly.textContent =
              copy.claimManageCasePrefix + toText(heldCase.caseId).trim() +
              " · " + copy.claimManagePendingTarget +
              resolveDisplayUserLabel(
                heldCase.handoffTargetNickname,
                approvedTargetId,
                copy.unknownHolder
              );
            requestBody.appendChild(pendingOnly);
          } else {
            var requestItem = document.createElement("div");
            requestItem.className = "relay-claim-item";
            var requestMain = document.createElement("p");
            requestMain.className = "relay-claim-item-main";
            var requesterLabel = resolveDisplayUserLabel(
              heldCase.claimRequestNickname,
              requesterId,
              copy.unknownHolder
            );
            requestMain.textContent =
              copy.claimManageCasePrefix + toText(heldCase.caseId).trim() +
              " · " + copy.claimManageApplicantPrefix + requesterLabel;
            requestItem.appendChild(requestMain);

            if (approvedTargetId) {
              var approvedHint = document.createElement("p");
              approvedHint.className = "relay-claim-item-main";
              approvedHint.textContent =
                copy.claimManagePendingTarget +
                resolveDisplayUserLabel(
                  heldCase.handoffTargetNickname,
                  approvedTargetId,
                  copy.unknownHolder
                );
              requestItem.appendChild(approvedHint);
            } else {
              var requestActions = document.createElement("div");
              requestActions.className = "relay-claim-actions";
              var approveBtn = document.createElement("button");
              approveBtn.type = "button";
              approveBtn.className = "relay-btn";
              approveBtn.textContent = copy.claimManageApprove;
              approveBtn.disabled = !!state.loading;
              (function bindApprove(caseIdValue, targetUserIdValue) {
                approveBtn.addEventListener("click", function () {
                  if (state.loading) return;
                  onHandoffByCaseId(caseIdValue, targetUserIdValue);
                });
              })(toText(heldCase.caseId).trim(), requesterId);
              requestActions.appendChild(approveBtn);
              requestItem.appendChild(requestActions);
            }

            requestBody.appendChild(requestItem);
          }
        }
      }
    }

    if (incomingBody) {
      incomingBody.innerHTML = "";
      if (!currentUserId) {
        var incomingGuest = document.createElement("p");
        incomingGuest.className = "relay-claim-empty";
        incomingGuest.textContent = copy.incomingClaimGuest;
        incomingBody.appendChild(incomingGuest);
      } else if (resolveMyHeldCaseId()) {
        var incomingHasCase = document.createElement("p");
        incomingHasCase.className = "relay-claim-empty";
        incomingHasCase.textContent = copy.incomingClaimHasCase;
        incomingBody.appendChild(incomingHasCase);
      } else {
        var incomingItems = [];
        for (var c = 0; c < state.cases.length; c += 1) {
          var row = state.cases[c] || {};
          if (toText(row.handoffTargetUserId).trim() !== currentUserId) continue;
          incomingItems.push(row);
        }
        if (incomingItems.length <= 0) {
          var incomingNone = document.createElement("p");
          incomingNone.className = "relay-claim-empty";
          incomingNone.textContent = copy.incomingClaimNone;
          incomingBody.appendChild(incomingNone);
        } else {
          for (var k = 0; k < incomingItems.length; k += 1) {
            var incomingCase = incomingItems[k];
            var incomingItem = document.createElement("div");
            incomingItem.className = "relay-claim-item";
            var incomingMain = document.createElement("p");
            incomingMain.className = "relay-claim-item-main";
            incomingMain.textContent =
              copy.incomingClaimCasePrefix + toText(incomingCase.caseId).trim() +
              " · " + copy.incomingClaimFromPrefix +
              resolveDisplayUserLabel(
                incomingCase.holderNickname,
                incomingCase.holderUserId,
                copy.unknownHolder
              );
            incomingItem.appendChild(incomingMain);

            var incomingActions = document.createElement("div");
            incomingActions.className = "relay-claim-actions";
            var confirmBtn = document.createElement("button");
            confirmBtn.type = "button";
            confirmBtn.className = "relay-btn";
            confirmBtn.textContent = copy.incomingClaimConfirm;
            confirmBtn.disabled = !!state.loading;
            (function bindClaim(caseIdValue) {
              confirmBtn.addEventListener("click", function () {
                if (state.loading) return;
                onClaimByCaseId(caseIdValue);
              });
            })(toText(incomingCase.caseId).trim());
            incomingActions.appendChild(confirmBtn);
            incomingItem.appendChild(incomingActions);
            incomingBody.appendChild(incomingItem);
          }
        }
      }
    }
  }

  function resolveTimeoutMs() {
    return resolveApiTimeoutMs(DEFAULT_TIMEOUT_MS);
  }

  async function fetchWithTimeout(url, requestInit, timeoutMs) {
    var ms = Number(timeoutMs);
    if (!Number.isFinite(ms) || ms <= 0) ms = DEFAULT_TIMEOUT_MS;
    ms = Math.floor(ms);

    if (typeof global.AbortController !== "function") {
      return callFetch(url, requestInit);
    }

    var controller = new global.AbortController();
    var timer = global.setTimeout(function () {
      controller.abort();
    }, ms);
    var init = Object.assign({}, requestInit || {});
    init.signal = controller.signal;
    try {
      return await callFetch(url, init);
    } finally {
      global.clearTimeout(timer);
    }
  }

  function parseErrorCode(payload) {
    if (!payload || typeof payload !== "object") return "";
    return toText(payload.error_code || payload.code || payload.error).trim();
  }

  async function requestRelayApi(path, options) {
    var requestOptions = options && typeof options === "object" ? options : {};
    var method = toText(requestOptions.method || "GET").toUpperCase();
    var body = requestOptions.body;
    var idempotencyKey = toText(requestOptions.idempotencyKey).trim();
    var token = resolveToken();
    var bases = buildApiBaseCandidates();
    if (!Array.isArray(bases) || bases.length === 0) {
      throw new Error("api_base_unavailable");
    }
    var preferredBase = toText(state.activeApiBase).replace(/\/+$/, "");
    if (preferredBase) {
      var orderedBases = [preferredBase];
      for (var b = 0; b < bases.length; b += 1) {
        var normalizedBase = toText(bases[b]).replace(/\/+$/, "");
        if (!normalizedBase || normalizedBase === preferredBase) continue;
        orderedBases.push(normalizedBase);
      }
      bases = orderedBases;
    }

    var timeoutMs = resolveTimeoutMs();
    var lastErr = null;
    var fallbackUnavailableCount = 0;

    for (var i = 0; i < bases.length; i += 1) {
      var base = toText(bases[i]).replace(/\/+$/, "");
      if (!base) continue;
      var url = base + path;
      var headers = { Accept: "application/json" };
      if (token) headers.Authorization = "Bearer " + token;
      if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
      var requestInit = { method: method, headers: headers };
      if (body != null) {
        headers["Content-Type"] = "application/json";
        requestInit.body = JSON.stringify(body);
      }
      var allowFallback = method === "GET" && !headers.Authorization;

      try {
        var response = await fetchWithTimeout(url, requestInit, timeoutMs);
        var rawText = await response.text();
        var payload = null;
        if (rawText) {
          try {
            payload = JSON.parse(rawText);
          } catch (_errParse) {
            payload = null;
          }
        }
        if (response.ok) {
          state.activeApiBase = base;
          return payload || {};
        }
        if (response.status === 404 || response.status === 405 || response.status === 501) {
          fallbackUnavailableCount += 1;
          lastErr = new Error("relay_api_unavailable");
          if (allowFallback) continue;
          throw lastErr;
        }
        var code = parseErrorCode(payload);
        if (
          response.status === 401 ||
          response.status === 403 ||
          code === "UNAUTHORIZED" ||
          code === "INVALID_TOKEN"
        ) {
          clearRelayAuthStorage();
          setLoginPill();
          setMyCasePill();
        }
        var err = new Error(code || ("http_" + response.status));
        err.status = response.status;
        err.apiPayload = payload;
        throw err;
      } catch (err) {
        lastErr = err;
        if (err && (err.status === 401 || err.status === 403)) throw err;
        if (!allowFallback) throw err;
      }
    }

    if (fallbackUnavailableCount >= bases.length) {
      throw new Error("relay_api_unavailable");
    }
    throw lastErr || new Error("relay_api_request_failed");
  }

  function resolveInputValue(inputEl) {
    return inputEl ? toText(inputEl.value).trim() : "";
  }

  function resolveOpId() {
    return resolveInputValue(refs.opIdInput);
  }

  function resolveTargetUserId() {
    return resolveInputValue(refs.targetInput);
  }

  function resolveTargetNickname() {
    return resolveInputValue(refs.targetNicknameInput);
  }

  function resolveCaseId() {
    return resolveInputValue(refs.caseInput);
  }

  function resolveSubmitPayload() {
    var raw = resolveInputValue(refs.payloadTextarea);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return { replay_payload: raw };
    }
  }

  function resolvePlay5x5Url() {
    return "play.html?mode_key=" + encodeURIComponent(RELAY_MODE_KEY);
  }

  function parseJsonSafe(raw) {
    if (!(typeof raw === "string" && raw.trim())) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function normalizeBoardMatrix(board) {
    if (!Array.isArray(board) || board.length <= 0) return null;
    var width = Array.isArray(board[0]) ? board[0].length : 0;
    if (width <= 0) return null;
    var out = [];
    for (var y = 0; y < board.length; y += 1) {
      var row = board[y];
      if (!Array.isArray(row) || row.length !== width) return null;
      var next = [];
      for (var x = 0; x < row.length; x += 1) {
        var value = Number(row[x]);
        if (!Number.isFinite(value) || value < 0) return null;
        next.push(Math.floor(value));
      }
      out.push(next);
    }
    return out;
  }

  function toSafeNonNegativeInt(value, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return Number(fallback) >= 0 ? Math.floor(Number(fallback)) : 0;
    return Math.floor(n);
  }

  function extractReplayFieldFromSnapshot(source) {
    if (!(source && typeof source === "object")) return null;
    var replayCode = normalizeReplayV1Base64Code(
      source.replay_code ||
      source.replayCode ||
      source.replay_string ||
      source.replayString
    );
    if (replayCode) {
      return { replay_code: replayCode };
    }
    var replayPayload = source.replay_payload != null
      ? source.replay_payload
      : source.replayPayload != null
        ? source.replayPayload
        : source.replay != null
          ? source.replay
          : null;
    if (replayPayload != null) {
      var replayFromPayload = tryResolveImportableReplayPayload(replayPayload, 0);
      if (replayFromPayload) return { replay_code: replayFromPayload };
    }
    return null;
  }

  function buildCompactRelaySnapshot(payload) {
    var source = extractSnapshotPayload(payload) || payload;
    if (!(source && typeof source === "object")) return null;
    var board = normalizeBoardMatrix(source.board);
    if (!board || board.length <= 0 || board[0].length <= 0) return null;
    var height = board.length;
    var width = board[0].length;
    var score = toSafeNonNegativeInt(source.score, 0);
    var bestScore = toSafeNonNegativeInt(source.best_score, score);
    var durationMs = toSafeNonNegativeInt(source.duration_ms, source.timer_duration_ms || 0);
    var moveCount = toSafeNonNegativeInt(source.successful_move_count, source.move_count || 0);
    var compact = {
      mode_key: toText(source.mode_key || RELAY_MODE_KEY),
      board_width: width,
      board_height: height,
      board: board,
      score: score,
      best_score: bestScore,
      duration_ms: durationMs,
      successful_move_count: moveCount,
      has_game_started: true,
      timer_status: Number(source.timer_status) === 1 ? 1 : 0,
      timer_frozen: !!source.timer_frozen,
      saved_at: toSafeNonNegativeInt(source.saved_at, Date.now())
    };
    var replayField = extractReplayFieldFromSnapshot(source);
    if (replayField && replayField.replay_code) {
      compact.replay_code = replayField.replay_code;
    } else if (replayField && Object.prototype.hasOwnProperty.call(replayField, "replay")) {
      compact.replay = replayField.replay;
    }
    return compact;
  }

  function isValidRelaySnapshotPayload(payload) {
    var compact = buildCompactRelaySnapshot(payload);
    if (!compact) return false;
    var board = normalizeBoardMatrix(compact.board);
    if (!board) return false;
    var width = Number(compact.board_width);
    var height = Number(compact.board_height);
    if (Number.isFinite(width) && Math.floor(width) !== board[0].length) return false;
    if (Number.isFinite(height) && Math.floor(height) !== board.length) return false;
    return true;
  }

  function resolveSavedStateStorageKey() {
    return SAVED_GAME_STATE_KEY_PREFIX + RELAY_MODE_KEY;
  }

  function resolveSavedStateLiteStorageKey() {
    return SAVED_GAME_STATE_LITE_KEY_PREFIX + RELAY_MODE_KEY;
  }

  function readSavedSnapshotFrom5x5Storage() {
    var storage = null;
    try {
      storage = global.localStorage || null;
    } catch (_err) {
      storage = null;
    }
    if (!storage || typeof storage.getItem !== "function") return null;

    var fullRaw = toText(storage.getItem(resolveSavedStateStorageKey()));
    var full = parseJsonSafe(fullRaw);
    var compactFull = buildCompactRelaySnapshot(full);
    if (compactFull) return compactFull;

    var liteRaw = toText(storage.getItem(resolveSavedStateLiteStorageKey()));
    var lite = parseJsonSafe(liteRaw);
    var compactLite = buildCompactRelaySnapshot(lite);
    if (compactLite) return compactLite;

    return null;
  }

  function extractSnapshotPayload(payload) {
    if (!(payload && typeof payload === "object")) return null;
    if (Array.isArray(payload.board)) return payload;
    if (payload.snapshot && typeof payload.snapshot === "object") return payload.snapshot;
    if (payload.payload && typeof payload.payload === "object") return payload.payload;
    if (payload.data && typeof payload.data === "object") return payload.data;
    return null;
  }

  function stageSnapshotFor5x5(snapshot) {
    var source = extractSnapshotPayload(snapshot) || snapshot;
    if (!isValidRelaySnapshotPayload(source)) return false;
    var storage = null;
    try {
      storage = global.localStorage || null;
    } catch (_err) {
      storage = null;
    }
    if (!storage || typeof storage.setItem !== "function") return false;
    var serialized = "";
    try {
      serialized = JSON.stringify(source);
    } catch (_err) {
      return false;
    }
    try {
      storage.setItem(resolveSavedStateStorageKey(), serialized);
      storage.setItem(resolveSavedStateLiteStorageKey(), serialized);
      return true;
    } catch (_err2) {
      return false;
    }
  }

  function clearStagedSnapshotFor5x5() {
    safeRemoveStorage(resolveSavedStateStorageKey());
    safeRemoveStorage(resolveSavedStateLiteStorageKey());
  }

  function resolvePayloadForSubmitOrSnapshot() {
    var from5x5 = readSavedSnapshotFrom5x5Storage();
    if (from5x5) return from5x5;
    var payload = resolveSubmitPayload();
    if (payload) return buildCompactRelaySnapshot(payload) || payload;
    return null;
  }

  function onOpen5x5NoUndo() {
    var heldCaseId = resolveMyHeldCaseId();
    var inputCaseId = resolveCaseId();
    var caseId = heldCaseId || inputCaseId;
    if (!caseId) {
      global.location.href = resolvePlay5x5Url();
      return;
    }
    setLoading(true);
    syncRelayCaseTo5x5Storage(caseId)
      .then(function (ok) {
        if (!ok) return;
        global.location.href = resolvePlay5x5Url();
      })
      .catch(function (err) {
        var copy = currentCopy();
        setNote(copy.opFailed + toText(err && err.message), "error");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  async function syncRelayCaseTo5x5Storage(caseId) {
    var copy = currentCopy();
    var normalizedCaseId = toText(caseId).trim();
    if (!normalizedCaseId) {
      setNote(copy.requireCase, "error");
      return false;
    }

    var snapshotPayload = await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/snapshot", {
      method: "GET"
    });
    var rawSnapshot = snapshotPayload && snapshotPayload.case
      ? snapshotPayload.case.snapshot
      : (snapshotPayload ? snapshotPayload.snapshot : null);
    var sourceSnapshot = extractSnapshotPayload(rawSnapshot) || rawSnapshot;
    var compactSnapshot = buildCompactRelaySnapshot(sourceSnapshot);
    if (!compactSnapshot) {
      setNote(copy.snapshotInvalid, "error");
      return false;
    }

    try {
      var replayPayload = await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/replay", {
        method: "GET"
      });
      var replayText = buildImportableReplayText(
        replayPayload && replayPayload.full_replay ? replayPayload.full_replay : replayPayload
      );
      if (replayText) {
        compactSnapshot.replay_code = replayText;
      }
    } catch (_ignoreReplayErr) {
      // Keep snapshot sync usable even if replay chain is temporarily unavailable.
    }

    writePayloadTextarea(compactSnapshot);
    if (!stageSnapshotFor5x5(compactSnapshot)) {
      setNote(copy.snapshotInvalid, "error");
      return false;
    }
    return true;
  }

  function writePayloadTextarea(payload) {
    if (!refs.payloadTextarea) return;
    var source = payload;
    if (source == null) source = {};
    try {
      refs.payloadTextarea.value = JSON.stringify(source, null, 2);
    } catch (_err) {
      refs.payloadTextarea.value = "{}";
    }
  }

  function setLoading(loading) {
    state.loading = !!loading;
    var disabled = state.loading;
    var buttons = [
      refs.refreshBtn,
      refs.open5x5Btn,
      refs.createBtn,
      refs.loadBtn,
      refs.deleteBtn,
      refs.requestClaimBtn,
      refs.claimBtn,
      refs.submitBtn,
      refs.designateTargetBtn,
      refs.handoffBtn,
      refs.pagePrevBtn,
      refs.pageNextBtn,
      refs.replayRefreshBtn,
      refs.replayCopyFullBtn,
      refs.replayExportFullBtn,
      refs.replayCopySegmentBtn
    ];
    for (var i = 0; i < buttons.length; i += 1) {
      if (buttons[i]) buttons[i].disabled = disabled;
    }
    renderCaseTable();
    renderCasePager();
    renderClaimModules();
  }

  function applyLocalizedText() {
    var copy = currentCopy();
    document.documentElement.lang = state.language === "en" ? "en" : "zh-CN";
    document.title = copy.title;
    if (refs.titleEl) refs.titleEl.textContent = copy.title;
    if (refs.subtitleEl) refs.subtitleEl.textContent = copy.subtitle;
    if (refs.navHome) refs.navHome.textContent = copy.navHome;
    if (refs.navModes) refs.navModes.textContent = copy.navModes;
    if (refs.listTitleEl) refs.listTitleEl.textContent = copy.listTitle;
    if (refs.actionTitleEl) refs.actionTitleEl.textContent = copy.actionTitle;
    if (refs.open5x5Btn) refs.open5x5Btn.textContent = copy.open5x5;
    if (refs.refreshBtn) refs.refreshBtn.textContent = copy.refresh;
    if (refs.heldSnapshotTitleEl) refs.heldSnapshotTitleEl.textContent = copy.heldSnapshotTitle;
    if (refs.replayChainTitleEl) refs.replayChainTitleEl.textContent = copy.replayChainTitle;
    if (refs.replayRefreshBtn) refs.replayRefreshBtn.textContent = copy.replayRefresh;
    if (refs.replayCopyFullBtn) {
      refs.replayCopyFullBtn.setAttribute("title", copy.replayCopyFull);
      refs.replayCopyFullBtn.setAttribute("aria-label", copy.replayCopyFull);
    }
    if (refs.replayExportFullBtn) {
      refs.replayExportFullBtn.setAttribute("title", copy.replayExportFull);
      refs.replayExportFullBtn.setAttribute("aria-label", copy.replayExportFull);
    }
    if (refs.replayCopySegmentBtn) refs.replayCopySegmentBtn.textContent = copy.replayCopySegment;
    if (refs.replaySegmentLabelEl) refs.replaySegmentLabelEl.textContent = copy.replaySegmentLabel;
    if (refs.replaySegmentBoardTitleEl) refs.replaySegmentBoardTitleEl.textContent = copy.replaySegmentBoardTitle;
    if (refs.pagePrevBtn) refs.pagePrevBtn.textContent = copy.pagePrev;
    if (refs.pageNextBtn) refs.pageNextBtn.textContent = copy.pageNext;
    if (refs.replayCaseNameEl) {
      var activeCaseId = state.replayCaseId || resolveMyHeldCaseId();
      refs.replayCaseNameEl.textContent = activeCaseId
        ? (copy.replayCaseNamePrefix + activeCaseId)
        : (copy.replayCaseNamePrefix + "-");
    }
    if (refs.colCase) refs.colCase.textContent = copy.colCase;
    if (refs.colHolder) refs.colHolder.textContent = copy.colHolder;
    if (refs.colUpdated) refs.colUpdated.textContent = copy.colUpdated;
    if (refs.colClaim) refs.colClaim.textContent = copy.colClaim;
    if (refs.requestManageTitleEl) refs.requestManageTitleEl.textContent = copy.claimManageTitle;
    if (refs.incomingClaimTitleEl) refs.incomingClaimTitleEl.textContent = copy.incomingClaimTitle;
    if (refs.labelCase) refs.labelCase.textContent = copy.labelCase;
    if (refs.labelTargetNickname) refs.labelTargetNickname.textContent = copy.labelTargetNickname;
    if (refs.caseInput) refs.caseInput.setAttribute("placeholder", copy.casePlaceholder);
    if (refs.targetNicknameInput) refs.targetNicknameInput.setAttribute("placeholder", copy.targetNicknamePlaceholder);
    if (refs.heldSnapshotBoardEl) refs.heldSnapshotBoardEl.setAttribute("aria-label", copy.heldSnapshotBoardAria);
    if (refs.replaySegmentBoardEl) refs.replaySegmentBoardEl.setAttribute("aria-label", copy.segmentBoardAria);
    if (refs.labelOp) refs.labelOp.textContent = copy.labelOp;
    if (refs.labelPayload) refs.labelPayload.textContent = copy.labelPayload;
    renderAdvancedPanelState();
    if (refs.createBtn) refs.createBtn.textContent = copy.create;
    if (refs.loadBtn) refs.loadBtn.textContent = copy.load;
    if (refs.deleteBtn) refs.deleteBtn.textContent = copy.destroy;
    if (refs.requestClaimBtn) refs.requestClaimBtn.textContent = copy.requestClaim;
    if (refs.claimBtn) refs.claimBtn.textContent = copy.claim;
    if (refs.submitBtn) refs.submitBtn.textContent = copy.submit;
    if (refs.designateTargetBtn) refs.designateTargetBtn.textContent = copy.designateTarget;
    if (refs.handoffBtn) refs.handoffBtn.textContent = copy.handoff;
    setLoginPill();
    setMyCasePill();
    setApiPill(state.activeApiBase ? (copy.apiConnected + state.activeApiBase) : copy.apiIdle);
    setHeldSnapshotPlaceholder();
    setReplayChainPlaceholder();
    renderCaseTable();
    renderCasePager();
    renderClaimModules();
    renderReplaySegmentSelect();
    updateReplaySegmentDisplay();
  }

  async function refreshRelayCases(silent) {
    var copy = currentCopy();
    if (!silent) {
      setNote(copy.loading, "");
      setLoading(true);
    }
    try {
      var payload = await requestRelayApi("/relay/cases?board=5x5", { method: "GET" });
      var cases = normalizeCaseListPayload(payload).map(normalizeCaseRow);
      state.cases = cases;
      var currentUserId = resolveUserIdText();
      var nextPendingMap = {};
      if (currentUserId) {
        for (var p = 0; p < cases.length; p += 1) {
          var pendingRow = cases[p] || {};
          var pendingCaseId = toText(pendingRow.caseId).trim();
          if (!pendingCaseId) continue;
          if (toText(pendingRow.claimRequestUserId).trim() === currentUserId) {
            nextPendingMap[pendingCaseId] = true;
          }
        }
      }
      state.pendingClaimCaseMap = nextPendingMap;
      renderCaseTable();
      renderClaimModules();
      setMyCasePill();
      await refreshHeldSnapshot();
      await refreshReplayChain();
      setApiPill(copy.apiConnected + state.activeApiBase);
      setNote(copy.loaded, "");
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "relay_api_unavailable") {
        setApiPill(copy.apiUnavailable);
        setNote(copy.apiNotReady, "error");
      } else if (message === "http_401" || message === "UNAUTHORIZED" || message === "INVALID_TOKEN") {
        setNote(copy.unauthorized, "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function ensureLoggedIn() {
    var token = resolveToken();
    if (token) return true;
    setNote(currentCopy().needLogin, "error");
    return false;
  }

  async function onCreate() {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var caseId = resolveCaseId();
    if (!caseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    var snapshot = readSavedSnapshotFrom5x5Storage();
    var submitSnapshot = buildCompactRelaySnapshot(snapshot);
    if (!submitSnapshot) {
      setNote(copy.payloadOrBoardRequired, "error");
      return;
    }
    writePayloadTextarea(submitSnapshot);
    setLoading(true);
    try {
      await requestRelayApi("/relay/cases/" + encodeURIComponent(caseId) + "/create", {
        method: "POST",
        body: {
          board: "5x5",
          snapshot: submitSnapshot
        },
        idempotencyKey: resolveOpId()
      });
      setNote(copy.extractedFrom5x5, "");
      await refreshRelayCases(true);
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "CASE_ALREADY_EXISTS") {
        setNote(copy.caseExists, "error");
      } else if (message === "RELAY_HOLDER_ALREADY_HAS_CASE") {
        var existingCaseId = toText(err && err.apiPayload && err.apiPayload.existing_case_id).trim();
        setNote(copy.holderAlreadyHasCase + (existingCaseId || "-"), "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onLoad() {
    var copy = currentCopy();
    var caseId = resolveCaseId() || resolveMyHeldCaseId();
    if (!caseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    if (refs.caseInput) refs.caseInput.value = caseId;
    setLoading(true);
    try {
      var synced = await syncRelayCaseTo5x5Storage(caseId);
      if (!synced) {
        return;
      }
      setNote(copy.loadAndRedirecting, "");
      global.setTimeout(function () {
        global.location.href = resolvePlay5x5Url();
      }, 120);
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "CASE_NOT_FOUND") {
        setNote(copy.caseMissing, "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var caseId = resolveCaseId();
    if (!caseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    var deleteMessage = copy.deleteConfirm + caseId;
    if (typeof global.confirm === "function" && !global.confirm(deleteMessage)) {
      setNote(copy.deleteCanceled, "");
      return;
    }
    setLoading(true);
    try {
      await requestRelayApi("/relay/cases/" + encodeURIComponent(caseId) + "/delete", {
        method: "POST",
        body: {},
        idempotencyKey: resolveOpId()
      });
      setNote(copy.deleteOk, "");
      await refreshRelayCases(true);
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "CASE_NOT_FOUND") {
        setNote(copy.caseMissing, "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onClaimByCaseId(caseId) {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var normalizedCaseId = toText(caseId).trim();
    if (!normalizedCaseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    if (refs.caseInput) refs.caseInput.value = normalizedCaseId;
    setLoading(true);
    try {
      await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/claim", {
        method: "POST",
        body: {},
        idempotencyKey: resolveOpId()
      });
      await refreshRelayCases(true);
      var synced = await syncRelayCaseTo5x5Storage(normalizedCaseId);
      if (!synced) return;
      setNote(copy.claimOk, "");
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "RELAY_HOLDER_ALREADY_HAS_CASE") {
        var existingCaseId = toText(err && err.apiPayload && err.apiPayload.existing_case_id).trim();
        setNote(copy.holderAlreadyHasCase + (existingCaseId || "-"), "error");
      } else if (message === "RELAY_APPROVAL_REQUIRED") {
        setNote(copy.approvalRequired, "error");
      } else if (message === "RELAY_REQUEST_PENDING") {
        setNote(copy.requestPending, "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onClaim() {
    await onClaimByCaseId(resolveCaseId());
  }

  async function onRequestClaimByCaseId(caseId) {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var normalizedCaseId = toText(caseId).trim();
    if (!normalizedCaseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    if (toText(state.requestClaimCaseIdInFlight).trim() === normalizedCaseId) {
      return;
    }
    if (!state.pendingClaimCaseMap) state.pendingClaimCaseMap = {};
    if (state.pendingClaimCaseMap[normalizedCaseId]) {
      setNote(copy.requestClaimOk, "");
      return;
    }
    if (refs.caseInput) refs.caseInput.value = normalizedCaseId;
    state.requestClaimCaseIdInFlight = normalizedCaseId;
    renderCaseTable();
    try {
      await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/request-claim", {
        method: "POST",
        body: {},
        idempotencyKey: resolveOpId()
      });
      state.pendingClaimCaseMap[normalizedCaseId] = true;
      setNote(copy.requestClaimOk, "");
      renderCaseTable();
      await refreshRelayCases(true);
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "RELAY_HOLDER_ALREADY_HAS_CASE") {
        var existingCaseId = toText(err && err.apiPayload && err.apiPayload.existing_case_id).trim();
        setNote(copy.holderAlreadyHasCase + (existingCaseId || "-"), "error");
      } else if (message === "RELAY_REQUEST_ALREADY_EXISTS") {
        setNote(copy.requestAlreadyExists, "error");
      } else if (message === "RELAY_REQUEST_SELF_FORBIDDEN") {
        setNote(copy.requestSelfForbidden, "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      state.requestClaimCaseIdInFlight = "";
      renderCaseTable();
    }
  }

  async function onRequestClaim() {
    await onRequestClaimByCaseId(resolveCaseId());
  }

  async function onSubmit() {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var caseId = resolveCaseId();
    if (!caseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    var payload = resolvePayloadForSubmitOrSnapshot();
    var submitPayload = extractSnapshotPayload(payload) || payload;
    if (!isValidRelaySnapshotPayload(submitPayload)) {
      setNote(copy.payloadOrBoardRequired, "error");
      return;
    }
    writePayloadTextarea(submitPayload);
    setLoading(true);
    try {
      await requestRelayApi("/relay/cases/" + encodeURIComponent(caseId) + "/submit", {
        method: "POST",
        body: {
          snapshot: submitPayload,
          replay: submitPayload && submitPayload.replay != null ? submitPayload.replay : undefined,
          replay_code: toText(submitPayload && submitPayload.replay_code).trim()
        },
        idempotencyKey: resolveOpId()
      });
      setNote(copy.submitOk, "");
      await refreshRelayCases(true);
    } catch (err) {
      setNote(copy.opFailed + toText(err && err.message), "error");
    } finally {
      setLoading(false);
    }
  }

  async function onDesignateTarget() {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var caseId = resolveCaseId();
    if (!caseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    var targetNickname = resolveTargetNickname();
    if (!targetNickname) {
      setNote(copy.requireTargetNickname, "error");
      return;
    }
    setLoading(true);
    try {
      await requestRelayApi("/relay/cases/" + encodeURIComponent(caseId) + "/designate-target", {
        method: "POST",
        body: { target_nickname: targetNickname },
        idempotencyKey: resolveOpId()
      });
      setNote(copy.designateTargetOkPrefix + targetNickname, "");
      await refreshRelayCases(true);
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "RELAY_TARGET_NOT_FOUND") {
        setNote(copy.targetNicknameNotFound + targetNickname, "error");
      } else if (message === "RELAY_TARGET_ALREADY_HAS_CASE") {
        var existingCaseId = toText(err && err.apiPayload && err.apiPayload.existing_case_id).trim();
        setNote(copy.targetAlreadyHasCase + (existingCaseId || "-"), "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function resolveSubmitPayloadForCaseId(caseId) {
    var payload = resolvePayloadForSubmitOrSnapshot();
    var submitPayload = extractSnapshotPayload(payload) || payload;
    if (isValidRelaySnapshotPayload(submitPayload)) return submitPayload;
    var normalizedCaseId = toText(caseId).trim();
    if (!normalizedCaseId) return null;
    try {
      var snapshotPayload = await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/snapshot", {
        method: "GET"
      });
      var rawSnapshot = snapshotPayload && snapshotPayload.case
        ? snapshotPayload.case.snapshot
        : (snapshotPayload ? snapshotPayload.snapshot : null);
      var remoteSnapshot = extractSnapshotPayload(rawSnapshot) || rawSnapshot;
      if (isValidRelaySnapshotPayload(remoteSnapshot)) return remoteSnapshot;
    } catch (_err) {
    }
    return null;
  }

  async function onHandoffByCaseId(caseId, targetUserId) {
    var copy = currentCopy();
    if (!ensureLoggedIn()) return;
    var normalizedCaseId = toText(caseId).trim();
    if (!normalizedCaseId) {
      setNote(copy.requireCase, "error");
      return;
    }
    var normalizedTargetUserId = toText(targetUserId).trim();
    if (refs.caseInput) refs.caseInput.value = normalizedCaseId;
    if (refs.targetInput && normalizedTargetUserId) refs.targetInput.value = normalizedTargetUserId;

    setLoading(true);
    try {
      var submitPayload = await resolveSubmitPayloadForCaseId(normalizedCaseId);
      if (!isValidRelaySnapshotPayload(submitPayload)) {
        setNote(copy.payloadOrBoardRequired, "error");
        return;
      }
      writePayloadTextarea(submitPayload);

      // Auto-submit latest progress before handoff so receiver always gets newest state.
      await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/submit", {
        method: "POST",
        body: {
          snapshot: submitPayload,
          replay: submitPayload && submitPayload.replay != null ? submitPayload.replay : undefined,
          replay_code: toText(submitPayload && submitPayload.replay_code).trim()
        },
        idempotencyKey: resolveOpId()
      });
      await requestRelayApi("/relay/cases/" + encodeURIComponent(normalizedCaseId) + "/handoff", {
        method: "POST",
        body: normalizedTargetUserId ? { target_user_id: normalizedTargetUserId } : {},
        idempotencyKey: resolveOpId()
      });
      clearStagedSnapshotFor5x5();
      setNote(copy.handoffOk, "");
      await refreshRelayCases(true);
    } catch (err) {
      var message = toText(err && err.message);
      if (message === "RELAY_REQUEST_REQUIRED") {
        setNote(copy.requestRequired, "error");
      } else if (message === "RELAY_TARGET_ALREADY_HAS_CASE") {
        var existingCaseId = toText(err && err.apiPayload && err.apiPayload.existing_case_id).trim();
        setNote(copy.targetAlreadyHasCase + (existingCaseId || "-"), "error");
      } else {
        setNote(copy.opFailed + message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onHandoff() {
    await onHandoffByCaseId(resolveCaseId(), resolveTargetUserId());
  }

  async function onReplayRefresh() {
    await refreshReplayChain();
  }

  function bindEvents() {
    if (refs.refreshBtn) {
      refs.refreshBtn.addEventListener("click", function () {
        refreshRelayCases(false);
      });
    }
    if (refs.open5x5Btn) refs.open5x5Btn.addEventListener("click", onOpen5x5NoUndo);
    if (refs.pagePrevBtn) {
      refs.pagePrevBtn.addEventListener("click", function () {
        if (state.loading) return;
        if (state.casePage > 1) {
          state.casePage -= 1;
          renderCaseTable();
        }
      });
    }
    if (refs.pageNextBtn) {
      refs.pageNextBtn.addEventListener("click", function () {
        if (state.loading) return;
        var totalPages = resolveCaseTotalPages();
        if (state.casePage < totalPages) {
          state.casePage += 1;
          renderCaseTable();
        }
      });
    }
    if (refs.createBtn) refs.createBtn.addEventListener("click", onCreate);
    if (refs.loadBtn) refs.loadBtn.addEventListener("click", onLoad);
    if (refs.deleteBtn) refs.deleteBtn.addEventListener("click", onDelete);
    if (refs.requestClaimBtn) refs.requestClaimBtn.addEventListener("click", onRequestClaim);
    if (refs.claimBtn) refs.claimBtn.addEventListener("click", onClaim);
    if (refs.submitBtn) refs.submitBtn.addEventListener("click", onSubmit);
    if (refs.designateTargetBtn) refs.designateTargetBtn.addEventListener("click", onDesignateTarget);
    if (refs.handoffBtn) refs.handoffBtn.addEventListener("click", onHandoff);
    if (refs.replayRefreshBtn) refs.replayRefreshBtn.addEventListener("click", onReplayRefresh);
    if (refs.replayCopyFullBtn) refs.replayCopyFullBtn.addEventListener("click", onReplayCopyFull);
    if (refs.replayExportFullBtn) refs.replayExportFullBtn.addEventListener("click", onReplayExportFull);
    if (refs.replayCopySegmentBtn) refs.replayCopySegmentBtn.addEventListener("click", onReplayCopySegment);
    if (refs.replaySegmentSelect) {
      refs.replaySegmentSelect.addEventListener("change", function () {
        updateReplaySegmentDisplay();
      });
    }
    if (refs.advancedToggleBtn) {
      refs.advancedToggleBtn.addEventListener("click", function () {
        state.advancedOpen = !state.advancedOpen;
        renderAdvancedPanelState();
      });
    }

    global.addEventListener("storage", function (eventLike) {
      var key = toText(eventLike && eventLike.key);
      if (key === UI_LANG_STORAGE_KEY) {
        state.language = resolveLanguage();
        applyLocalizedText();
      }
      if (key === STORAGE_TOKEN_KEY || key === STORAGE_USER_ID_KEY) {
        var nowLoggedIn = !!resolveToken();
        if (!state.authWasLoggedIn && nowLoggedIn) {
          setNote(currentCopy().loginDetectedSyncing, "");
          refreshRelayCases(false);
        }
        state.authWasLoggedIn = nowLoggedIn;
        setLoginPill();
        setMyCasePill();
        renderClaimModules();
        refreshHeldSnapshot();
        refreshReplayChain();
      }
    });

  }

  function cacheDomRefs() {
    refs.titleEl = document.getElementById("relay-title");
    refs.subtitleEl = document.getElementById("relay-subtitle");
    refs.navHome = document.getElementById("relay-nav-home");
    refs.navModes = document.getElementById("relay-nav-modes");
    refs.listTitleEl = document.getElementById("relay-list-title");
    refs.actionTitleEl = document.getElementById("relay-action-title");
    refs.open5x5Btn = document.getElementById("relay-open-5x5-btn");
    refs.loginPill = document.getElementById("relay-login-pill");
    refs.apiPill = document.getElementById("relay-api-pill");
    refs.myCasePill = document.getElementById("relay-my-case-pill");
    refs.refreshBtn = document.getElementById("relay-refresh-btn");
    refs.heldSnapshotTitleEl = document.getElementById("relay-held-snapshot-title");
    refs.heldSnapshotBoardEl = document.getElementById("relay-held-snapshot-board");
    refs.heldSnapshotHintEl = document.getElementById("relay-held-snapshot-hint");
    refs.replayChainTitleEl = document.getElementById("relay-replay-chain-title");
    refs.replayRefreshBtn = document.getElementById("relay-replay-refresh-btn");
    refs.replayCaseNameEl = document.getElementById("relay-replay-case-name");
    refs.replayCopyFullBtn = document.getElementById("relay-replay-copy-full-btn");
    refs.replayExportFullBtn = document.getElementById("relay-replay-export-full-btn");
    refs.replayCopySegmentBtn = document.getElementById("relay-replay-copy-segment-btn");
    refs.replaySegmentBoardTitleEl = document.getElementById("relay-replay-segment-board-title");
    refs.replaySegmentBoardEl = document.getElementById("relay-replay-segment-end-board");
    if (refs.replaySegmentBoardEl) {
      refs.replaySegmentBoardEl.style.width = "209px";
      refs.replaySegmentBoardEl.style.height = "209px";
      refs.replaySegmentBoardEl.style.minWidth = "209px";
      refs.replaySegmentBoardEl.style.minHeight = "209px";
      refs.replaySegmentBoardEl.style.maxWidth = "209px";
      refs.replaySegmentBoardEl.style.maxHeight = "209px";
      refs.replaySegmentBoardEl.style.padding = "8px";
      refs.replaySegmentBoardEl.style.gap = "6px";
      refs.replaySegmentBoardEl.style.boxSizing = "content-box";
    }
    refs.replaySegmentBoardHintEl = document.getElementById("relay-replay-segment-board-hint");
    refs.replayFullLabelEl = document.getElementById("relay-replay-full-label");
    refs.replaySegmentLabelEl = document.getElementById("relay-replay-segment-label");
    refs.replayFullEl = document.getElementById("relay-replay-full");
    refs.replaySegmentSelect = document.getElementById("relay-replay-segment-select");
    refs.replaySegmentEl = document.getElementById("relay-replay-segment");
    refs.colCase = document.getElementById("relay-col-case");
    refs.colHolder = document.getElementById("relay-col-holder");
    refs.colUpdated = document.getElementById("relay-col-updated");
    refs.colClaim = document.getElementById("relay-col-claim");
    refs.requestManageTitleEl = document.getElementById("relay-request-manage-title");
    refs.requestManageBodyEl = document.getElementById("relay-request-manage-body");
    refs.incomingClaimTitleEl = document.getElementById("relay-incoming-claim-title");
    refs.incomingClaimBodyEl = document.getElementById("relay-incoming-claim-body");
    refs.tableBody = document.getElementById("relay-case-table-body");
    refs.pagePrevBtn = document.getElementById("relay-page-prev-btn");
    refs.pageNextBtn = document.getElementById("relay-page-next-btn");
    refs.pageInfo = document.getElementById("relay-page-info");
    refs.labelCase = document.getElementById("relay-label-case");
    refs.labelTargetNickname = document.getElementById("relay-label-target-nickname");
    refs.labelOp = document.getElementById("relay-label-op");
    refs.labelPayload = document.getElementById("relay-label-payload");
    refs.advancedToggleBtn = document.getElementById("relay-advanced-toggle-btn");
    refs.advancedPanelEl = document.getElementById("relay-advanced-panel");
    refs.caseInput = document.getElementById("relay-case-id");
    refs.targetNicknameInput = document.getElementById("relay-target-nickname");
    refs.targetInput = document.getElementById("relay-target-user-id");
    refs.opIdInput = document.getElementById("relay-op-id");
    refs.payloadTextarea = document.getElementById("relay-submit-payload");
    refs.createBtn = document.getElementById("relay-create-btn");
    refs.loadBtn = document.getElementById("relay-load-btn");
    refs.deleteBtn = document.getElementById("relay-delete-btn");
    refs.requestClaimBtn = document.getElementById("relay-request-claim-btn");
    refs.claimBtn = document.getElementById("relay-claim-btn");
    refs.submitBtn = document.getElementById("relay-submit-btn");
    refs.designateTargetBtn = document.getElementById("relay-designate-target-btn");
    refs.handoffBtn = document.getElementById("relay-handoff-btn");
    refs.noteEl = document.getElementById("relay-note");
    refs.noteSecondaryEl = document.getElementById("relay-note-secondary");
  }

  function init() {
    cacheDomRefs();
    state.language = resolveLanguage();
    state.advancedOpen = false;
    state.pendingClaimCaseMap = {};
    state.authWasLoggedIn = !!resolveToken();
    applyLocalizedText();
    bindEvents();
    refreshRelayCases(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);
