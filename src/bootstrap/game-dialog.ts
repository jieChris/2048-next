export type GameDialogKind = "info" | "confirm" | "danger" | "prompt";

export interface GameDialogOptions {
  title?: string | null | undefined;
  kind?: GameDialogKind | null | undefined;
  confirmText?: string | null | undefined;
  cancelText?: string | null | undefined;
  placeholder?: string | null | undefined;
  multiline?: boolean | null | undefined;
}

export interface GameDialogRuntime {
  alert(message: unknown, options?: GameDialogOptions | null): Promise<void>;
  confirm(message: unknown, options?: GameDialogOptions | null): Promise<boolean>;
  prompt(
    message: unknown,
    defaultValue?: unknown,
    options?: GameDialogOptions | null
  ): Promise<string | null>;
}

interface DialogState {
  resolve: (value: unknown) => void;
  mode: "alert" | "confirm" | "prompt";
  input: HTMLInputElement | HTMLTextAreaElement | null;
}

type WindowWithGameDialog = Window & {
  GameDialog?: GameDialogRuntime;
};

const OVERLAY_ID = "game-dialog-overlay";
const PANEL_ID = "game-dialog-panel";
const TITLE_ID = "game-dialog-title";
const MESSAGE_ID = "game-dialog-message";
const INPUT_WRAP_ID = "game-dialog-input-wrap";
const ACTIONS_ID = "game-dialog-actions";
const CONFIRM_ID = "game-dialog-confirm";
const CANCEL_ID = "game-dialog-cancel";

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function isEnglishDocument(documentLike: Document): boolean {
  const lang = toText(documentLike.documentElement && documentLike.documentElement.lang).toLowerCase();
  return lang.startsWith("en");
}

function defaultTitle(kind: GameDialogKind, isEnglish: boolean): string {
  if (kind === "danger") return isEnglish ? "Confirm Action" : "确认操作";
  if (kind === "prompt") return isEnglish ? "Input" : "输入";
  if (kind === "confirm") return isEnglish ? "Confirm" : "确认";
  return isEnglish ? "Notice" : "提示";
}

function defaultConfirmText(mode: DialogState["mode"], isEnglish: boolean): string {
  if (mode === "confirm") return isEnglish ? "Confirm" : "确认";
  return isEnglish ? "OK" : "确定";
}

function defaultCancelText(isEnglish: boolean): string {
  return isEnglish ? "Cancel" : "取消";
}

function append(parent: Element, child: Element): void {
  parent.appendChild(child);
}

function createButton(documentLike: Document, id: string, className: string): HTMLButtonElement {
  const button = documentLike.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = className;
  return button;
}

function ensureDom(documentLike: Document): {
  overlay: HTMLDivElement;
  panel: HTMLDivElement;
  title: HTMLHeadingElement;
  message: HTMLDivElement;
  inputWrap: HTMLDivElement;
  actions: HTMLDivElement;
  confirmButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
} | null {
  if (!documentLike.body) return null;

  let overlay = documentLike.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (!overlay) {
    overlay = documentLike.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "game-dialog-overlay";
    overlay.style.display = "none";

    const panel = documentLike.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "game-dialog-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", TITLE_ID);
    panel.setAttribute("aria-describedby", MESSAGE_ID);

    const title = documentLike.createElement("h3");
    title.id = TITLE_ID;
    title.className = "game-dialog-title";

    const message = documentLike.createElement("div");
    message.id = MESSAGE_ID;
    message.className = "game-dialog-message";

    const inputWrap = documentLike.createElement("div");
    inputWrap.id = INPUT_WRAP_ID;
    inputWrap.className = "game-dialog-input-wrap";

    const actions = documentLike.createElement("div");
    actions.id = ACTIONS_ID;
    actions.className = "game-dialog-actions";

    const cancelButton = createButton(documentLike, CANCEL_ID, "game-dialog-button game-dialog-button-secondary");
    const confirmButton = createButton(documentLike, CONFIRM_ID, "game-dialog-button game-dialog-button-primary");

    append(actions, cancelButton);
    append(actions, confirmButton);
    append(panel, title);
    append(panel, message);
    append(panel, inputWrap);
    append(panel, actions);
    append(overlay, panel);
    append(documentLike.body, overlay);
  }

  const panel = documentLike.getElementById(PANEL_ID) as HTMLDivElement | null;
  const title = documentLike.getElementById(TITLE_ID) as HTMLHeadingElement | null;
  const message = documentLike.getElementById(MESSAGE_ID) as HTMLDivElement | null;
  const inputWrap = documentLike.getElementById(INPUT_WRAP_ID) as HTMLDivElement | null;
  const actions = documentLike.getElementById(ACTIONS_ID) as HTMLDivElement | null;
  const confirmButton = documentLike.getElementById(CONFIRM_ID) as HTMLButtonElement | null;
  const cancelButton = documentLike.getElementById(CANCEL_ID) as HTMLButtonElement | null;

  if (!panel || !title || !message || !inputWrap || !actions || !confirmButton || !cancelButton) {
    return null;
  }

  return { overlay, panel, title, message, inputWrap, actions, confirmButton, cancelButton };
}

