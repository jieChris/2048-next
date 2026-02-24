(function () {
  var playHeaderRuntime = window.CorePlayHeaderRuntime;
  if (
    !playHeaderRuntime ||
    typeof playHeaderRuntime.compactPlayModeLabel !== "function" ||
    typeof playHeaderRuntime.resolvePlayRulesText !== "function" ||
    typeof playHeaderRuntime.buildPlayModeIntroText !== "function"
  ) {
    throw new Error("CorePlayHeaderRuntime is required");
  }
  var playEntryRuntime = window.CorePlayEntryRuntime;
  if (
    !playEntryRuntime ||
    typeof playEntryRuntime.resolvePlayEntryPlan !== "function"
  ) {
    throw new Error("CorePlayEntryRuntime is required");
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
  var playChallengeIntroRuntime = window.CorePlayChallengeIntroRuntime;
  if (
    !playChallengeIntroRuntime ||
    typeof playChallengeIntroRuntime.resolvePlayChallengeIntroModel !== "function"
  ) {
    throw new Error("CorePlayChallengeIntroRuntime is required");
  }
  var storageRuntime = window.CoreStorageRuntime;
  if (
    !storageRuntime ||
    typeof storageRuntime.resolveStorageByName !== "function" ||
    typeof storageRuntime.safeReadStorageItem !== "function" ||
    typeof storageRuntime.safeSetStorageItem !== "function"
  ) {
    throw new Error("CoreStorageRuntime is required");
  }
  var CUSTOM_FOUR_RATE_STORAGE_KEY =
    playCustomSpawnRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY || "custom_spawn_4x4_four_rate_v1";
  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";

  function resolveLocalStorage() {
    return storageRuntime.resolveStorageByName({
      windowLike: typeof window !== "undefined" ? window : null,
      storageName: "localStorage"
    });
  }

  function resolveCustomSpawnModeConfig(modeKey, modeConfig) {
    var result = playCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig({
      modeKey: modeKey,
      modeConfig: modeConfig,
      searchLike: window.location.search,
      pathname: window.location.pathname,
      hash: window.location.hash || "",
      readStoredRate: function () {
        return storageRuntime.safeReadStorageItem({
          storageLike: resolveLocalStorage(),
          key: CUSTOM_FOUR_RATE_STORAGE_KEY
        });
      },
      writeStoredRate: function (rateText) {
        storageRuntime.safeSetStorageItem({
          storageLike: resolveLocalStorage(),
          key: CUSTOM_FOUR_RATE_STORAGE_KEY,
          value: String(rateText)
        });
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
    var introModel = playChallengeIntroRuntime.resolvePlayChallengeIntroModel({
      modeKey: modeConfig && modeConfig.key ? String(modeConfig.key) : "",
      featureEnabled: false
    });
    introBtn.style.setProperty("display", introModel.entryDisplay === "inline-flex" ? "inline-flex" : "none", "important");
    modal.style.display = introModel.modalDisplay === "flex" ? "flex" : "none";
    title.textContent = introModel.title || "";
    desc.textContent = introModel.description || "";
    if (leaderboard) leaderboard.textContent = introModel.leaderboardText || "";
    if (!introModel.bindEvents) return;

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
    var entryPlan = playEntryRuntime.resolvePlayEntryPlan({
      searchLike: window.location.search,
      modeCatalog: window.ModeCatalog,
      defaultModeKey: DEFAULT_MODE_KEY,
      invalidModeRedirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo"
    });
    var modeKey = entryPlan.modeKey;
    var challengeId = entryPlan.challengeId;
    var modeConfig = entryPlan.modeConfig;

    if (!modeConfig) {
      alert("无效模式，已回退到标准模式");
      window.location.href = entryPlan.redirectUrl || "play.html?mode_key=standard_4x4_pow2_no_undo";
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
