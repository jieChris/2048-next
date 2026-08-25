export interface ThemePlazaSubmissionNotice {
  show(): void;
  hide(): void;
  destroy(): void;
}

export interface ThemePlazaSubmissionNoticeOptions {
  documentLike?: Document;
  windowLike?: Pick<Window, "setTimeout" | "clearTimeout">;
  durationMs?: number;
  language?: () => "zh" | "en";
}

const NOTICE_ID = "theme-plaza-submission-notice";

function createNoticeNode(documentLike: Document): HTMLDivElement {
  const host = documentLike.createElement("div");
  host.id = NOTICE_ID;
  host.className = "theme-plaza-submission-notice";
  host.hidden = true;
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.setAttribute("aria-atomic", "true");

  const card = documentLike.createElement("div");
  card.className = "theme-plaza-submission-notice-card";

  const icon = documentLike.createElement("span");
  icon.className = "theme-plaza-submission-notice-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✓";

  const copy = documentLike.createElement("div");
  copy.className = "theme-plaza-submission-notice-copy";
  const title = documentLike.createElement("strong");
  title.dataset.noticeTitle = "1";
  const detail = documentLike.createElement("span");
  detail.dataset.noticeDetail = "1";
  copy.append(title, detail);

  const close = documentLike.createElement("button");
  close.className = "theme-plaza-submission-notice-close";
  close.type = "button";
  close.dataset.noticeClose = "1";
  close.textContent = "×";

  card.append(icon, copy, close);
  host.append(card);
  documentLike.body.append(host);
  return host;
}

export function createThemePlazaSubmissionNotice(
  options: ThemePlazaSubmissionNoticeOptions = {},
): ThemePlazaSubmissionNotice {
  const documentLike = options.documentLike ?? document;
  const windowLike = options.windowLike ?? window;
  const durationMs = Math.max(0, options.durationMs ?? 3000);
  const language = options.language ?? (() => "zh");
  const host =
    (documentLike.getElementById(NOTICE_ID) as HTMLDivElement | null) ??
    createNoticeNode(documentLike);
  const close = host.querySelector<HTMLButtonElement>("[data-notice-close]");
  let hideTimer: number | null = null;

  const clearTimer = () => {
    if (hideTimer == null) return;
    windowLike.clearTimeout(hideTimer);
    hideTimer = null;
  };

  const hide = () => {
    clearTimer();
    host.classList.remove("is-visible");
    host.hidden = true;
  };

  const show = () => {
    clearTimer();
    const isEnglish = language() === "en";
    const title = host.querySelector<HTMLElement>("[data-notice-title]");
    const detail = host.querySelector<HTMLElement>("[data-notice-detail]");
    if (title)
      title.textContent = isEnglish ? "Submitted for review" : "已提交审核";
    if (detail)
      detail.textContent = isEnglish
        ? "You can track the result under My Share."
        : "可在“我的分享”中查看审核状态。";
    if (close)
      close.setAttribute(
        "aria-label",
        isEnglish ? "Close notification" : "关闭提示",
      );
    host.hidden = false;
    host.classList.add("is-visible");
    hideTimer = windowLike.setTimeout(hide, durationMs);
  };

  close?.addEventListener("click", hide);

  return {
    show,
    hide,
    destroy() {
      hide();
      close?.removeEventListener("click", hide);
      host.remove();
    },
  };
}
