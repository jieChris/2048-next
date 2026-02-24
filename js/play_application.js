(function () {
  var modeCatalogRuntime = window.CoreModeCatalogRuntime;
  if (
    !modeCatalogRuntime ||
    typeof modeCatalogRuntime.resolveCatalogModeWithDefault !== "function"
  ) {
    throw new Error("CoreModeCatalogRuntime is required");
  }
  var playHeaderRuntime = window.CorePlayHeaderRuntime;
  if (
    !playHeaderRuntime ||
    typeof playHeaderRuntime.compactPlayModeLabel !== "function" ||
    typeof playHeaderRuntime.resolvePlayRulesText !== "function" ||
    typeof playHeaderRuntime.buildPlayModeIntroText !== "function"
  ) {
    throw new Error("CorePlayHeaderRuntime is required");
  }
  var playQueryRuntime = window.CorePlayQueryRuntime;
  if (
    !playQueryRuntime ||
    typeof playQueryRuntime.parsePlayModeKey !== "function" ||
    typeof playQueryRuntime.parsePlayChallengeId !== "function"
  ) {
    throw new Error("CorePlayQueryRuntime is required");
  }
  var customSpawnRuntime = window.CoreCustomSpawnRuntime;
  if (
    !customSpawnRuntime ||
    typeof customSpawnRuntime.isCustomSpawnModeKey !== "function" ||
    typeof customSpawnRuntime.sanitizeCustomFourRate !== "function" ||
    typeof customSpawnRuntime.formatRatePercent !== "function" ||
    typeof customSpawnRuntime.inferFourRateFromSpawnTable !== "function" ||
    typeof customSpawnRuntime.applyCustomFourRateToModeConfig !== "function"
  ) {
    throw new Error("CoreCustomSpawnRuntime is required");
  }
  var playCustomSpawnRuntime = window.CorePlayCustomSpawnRuntime;
  if (
    !playCustomSpawnRuntime ||
    typeof playCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig !== "function"
  ) {
    throw new Error("CorePlayCustomSpawnRuntime is required");
  }
  var CUSTOM_FOUR_RATE_STORAGE_KEY =
    playCustomSpawnRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY || "custom_spawn_4x4_four_rate_v1";
  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";

  function parseModeKey() {
    return playQueryRuntime.parsePlayModeKey(window.location.search, DEFAULT_MODE_KEY);
  }

  function parseChallengeId() {
    return playQueryRuntime.parsePlayChallengeId(window.location.search);
  }

  function resolveCustomSpawnModeConfig(modeKey, modeConfig) {
    var result = playCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig({
      modeKey: modeKey,
      modeConfig: modeConfig,
      searchLike: window.location.search,
      pathname: window.location.pathname,
      hash: window.location.hash || "",
      readStoredRate: function () {
        try {
          return localStorage.getItem(CUSTOM_FOUR_RATE_STORAGE_KEY);
        } catch (_err) {
          return null;
        }
      },
      writeStoredRate: function (rateText) {
        try {
          localStorage.setItem(CUSTOM_FOUR_RATE_STORAGE_KEY, String(rateText));
        } catch (_err) {}
      },
      promptRate: function (defaultValueText) {
        return window.prompt("请输入 4 率（0-100，可输入小数）", String(defaultValueText));
      },
      alertInvalidInput: function () {
        window.alert("输入无效，请输入 0 到 100 的数字。");
      },
      replaceUrl: function (nextUrl) {
        try {
          window.history.replaceState(null, "", nextUrl);
        } catch (_err) {}
      }
    });
    return result.modeConfig || null;
  }

  function setupChallengeModeIntro(modeConfig) {
    var introBtn = document.getElementById("top-mode-intro-btn");
    var modal = document.getElementById("mode-intro-modal");
    var closeBtn = document.getElementById("mode-intro-close-btn");
    var title = document.getElementById("mode-intro-title");
    var desc = document.getElementById("mode-intro-desc");
    var leaderboard = document.getElementById("mode-intro-leaderboard");
    if (!introBtn || !modal || !closeBtn || !title || !desc) return;

    // Temporary: hide mode intro entry for all modes.
    introBtn.style.setProperty("display", "none", "important");
    modal.style.display = "none";
    return;

    var is64CappedMode = !!(modeConfig && modeConfig.key === "capped_4x4_pow2_64_no_undo");
    introBtn.style.setProperty("display", is64CappedMode ? "inline-flex" : "none", "important");

    if (!is64CappedMode) {
      modal.style.display = "none";
      return;
    }

    title.textContent = "64封顶模式简介";
    desc.textContent =
      "64封顶是短局冲刺模式。\n" +
      "目标是尽快合成 64，合成后本局结束并计入该模式榜单。\n" +
      "建议优先保持大数在角落，减少无效横跳，提升稳定性。";
    if (leaderboard) {
      leaderboard.textContent = "榜单功能即将上线，这里将展示 64 封顶模式排行榜。";
    }

    if (!introBtn.__modeIntroBound) {
      introBtn.__modeIntroBound = true;
      introBtn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        modal.style.display = "flex";
      });
    }
    if (!closeBtn.__modeIntroBound) {
      closeBtn.__modeIntroBound = true;
      closeBtn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        modal.style.display = "none";
      });
    }
    if (!modal.__modeIntroBound) {
      modal.__modeIntroBound = true;
      modal.addEventListener("click", function (e) {
        if (e && e.target === modal) modal.style.display = "none";
      });
    }
  }

  function setupHeader(modeConfig) {
    var title = document.getElementById("play-mode-title");
    var intro = document.getElementById("play-mode-intro");
    var body = document.body;

    if (body) {
      body.setAttribute("data-mode-id", modeConfig.key);
      body.setAttribute("data-ruleset", modeConfig.ruleset);
    }

    if (title) {
      title.textContent = modeConfig.label;
      title.style.display = "";
    }
    if (intro) {
      intro.textContent = playHeaderRuntime.buildPlayModeIntroText(modeConfig);
      intro.style.display = "";
    }
    setupChallengeModeIntro(modeConfig);
  }

  var bootstrap = window.LegacyBootstrapRuntime;
  if (!bootstrap || typeof bootstrap.startGameOnAnimationFrame !== "function") {
    throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
  }

  bootstrap.startGameOnAnimationFrame(function () {
    var modeKey = parseModeKey();
    var challengeId = parseChallengeId();
    var modeConfig = modeCatalogRuntime.resolveCatalogModeWithDefault(
      window.ModeCatalog,
      modeKey,
      DEFAULT_MODE_KEY
    );

    if (!modeConfig) {
      alert("无效模式，已回退到标准模式");
      window.location.href = "play.html?mode_key=standard_4x4_pow2_no_undo";
      return null;
    }

    modeConfig = resolveCustomSpawnModeConfig(modeKey, modeConfig);
    if (!modeConfig) {
      window.location.href = "modes.html";
      return null;
    }

    window.GAME_MODE_CONFIG = modeConfig;
    window.GAME_CHALLENGE_CONTEXT = challengeId ? { id: challengeId, mode_key: modeConfig.key } : null;
    setupHeader(modeConfig);
    return {
      modeKey: modeConfig.key,
      modeConfig: modeConfig,
      inputManagerCtor: KeyboardInputManager,
      defaultBoardWidth: 4
    };
  });
})();