function clearChildren(node: Element): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setMessageText(documentLike: Document, node: HTMLElement, message: unknown): void {
  const text = toText(message);
  clearChildren(node);
  const parts = text.split(/\r?\n/);
  for (let i = 0; i < parts.length; i += 1) {
    if (i > 0) node.appendChild(documentLike.createElement("br"));
    node.appendChild(documentLike.createTextNode(parts[i]));
  }
}

export function installGameDialog(windowLike: WindowWithGameDialog = window): GameDialogRuntime | null {
  if (!windowLike || !windowLike.document) return null;
  if (windowLike.GameDialog) return windowLike.GameDialog;

  const documentLike = windowLike.document;
  let activeState: DialogState | null = null;
  let previousFocus: Element | null = null;

  function close(value: unknown): void {
    const dom = ensureDom(documentLike);
    const state = activeState;
    activeState = null;
    if (dom) {
      dom.overlay.style.display = "none";
      dom.overlay.classList.remove("is-open", "is-danger", "is-prompt", "is-confirm", "is-info");
    }
    if (previousFocus && typeof (previousFocus as HTMLElement).focus === "function") {
      try {
        (previousFocus as HTMLElement).focus();
      } catch (_err) {}
    }
    previousFocus = null;
    if (state) state.resolve(value);
  }

  function open(mode: DialogState["mode"], message: unknown, defaultValue: unknown, options?: GameDialogOptions | null) {
    const dom = ensureDom(documentLike);
    const isEnglish = isEnglishDocument(documentLike);
    if (!dom) {
      return Promise.resolve(mode === "confirm" ? false : mode === "prompt" ? null : undefined);
    }

    const opts = options || {};
    const kind = (toText(opts.kind).trim() as GameDialogKind) || (mode === "prompt" ? "prompt" : mode);
    const normalizedKind: GameDialogKind =
      kind === "danger" || kind === "prompt" || kind === "confirm" || kind === "info" ? kind : "info";

    previousFocus = documentLike.activeElement;
    dom.title.textContent = toText(opts.title).trim() || defaultTitle(normalizedKind, isEnglish);
    setMessageText(documentLike, dom.message, message);
    clearChildren(dom.inputWrap);
    dom.inputWrap.style.display = mode === "prompt" ? "block" : "none";
    let input: HTMLInputElement | HTMLTextAreaElement | null = null;
    if (mode === "prompt") {
      input = opts.multiline
        ? documentLike.createElement("textarea")
        : documentLike.createElement("input");
      input.className = "game-dialog-input";
      input.value = toText(defaultValue);
      input.setAttribute("placeholder", toText(opts.placeholder || ""));
      dom.inputWrap.appendChild(input);
    }

    dom.cancelButton.style.display = mode === "alert" ? "none" : "";
    dom.confirmButton.textContent = toText(opts.confirmText).trim() || defaultConfirmText(mode, isEnglish);
    dom.cancelButton.textContent = toText(opts.cancelText).trim() || defaultCancelText(isEnglish);
    dom.confirmButton.className =
      normalizedKind === "danger"
        ? "game-dialog-button game-dialog-button-danger"
        : "game-dialog-button game-dialog-button-primary";

    dom.overlay.className = "game-dialog-overlay is-open is-" + normalizedKind;
    dom.overlay.style.display = "flex";

    return new Promise((resolve) => {
      activeState = { resolve, mode, input };
      windowLike.setTimeout(() => {
        const focusTarget = input || dom.confirmButton;
        try {
          focusTarget.focus();
        } catch (_err) {}
      }, 0);
    });
  }

  const runtime: GameDialogRuntime = {
    alert(message, options) {
      return open("alert", message, "", options).then(() => undefined);
    },
    confirm(message, options) {
      return open("confirm", message, "", options).then((value) => value === true);
    },
    prompt(message, defaultValue, options) {
      return open("prompt", message, defaultValue, options).then((value) =>
        typeof value === "string" ? value : null
      );
    }
  };

  const dom = ensureDom(documentLike);
  if (dom) {
    dom.confirmButton.addEventListener("click", () => {
      if (!activeState) return;
      if (activeState.mode === "prompt") {
        close(activeState.input ? activeState.input.value : "");
        return;
      }
      close(true);
    });
    dom.cancelButton.addEventListener("click", () => close(activeState && activeState.mode === "confirm" ? false : null));
    dom.overlay.addEventListener("click", (event) => {
      if (event.target !== dom.overlay || !activeState || activeState.mode === "alert") return;
      close(activeState.mode === "confirm" ? false : null);
    });
    dom.overlay.addEventListener("keydown", (event) => {
      if (!activeState) return;
      if (event.key === "Escape" && activeState.mode !== "alert") {
        event.preventDefault();
        close(activeState.mode === "confirm" ? false : null);
      }
      if (event.key === "Enter" && activeState.mode !== "prompt") {
        event.preventDefault();
        close(true);
      }
    });
  }

  windowLike.GameDialog = runtime;
  return runtime;
}
