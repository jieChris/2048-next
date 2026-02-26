(function () {
  var READ_KEY = "announcement_last_read_id_v1";
  var announcementRuntime = resolveAnnouncementRuntime();

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

  function renderAnnouncementList() {
    var list = document.getElementById("announcement-list");
    if (!list) return;
    var records = getRecords();
    list.innerHTML = "";
    if (!records.length) {
      list.innerHTML = "<div class='announcement-empty'>暂无公告</div>";
      return;
    }

    for (var i = 0; i < records.length; i++) {
      var item = records[i];
      var card = document.createElement("div");
      card.className = "announcement-item";

      var head = document.createElement("div");
      head.className = "announcement-item-head";

      var version = document.createElement("span");
      version.className = "announcement-version";
      version.textContent = item.version || "-";

      var date = document.createElement("span");
      date.className = "announcement-date";
      date.textContent = item.date || "-";

      head.appendChild(version);
      head.appendChild(date);

      var title = document.createElement("div");
      title.className = "announcement-title";
      title.textContent = item.title || "";

      var content = document.createElement("div");
      content.className = "announcement-content";
      content.textContent = item.content || "";

      card.appendChild(head);
      card.appendChild(title);
      card.appendChild(content);
      list.appendChild(card);
    }
  }

  function openAnnouncementModal() {
    var modal = document.getElementById("announcement-modal");
    if (!modal) return;
    renderAnnouncementList();
    modal.style.display = "flex";
    markLatestAsRead();
    updateUnreadDot();
  }

  function closeAnnouncementModal() {
    var modal = document.getElementById("announcement-modal");
    if (!modal) return;
    modal.style.display = "none";
  }

  function bindEvents() {
    var btn = document.getElementById("top-announcement-btn");
    if (btn && !btn.__announcementBound) {
      btn.__announcementBound = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openAnnouncementModal();
      });
    }

    var closeBtn = document.getElementById("announcement-close-btn");
    if (closeBtn && !closeBtn.__announcementBound) {
      closeBtn.__announcementBound = true;
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeAnnouncementModal();
      });
    }

    var modal = document.getElementById("announcement-modal");
    if (modal && !modal.__announcementBound) {
      modal.__announcementBound = true;
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeAnnouncementModal();
      });
    }
  }

  function bindDelegatedFallback() {
    if (typeof document === "undefined" || document.__announcementDelegatedBound) return;
    document.__announcementDelegatedBound = true;
    document.addEventListener("click", function (e) {
      var target = e && e.target && e.target.closest ? e.target.closest("#top-announcement-btn") : null;
      if (target) {
        e.preventDefault();
        openAnnouncementModal();
        return;
      }
      var closeBtn = e && e.target && e.target.closest ? e.target.closest("#announcement-close-btn") : null;
      if (closeBtn) {
        e.preventDefault();
        closeAnnouncementModal();
      }
    }, true);
  }

  window.AnnouncementManager = {
    hasUnread: hasUnread,
    markLatestAsRead: markLatestAsRead,
    openModal: openAnnouncementModal,
    closeModal: closeAnnouncementModal,
    refresh: updateUnreadDot
  };

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
