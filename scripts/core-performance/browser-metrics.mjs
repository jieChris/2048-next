const EXPECTED_ABORTED_NAVIGATION_PATHS = new Set([
  "/2048.html",
  "/play.html",
  "/replay.html",
]);

function httpOriginFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}

function pathnameFromUrl(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function isExpectedNavigationAbort(request, failureText, baseUrl) {
  const url = request.url();
  const pathname = pathnameFromUrl(url);
  const expectedOrigin = httpOriginFromUrl(baseUrl);
  return Boolean(
    failureText === "net::ERR_ABORTED" &&
      httpOriginFromUrl(url) === expectedOrigin &&
      request.isNavigationRequest?.() === true &&
      request.resourceType?.() === "document" &&
      pathname &&
      EXPECTED_ABORTED_NAVIGATION_PATHS.has(pathname),
  );
}

function attachPageErrors(page, baseUrl) {
  const errors = [];
  const expectedOrigin = httpOriginFromUrl(baseUrl);
  if (!expectedOrigin)
    throw new Error("page error collector requires HTTP(S) baseUrl");
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  page.on("request", (request) => {
    const url = request.url();
    const origin = httpOriginFromUrl(url);
    if (origin && origin !== expectedOrigin) {
      errors.push(
        `unexpected-cross-origin-request: ${request.method()} ${url}`,
      );
    }
  });
  page.on("requestfailed", (request) => {
    const failureText = request.failure()?.errorText || "unknown";
    if (!httpOriginFromUrl(request.url())) return;
    if (isExpectedNavigationAbort(request, failureText, baseUrl)) return;
    errors.push(
      `requestfailed: ${request.method()} ${request.url()} ${failureText}`,
    );
  });
  page.on("response", (response) => {
    const url = response.url();
    if (httpOriginFromUrl(url) && response.status() >= 400) {
      errors.push(`critical-response: ${response.status()} ${url}`);
    }
  });
  return errors;
}

function createNetworkCollector(session, baseUrl) {
  const expectedOrigin = httpOriginFromUrl(baseUrl);
  if (!expectedOrigin)
    throw new Error("network collector requires HTTP(S) baseUrl");
  let active = false;
  let requestCount = 0;
  let transferBytes = 0;
  let lastActivityAt = 0;
  const requests = new Map();
  const completedRequestKeys = new Set();
  const unexpectedOrigins = new Set();

  function isTracked(url) {
    return Boolean(httpOriginFromUrl(url));
  }

  function countEncoded(requestKey, value) {
    if (completedRequestKeys.has(requestKey)) return;
    completedRequestKeys.add(requestKey);
    transferBytes += Math.max(0, Number(value) || 0);
  }

  session.on("Network.requestWillBeSent", (event) => {
    if (!active || !isTracked(event.request?.url)) return;
    const requestUrl = event.request.url;
    const requestOrigin = httpOriginFromUrl(requestUrl);
    if (requestOrigin !== expectedOrigin) unexpectedOrigins.add(requestUrl);
    const prior = requests.get(event.requestId);
    if (event.redirectResponse) {
      if (prior) {
        countEncoded(
          `${event.requestId}:${prior.generation}`,
          event.redirectResponse.encodedDataLength,
        );
      } else {
        requestCount += 1;
        countEncoded(
          `${event.requestId}:redirect-0`,
          event.redirectResponse.encodedDataLength,
        );
      }
    }
    const generation = prior ? prior.generation + 1 : 0;
    requests.set(event.requestId, {
      generation,
      url: event.request.url,
      unfinished: true,
    });
    requestCount += 1;
    lastActivityAt = Date.now();
  });
  session.on("Network.loadingFinished", (event) => {
    if (!active) return;
    const current = requests.get(event.requestId);
    if (!current || !current.unfinished) return;
    current.unfinished = false;
    countEncoded(
      `${event.requestId}:${current.generation}`,
      event.encodedDataLength,
    );
    lastActivityAt = Date.now();
  });
  session.on("Network.loadingFailed", (event) => {
    if (!active) return;
    const current = requests.get(event.requestId);
    if (!current || !current.unfinished) return;
    current.unfinished = false;
    countEncoded(`${event.requestId}:${current.generation}`, 0);
    lastActivityAt = Date.now();
  });

  function unfinished() {
    return [...requests.values()]
      .filter((item) => item.unfinished)
      .map((item) => item.url);
  }

  return {
    start() {
      active = true;
      requestCount = 0;
      transferBytes = 0;
      lastActivityAt = Date.now();
      requests.clear();
      completedRequestKeys.clear();
      unexpectedOrigins.clear();
    },
    stop() {
      active = false;
    },
    async waitForIdle({
      quietWindowMs = 100,
      timeoutMs = 5_000,
      pollIntervalMs = 25,
    } = {}) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() <= deadline) {
        if (
          unfinished().length === 0 &&
          Date.now() - lastActivityAt >= quietWindowMs
        ) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
      throw new Error(
        `tracked HTTP(S) requests unfinished after ${timeoutMs}ms: ${unfinished().join(", ") || "late activity"}`,
      );
    },
    snapshot() {
      const pending = unfinished();
      if (pending.length > 0) {
        throw new Error(
          `cannot snapshot network metrics with unfinished requests: ${pending.join(", ")}`,
        );
      }
      if (unexpectedOrigins.size > 0) {
        throw new Error(
          `unexpected cross-origin HTTP(S) requests: ${[...unexpectedOrigins].sort().join(", ")}`,
        );
      }
      return { requestCount, transferBytes };
    },
  };
}

