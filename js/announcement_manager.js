(function () {
  var READ_KEY = "announcement_last_read_id_v1";
  var announcementRuntime = resolveAnnouncementRuntime();

  function resolveUiLanguage() {
    if (window.UII18N && typeof window.UII18N.getLanguage === "function") {
      return window.UII18N.getLanguage();
    }
    try {
      var storage = window.localStorage;
      var saved = storage && typeof storage.getItem === "function"
        ? String(storage.getItem("ui_language_v1") || "").trim().toLowerCase()
        : "";
      if (saved.indexOf("en") === 0) return "en";
      if (saved.indexOf("zh") === 0) return "zh";
    } catch (_errStorage) {}
    var html = document && document.documentElement;
    var value = html ? String(html.getAttribute("data-ui-lang") || html.getAttribute("lang") || "") : "";
    return value.indexOf("en") === 0 ? "en" : "zh";
  }

  function resolveAnnouncementRuntime() {
    var runtime = window.CoreAnnouncementRuntime;
    if (!runtime || typeof runtime !== "object") {
      throw new Error("CoreAnnouncementRuntime is required");
    }
    if (typeof runtime.resolveAnnouncementRecords !== "function") {
      throw new Error("CoreAnnouncementRuntime.resolveAnnouncementRecords is required");
    }
    if (typeof runtime.resolveLatestAnnouncementId !== "function") {
      throw new Error("CoreAnnouncementRuntime.resolveLatestAnnouncementId is required");
    }
    if (typeof runtime.hasUnreadAnnouncementFromContext !== "function") {
      throw new Error("CoreAnnouncementRuntime.hasUnreadAnnouncementFromContext is required");
    }
    if (typeof runtime.markAnnouncementSeenFromContext !== "function") {
      throw new Error("CoreAnnouncementRuntime.markAnnouncementSeenFromContext is required");
    }
    return runtime;
  }

  function getRecords() {
    var records = announcementRuntime.resolveAnnouncementRecords({
      records: window.ANNOUNCEMENT_RECORDS
    });
    if (!Array.isArray(records)) return [];
    return records;
  }

  function getLatestId() {
    return announcementRuntime.resolveLatestAnnouncementId({
      records: window.ANNOUNCEMENT_RECORDS
    });
  }

  function hasUnread() {
    return announcementRuntime.hasUnreadAnnouncementFromContext({
      windowLike: window,
      key: READ_KEY,
      records: window.ANNOUNCEMENT_RECORDS
    });
  }

  function markLatestAsRead() {
    var latestId = getLatestId();
    if (!latestId) return;
    announcementRuntime.markAnnouncementSeenFromContext({
      windowLike: window,
      key: READ_KEY,
      records: window.ANNOUNCEMENT_RECORDS,
      latestId: latestId
    });
  }

  function updateUnreadDot() {
    var btn = document.getElementById("top-announcement-btn");
    if (!btn) return;
    if (hasUnread()) btn.classList.add("has-unread");
    else btn.classList.remove("has-unread");
  }

  function resolveLocalizedField(item, zhField, enField, lang) {
    if (!item || typeof item !== "object") return "";
    if (lang === "en") return item[enField] || item[zhField] || "";
    return item[zhField] || item[enField] || "";
  }

  function resolveAnnouncementVersion(item, lang) {
    var text = resolveLocalizedField(item, "version", "version_en", lang);
    if (lang === "en" && text === "置顶") return "Pinned";
    return text;
  }

  function renderAnnouncementList() {
    var list = document.getElementById("announcement-list");
    if (!list) return;
    var records = getRecords();
    var lang = resolveUiLanguage();

    list.innerHTML = "";
    if (!records.length) {
      list.innerHTML =
        "<div class='announcement-empty'>" +
        (lang === "en" ? "No announcements" : "暂无公告") +
        "</div>";
      return;
    }

    for (var i = 0; i < records.length; i += 1) {
      var item = records[i] || {};
      var card = document.createElement("div");
      card.className = "announcement-item";

      var head = document.createElement("div");
      head.className = "announcement-item-head";

      if (item.pinned === true) {
        var pinBadge = document.createElement("span");
        pinBadge.className = "announcement-pin-badge";
        pinBadge.textContent = lang === "en" ? "Pinned" : "置顶";
        head.appendChild(pinBadge);
      }

      var version = document.createElement("span");
      version.className = "announcement-version";
      version.textContent = resolveAnnouncementVersion(item, lang) || "-";

      var date = document.createElement("span");
      date.className = "announcement-date";
      date.textContent = item.date || "-";

      head.appendChild(version);
      head.appendChild(date);

      var title = document.createElement("div");
      title.className = "announcement-title";
      title.textContent = resolveLocalizedField(item, "title", "title_en", lang);

      var content = document.createElement("div");
      content.className = "announcement-content";
      content.textContent = resolveLocalizedField(item, "content", "content_en", lang);

      var linkHref = item && item.link_href ? String(item.link_href) : "";
      var linkLabel = resolveLocalizedField(item, "link_label", "link_label_en", lang);

      card.appendChild(head);
      card.appendChild(title);
      card.appendChild(content);
      if (linkHref && linkLabel) {
        var linkRow = document.createElement("div");
        linkRow.className = "announcement-link-row";

        var link = document.createElement("a");
        link.className = "announcement-link";
        link.href = linkHref;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = linkLabel;

        linkRow.appendChild(link);
        card.appendChild(linkRow);
      }
      list.appendChild(card);
    }
  }

  function setHiddenState(element, hidden, fallbackVisibleDisplay) {
    if (!element) return;
    if (element.classList && typeof element.classList.add === "function" && typeof element.classList.remove === "function") {
      if (hidden) {
        element.classList.add("is-hidden");
      } else {
        element.classList.remove("is-hidden");
        if (element.style && element.style.display === "none") {
          element.style.display = "";
        }
      }
      return;
    }
    if (element.style) {
      element.style.display = hidden ? "none" : fallbackVisibleDisplay;
    }
  }

  function isHiddenState(element) {
    if (!element) return true;
    if (element.hidden === true) return true;
    if (element.classList && typeof element.classList.contains === "function" && element.classList.contains("is-hidden")) {
      return true;
    }
    return !!(element.style && element.style.display === "none");
  }

  function openAnnouncementModal() {
    var modal = document.getElementById("announcement-modal");
    if (!modal) return;
    renderAnnouncementList();
    setHiddenState(modal, false, "flex");
    markLatestAsRead();
    updateUnreadDot();
  }

  function closeAnnouncementModal() {
    var modal = document.getElementById("announcement-modal");
    if (!modal) return;
    setHiddenState(modal, true, "flex");
  }

  function bindEvents() {
    var btn = document.getElementById("top-announcement-btn");
    if (btn && !btn.__announcementBound) {
      btn.__announcementBound = true;
      btn.addEventListener("click", function (eventLike) {
        eventLike.preventDefault();
        openAnnouncementModal();
      });
    }

    var closeBtn = document.getElementById("announcement-close-btn");
    if (closeBtn && !closeBtn.__announcementBound) {
      closeBtn.__announcementBound = true;
      closeBtn.addEventListener("click", function (eventLike) {
        eventLike.preventDefault();
        closeAnnouncementModal();
      });
    }

    var modal = document.getElementById("announcement-modal");
    if (modal && !modal.__announcementBound) {
      modal.__announcementBound = true;
      modal.addEventListener("click", function (eventLike) {
        if (eventLike.target === modal) closeAnnouncementModal();
      });
    }
  }

  function bindDelegatedFallback() {
    if (typeof document === "undefined" || document.__announcementDelegatedBound) return;
    document.__announcementDelegatedBound = true;
    document.addEventListener(
      "click",
      function (eventLike) {
        var target =
          eventLike && eventLike.target && eventLike.target.closest
            ? eventLike.target.closest("#top-announcement-btn")
            : null;
        if (target) {
          eventLike.preventDefault();
          openAnnouncementModal();
          return;
        }
        var closeBtn =
          eventLike && eventLike.target && eventLike.target.closest
            ? eventLike.target.closest("#announcement-close-btn")
            : null;
        if (closeBtn) {
          eventLike.preventDefault();
          closeAnnouncementModal();
        }
      },
      true
    );
  }

  window.AnnouncementManager = {
    hasUnread: hasUnread,
    markLatestAsRead: markLatestAsRead,
    openModal: openAnnouncementModal,
    closeModal: closeAnnouncementModal,
    refresh: updateUnreadDot
  };

  if (!window.__announcementLangBound) {
    window.__announcementLangBound = true;
    window.addEventListener("uilanguagechange", function () {
      var modal = document.getElementById("announcement-modal");
      if (modal && !isHiddenState(modal)) {
        renderAnnouncementList();
      }
    });
  }

  bindDelegatedFallback();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindEvents();
      updateUnreadDot();
    });
  } else {
    bindEvents();
    updateUnreadDot();
  }
})();
