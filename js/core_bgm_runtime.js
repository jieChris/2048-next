(function (global) {
  "use strict";

  if (!global) return;

  var STORAGE_KEY = "settings_bgm_enabled_v1";
  var STORAGE_TRUE_VALUE = "1";
  var STORAGE_FALSE_VALUE = "0";
  var AUDIO_SOURCES = [
    {
      path: "audio/windows-bgm.ogg",
      mime: 'audio/ogg; codecs="opus"'
    },
    {
      path: "audio/windows-bgm.m4a",
      mime: 'audio/mp4; codecs="mp4a.40.2"'
    }
  ];
  var DEFAULT_VOLUME = 0.35;
  var GESTURE_EVENTS = ["pointerdown", "keydown", "touchstart"];

  var state = {
    enabled: false,
    audio: null,
    awaitingGesture: false,
    resumeAfterVisibility: false,
    hasToggleBinding: false,
    boundToggle: null,
    hasGestureBindings: false,
    hasVisibilityBinding: false,
    hasLanguageBinding: false
  };

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function getDocumentLike() {
    var doc = global.document;
    return doc && typeof doc === "object" ? doc : null;
  }

  function getElementById(id) {
    var doc = getDocumentLike();
    var getter = asFunction(toRecord(doc).getElementById);
    if (!getter) return null;
    return getter.call(doc, id);
  }

  function querySelector(node, selector) {
    var query = asFunction(toRecord(node).querySelector);
    if (!query) return null;
    try {
      return query.call(node, selector);
    } catch (_err) {
      return null;
    }
  }

  function bindListener(target, eventName, handler, options) {
    var addEventListener = asFunction(toRecord(target).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(target, eventName, handler, options);
    return true;
  }

  function safeReadStorageFlag() {
    var runtime = toRecord(global.CoreGameSettingsStorageRuntime);
    var readStorageFlagFromContext = asFunction(runtime.readStorageFlagFromContext);
    if (readStorageFlagFromContext) {
      return !!readStorageFlagFromContext({
        windowLike: global,
        key: STORAGE_KEY,
        trueValue: STORAGE_TRUE_VALUE
      });
    }

    var storage = toRecord(global).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return false;
    try {
      return getItem.call(storage, STORAGE_KEY) === STORAGE_TRUE_VALUE;
    } catch (_err) {
      return false;
    }
  }

  function safeWriteStorageFlag(enabled) {
    var runtime = toRecord(global.CoreGameSettingsStorageRuntime);
    var writeStorageFlagFromContext = asFunction(runtime.writeStorageFlagFromContext);
    if (writeStorageFlagFromContext) {
      return !!writeStorageFlagFromContext({
        windowLike: global,
        key: STORAGE_KEY,
        enabled: !!enabled,
        trueValue: STORAGE_TRUE_VALUE,
        falseValue: STORAGE_FALSE_VALUE
      });
    }

    var storage = toRecord(global).localStorage;
    var setItem = asFunction(toRecord(storage).setItem);
    if (!setItem) return false;
    try {
      setItem.call(storage, STORAGE_KEY, enabled ? STORAGE_TRUE_VALUE : STORAGE_FALSE_VALUE);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function readUiLanguage() {
    var storage = toRecord(global).localStorage;
    var getItem = asFunction(toRecord(storage).getItem);
    if (!getItem) return "zh";
    try {
      var raw = String(getItem.call(storage, "ui_language_v1") || "").trim().toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function resolveAudioUrl(path) {
    var locationLike = toRecord(global).location;
    var href = typeof locationLike.href === "string" && locationLike.href ? locationLike.href : "/";
    try {
      return String(new URL(path, href));
    } catch (_err) {
      return path;
    }
  }

  function resolvePreferredAudioSource(audioLike) {
    var audioRecord = toRecord(audioLike);
    var canPlayType = asFunction(audioRecord.canPlayType);
    if (!canPlayType) {
      return AUDIO_SOURCES[1] || AUDIO_SOURCES[0] || null;
    }

    for (var i = 0; i < AUDIO_SOURCES.length; i++) {
      var source = AUDIO_SOURCES[i];
      var support = "";
      try {
        support = String(canPlayType.call(audioLike, source.mime) || "").toLowerCase();
      } catch (_err) {
        support = "";
      }
      if (support === "probably" || support === "maybe") {
        return source;
      }
    }

    return AUDIO_SOURCES[1] || AUDIO_SOURCES[0] || null;
  }

  function createAudioElement() {
    var AudioCtor = global.Audio;
    var audio = typeof AudioCtor === "function" ? new AudioCtor() : null;
    if (!audio) {
      var doc = getDocumentLike();
      var createElement = asFunction(toRecord(doc).createElement);
      audio = createElement ? createElement.call(doc, "audio") : null;
    }
    if (!audio) return null;

    audio.preload = "none";
    audio.loop = true;
    audio.volume = DEFAULT_VOLUME;
    var source = resolvePreferredAudioSource(audio);
    if (source && typeof source.path === "string" && source.path) {
      audio.src = resolveAudioUrl(source.path);
      audio.__bgmSourcePath = source.path;
      audio.__bgmSourceMime = source.mime || "";
    }
    var setAttribute = asFunction(toRecord(audio).setAttribute);
    if (setAttribute) {
      setAttribute.call(audio, "playsinline", "");
      setAttribute.call(audio, "aria-hidden", "true");
    }
    return audio;
  }

  function ensureAudioElement() {
    if (state.audio) return state.audio;
    state.audio = createAudioElement();
    return state.audio;
  }

  function pauseAudio() {
    var audio = state.audio;
    var pause = asFunction(toRecord(audio).pause);
    if (pause) {
      try {
        pause.call(audio);
      } catch (_err) {}
    }
  }

  function buildCopy() {
    var isEn = readUiLanguage() === "en";
    if (isEn) {
      if (!state.enabled) {
        return {
          title: "Background Music",
          desc: "Loop background music on the current page.",
          note: "Audio stays unloaded until you enable it, so page startup stays fast."
        };
      }
      if (state.awaitingGesture) {
        return {
          title: "Background Music",
          desc: "Loop background music on the current page.",
          note: "Enabled. Music will start on your next click or key press."
        };
      }
      return {
        title: "Background Music",
        desc: "Loop background music on the current page.",
        note: "Enabled. Music is ready for this run."
      };
    }

    if (!state.enabled) {
      return {
        title: "\u80cc\u666f\u97f3\u4e50",
        desc: "\u5f00\u542f\u540e\u5728\u5f53\u524d\u9875\u9762\u5faa\u73af\u64ad\u653e\u80cc\u666f\u97f3\u4e50\u3002",
        note: "\u9ed8\u8ba4\u4e0d\u52a0\u8f7d\u97f3\u9891\uff0c\u5f00\u542f\u540e\u624d\u4f1a\u5f00\u59cb\u8bf7\u6c42\uff0c\u907f\u514d\u62d6\u6162\u9875\u9762\u3002"
      };
    }
    if (state.awaitingGesture) {
      return {
        title: "\u80cc\u666f\u97f3\u4e50",
        desc: "\u5f00\u542f\u540e\u5728\u5f53\u524d\u9875\u9762\u5faa\u73af\u64ad\u653e\u80cc\u666f\u97f3\u4e50\u3002",
        note: "\u5df2\u5f00\u542f\uff0c\u5c06\u5728\u4e0b\u4e00\u6b21\u70b9\u51fb\u6216\u6309\u952e\u540e\u5f00\u59cb\u64ad\u653e\u3002"
      };
    }
    return {
      title: "\u80cc\u666f\u97f3\u4e50",
      desc: "\u5f00\u542f\u540e\u5728\u5f53\u524d\u9875\u9762\u5faa\u73af\u64ad\u653e\u80cc\u666f\u97f3\u4e50\u3002",
      note: "\u5df2\u5f00\u542f\uff0c\u672c\u5c40\u6e38\u620f\u53ef\u4f7f\u7528\u80cc\u666f\u97f3\u4e50\u3002"
    };
  }

  function syncBgmSettingsUI() {
    bindToggle();

    var toggle = getElementById("bgm-toggle");
    var title = querySelector(getElementById("bgm-settings-row"), ".settings-toggle-title");
    var desc = getElementById("bgm-toggle-desc");
    var note = getElementById("bgm-note");
    var shell = querySelector(getElementById("bgm-settings-row"), ".settings-switch");
    var copy = buildCopy();

    if (toggle) {
      toRecord(toggle).checked = !!state.enabled;
    }
    if (title) {
      toRecord(title).textContent = copy.title;
    }
    if (desc) {
      toRecord(desc).textContent = copy.desc;
    }
    if (note) {
      toRecord(note).textContent = copy.note;
    }
    if (shell) {
      var setAttribute = asFunction(toRecord(shell).setAttribute);
      if (setAttribute) {
        setAttribute.call(shell, "aria-label", copy.title);
      }
    }
  }

  function requestPlayback() {
    if (!state.enabled) return false;

    var audio = ensureAudioElement();
    var play = asFunction(toRecord(audio).play);
    if (!audio || !play) return false;

    try {
      var maybePromise = play.call(audio);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(function () {
          if (!state.enabled) {
            pauseAudio();
            return;
          }
          state.awaitingGesture = false;
          syncBgmSettingsUI();
        }).catch(function () {
          if (!state.enabled) return;
          state.awaitingGesture = true;
          syncBgmSettingsUI();
        });
      } else {
        state.awaitingGesture = false;
        syncBgmSettingsUI();
      }
      return true;
    } catch (_err) {
      state.awaitingGesture = true;
      syncBgmSettingsUI();
      return false;
    }
  }

  function setBgmEnabled(enabled) {
    state.enabled = !!enabled;
    safeWriteStorageFlag(state.enabled);

    if (!state.enabled) {
      state.awaitingGesture = false;
      state.resumeAfterVisibility = false;
      pauseAudio();
      syncBgmSettingsUI();
      return false;
    }

    syncBgmSettingsUI();
    return requestPlayback();
  }

  function handleDeferredPlaybackGesture() {
    if (!state.enabled || !state.awaitingGesture) return;
    requestPlayback();
  }

  function bindGestureFallbackListeners() {
    if (state.hasGestureBindings) return false;
    for (var i = 0; i < GESTURE_EVENTS.length; i++) {
      bindListener(global, GESTURE_EVENTS[i], handleDeferredPlaybackGesture, true);
    }
    state.hasGestureBindings = true;
    return true;
  }

  function bindVisibilityListener() {
    if (state.hasVisibilityBinding) return false;
    var doc = getDocumentLike();
    if (!doc) return false;
    bindListener(doc, "visibilitychange", function () {
      var hidden = !!toRecord(doc).hidden;
      if (hidden) {
        var audio = state.audio;
        state.resumeAfterVisibility =
          !!state.enabled && !!audio && toRecord(audio).paused === false;
        pauseAudio();
        return;
      }
      if (state.enabled && state.resumeAfterVisibility) {
        state.resumeAfterVisibility = false;
        requestPlayback();
      }
    });
    state.hasVisibilityBinding = true;
    return true;
  }

  function bindLanguageListener() {
    if (state.hasLanguageBinding) return false;
    bindListener(global, "uilanguagechange", function () {
      syncBgmSettingsUI();
    });
    state.hasLanguageBinding = true;
    return true;
  }

  function bindToggle() {
    var toggle = getElementById("bgm-toggle");
    if (!toggle || state.boundToggle === toggle) return false;
    bindListener(toggle, "change", function () {
      setBgmEnabled(!!toRecord(toggle).checked);
    });
    state.boundToggle = toggle;
    state.hasToggleBinding = true;
    return true;
  }

  function getRuntimeSnapshot() {
    var audio = state.audio;
    return {
      enabled: !!state.enabled,
      awaitingGesture: !!state.awaitingGesture,
      hasAudio: !!audio,
      audioSrc: audio && typeof audio.src === "string" ? audio.src : "",
      sourcePath: audio && typeof audio.__bgmSourcePath === "string" ? audio.__bgmSourcePath : "",
      sourceMime: audio && typeof audio.__bgmSourceMime === "string" ? audio.__bgmSourceMime : "",
      audioPreload: audio && typeof audio.preload === "string" ? audio.preload : "",
      audioLoop: !!toRecord(audio).loop,
      audioPaused: audio ? !!toRecord(audio).paused : true,
      volume: audio && Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : DEFAULT_VOLUME
    };
  }

  function init() {
    state.enabled = safeReadStorageFlag();
    bindToggle();
    bindGestureFallbackListeners();
    bindVisibilityListener();
    bindLanguageListener();
    syncBgmSettingsUI();
    if (state.enabled) {
      requestPlayback();
    }
  }

  global.CoreBgmRuntime = global.CoreBgmRuntime || {};
  global.CoreBgmRuntime.setBgmEnabled = setBgmEnabled;
  global.CoreBgmRuntime.syncBgmSettingsUI = syncBgmSettingsUI;
  global.CoreBgmRuntime.ensureAudioElement = ensureAudioElement;
  global.CoreBgmRuntime.getBgmRuntimeSnapshot = getRuntimeSnapshot;
  global.syncBgmSettingsUI = syncBgmSettingsUI;

  if (toRecord(getDocumentLike()).readyState === "loading") {
    bindListener(getDocumentLike(), "DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : undefined);
