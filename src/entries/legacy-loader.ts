function installLateDomReadyCompatibility(): void {
  const documentLike = document as Document & {
    __legacyDomContentLoadedCompatInstalled?: boolean;
  };
  if (documentLike.__legacyDomContentLoadedCompatInstalled) return;
  documentLike.__legacyDomContentLoadedCompatInstalled = true;

  const originalAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = function patchedAddEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (type === "DOMContentLoaded" && listener && document.readyState !== "loading") {
      queueMicrotask(() => {
        if (typeof listener === "function") {
          listener.call(document, new Event("DOMContentLoaded"));
          return;
        }
        if (typeof listener.handleEvent === "function") {
          listener.handleEvent(new Event("DOMContentLoaded"));
        }
      });
      return;
    }

    if (!listener) return;
    originalAddEventListener(type, listener, options);
  };
}

export function loadLegacyScriptsSequentially(urls: readonly string[]): Promise<void> {
  const head = document.head || document.documentElement;
  const preloaded = new Set<string>();

  installLateDomReadyCompatibility();

  for (const url of urls) {
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "script";
    preload.href = url;
    head.appendChild(preload);
  }

  return new Promise<void>((resolve, reject) => {
    if (urls.length === 0) {
      resolve();
      return;
    }

    let remaining = urls.length;
    let settled = false;
    const completeOne = () => {
      if (settled) return;
      remaining -= 1;
      if (remaining === 0) {
        settled = true;
        resolve();
      }
    };
    const fail = (url: string) => {
      if (settled) return;
      settled = true;
      reject(new Error("Failed to load legacy script: " + url));
    };

    for (const url of urls) {
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = completeOne;
      script.onerror = () => fail(url);
      head.appendChild(script);
    }
  });
}