async function installPerformanceObservers(context) {
  await context.addInitScript(() => {
    const state = {
      lcpSupported: false,
      lcpEntryCount: 0,
      lcpMs: 0,
      lcpLastUpdatedAt: 0,
      cls: 0,
      longTaskTotalMs: 0,
      longTaskMaxMs: 0,
    };
    Object.defineProperty(window, "__corePerformanceState", {
      value: state,
      configurable: false,
      writable: false,
    });
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.lcpEntryCount += 1;
          state.lcpMs = Math.max(state.lcpMs, entry.startTime);
          state.lcpLastUpdatedAt = performance.now();
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      state.lcpSupported = true;
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) state.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTaskTotalMs += entry.duration;
          state.longTaskMaxMs = Math.max(state.longTaskMaxMs, entry.duration);
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
}

async function waitForLcpStability(
  readSnapshot,
  { quietWindowMs = 500, timeoutMs = 3_000, pollIntervalMs = 50 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() <= deadline) {
    last = await readSnapshot();
    if (
      last?.supported === true &&
      Number(last.entryCount) > 0 &&
      Number(last.lcpMs) > 0 &&
      Number(last.quietForMs) >= quietWindowMs
    ) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `LCP observer did not produce a stable entry within ${timeoutMs}ms; last=${JSON.stringify(last)}`,
  );
}

function validateLoadMetricSnapshot(snapshot) {
  const navigation = snapshot?.navigation;
  if (
    !navigation ||
    !Number.isFinite(Number(navigation.requestStart)) ||
    !Number.isFinite(Number(navigation.responseStart))
  ) {
    throw new Error("navigation performance entry is missing or invalid");
  }
  const ttfbMs =
    Number(navigation.responseStart) - Number(navigation.requestStart);
  if (!(ttfbMs > 0)) throw new Error("navigation TTFB must be positive");
  if (!(Number(snapshot.fcpMs) > 0)) {
    throw new Error("FCP performance entry is missing or invalid");
  }
  const lcp = snapshot.lcp;
  if (
    lcp?.supported !== true ||
    !(Number(lcp.entryCount) > 0) ||
    !(Number(lcp.lcpMs) > 0)
  ) {
    throw new Error("LCP observer state is missing or invalid");
  }
  return {
    ttfbMs,
    fcpMs: Number(snapshot.fcpMs),
    lcpMs: Number(lcp.lcpMs),
    cls: Math.max(0, Number(snapshot.cls) || 0),
    longTaskTotalMs: Math.max(0, Number(snapshot.longTaskTotalMs) || 0),
    longTaskMaxMs: Math.max(0, Number(snapshot.longTaskMaxMs) || 0),
    decodedBodyBytes: Math.max(0, Number(snapshot.decodedBodyBytes) || 0),
  };
}

async function waitForSettledLoad(page, network) {
  const readLcpSnapshot = () =>
    page.evaluate(() => {
      const state = window.__corePerformanceState || {};
      return {
        supported: state.lcpSupported === true,
        entryCount: Number(state.lcpEntryCount || 0),
        lcpMs: Number(state.lcpMs || 0),
        quietForMs:
          state.lcpLastUpdatedAt > 0
            ? Math.max(0, performance.now() - state.lcpLastUpdatedAt)
            : 0,
      };
    });
  await network.waitForIdle();
  await waitForLcpStability(readLcpSnapshot);
  // Recheck both conditions once so a request that starts during the first LCP
  // quiet window cannot be laundered by an earlier network-idle snapshot.
  await network.waitForIdle();
  await waitForLcpStability(readLcpSnapshot);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

async function collectLoadMetrics(page, readyMs, network) {
  await waitForSettledLoad(page, network);
  const snapshot = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] || null;
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
    const resources = performance.getEntriesByType("resource");
    const decodedBodyBytes = [navigation, ...resources].reduce(
      (sum, entry) => sum + Math.max(0, Number(entry?.decodedBodySize) || 0),
      0,
    );
    const state = window.__corePerformanceState || {};
    return {
      navigation: navigation
        ? {
            requestStart: navigation.requestStart,
            responseStart: navigation.responseStart,
            decodedBodySize: navigation.decodedBodySize,
          }
        : null,
      fcpMs: fcp?.startTime ?? null,
      lcp: {
        supported: state.lcpSupported === true,
        entryCount: Number(state.lcpEntryCount || 0),
        lcpMs: Number(state.lcpMs || 0),
      },
      cls: state.cls,
      longTaskTotalMs: state.longTaskTotalMs,
      longTaskMaxMs: state.longTaskMaxMs,
      decodedBodyBytes,
    };
  });
  return {
    ...validateLoadMetricSnapshot(snapshot),
    readyMs,
    ...network.snapshot(),
  };
}

export {
  EXPECTED_ABORTED_NAVIGATION_PATHS,
  attachPageErrors,
  collectLoadMetrics,
  createNetworkCollector,
  installPerformanceObservers,
  validateLoadMetricSnapshot,
  waitForLcpStability,
  waitForSettledLoad,
};
