import { JSDOM } from "jsdom";

import { createViolation } from "./shared.mjs";
import { logicalAssetUrl, normalizeRequestUrl } from "./request-url.mjs";

const CRITICAL_LINK_RELS = new Set(["stylesheet", "preload", "modulepreload"]);

function parseSrcset(value) {
  const urls = [];
  let index = 0;
  while (index < value.length) {
    while (index < value.length && /[\s,]/u.test(value[index])) index += 1;
    if (index >= value.length) break;
    const start = index;
    const dataUrl = value.slice(index).toLowerCase().startsWith("data:");
    if (dataUrl) {
      while (index < value.length && !/\s/u.test(value[index])) index += 1;
    } else {
      while (index < value.length && !/[\s,]/u.test(value[index])) index += 1;
    }
    urls.push(value.slice(start, index));
    while (index < value.length && value[index] !== ",") index += 1;
    if (value[index] === ",") index += 1;
  }
  return urls.filter(Boolean);
}

function parseBuiltHtml(html, htmlRequestUrl) {
  const document = new JSDOM(html).window.document;
  const direct = new Map();
  const preloads = new Set();
  const entries = [];
  const violations = [];
  const embedded = [];

  function add(rawValue, { preload = false, entry = false } = {}) {
    let normalized;
    try {
      normalized = normalizeRequestUrl(rawValue, htmlRequestUrl);
    } catch (error) {
      violations.push(
        createViolation("unsafe-resource-url", error.message, {
          path: rawValue,
          suggestedAction:
            "Use a safe local downloadable URL; external, protocol-relative, drive, backslash, and traversal URLs fail closed.",
        }),
      );
      return;
    }
    if (normalized.kind !== "request") {
      embedded.push({ raw: rawValue, policy: `${normalized.kind}-excluded` });
      return;
    }
    direct.set(normalized.requestUrl, normalized);
    if (preload) preloads.add(logicalAssetUrl(normalized.requestUrl));
    if (entry) entries.push(normalized.requestUrl);
  }

  for (const element of document.querySelectorAll("script[src]")) {
    if (element.hasAttribute("nomodule")) continue;
    const source = element.getAttribute("src");
    add(source, {
      entry:
        (element.getAttribute("type") || "").trim().toLowerCase() === "module",
    });
  }
  for (const element of document.querySelectorAll("link[href]")) {
    const rels = (element.getAttribute("rel") || "")
      .toLowerCase()
      .split(/\s+/u)
      .filter(Boolean);
    if (!rels.some((rel) => CRITICAL_LINK_RELS.has(rel))) continue;
    const preload = rels.includes("preload") || rels.includes("modulepreload");
    add(element.getAttribute("href"), { preload });
    if (
      rels.includes("preload") &&
      (element.getAttribute("as") || "").trim().toLowerCase() === "image" &&
      element.hasAttribute("imagesrcset")
    ) {
      for (const source of parseSrcset(
        element.getAttribute("imagesrcset") || "",
      )) {
        add(source, { preload: true });
      }
    }
  }
  const directAttributeSelectors = [
    ["img[src]", "src"],
    ["source[src]", "src"],
    ["audio[src]", "src"],
    ["video[src]", "src"],
    ["video[poster]", "poster"],
    ["track[src]", "src"],
    ["iframe[src]", "src"],
    ["embed[src]", "src"],
    ["object[data]", "data"],
    ['input[type="image"][src]', "src"],
  ];
  for (const [selector, attribute] of directAttributeSelectors) {
    for (const element of document.querySelectorAll(selector)) {
      add(element.getAttribute(attribute));
    }
  }
  for (const element of document.querySelectorAll(
    "img[srcset], source[srcset]",
  )) {
    for (const source of parseSrcset(element.getAttribute("srcset") || ""))
      add(source);
  }
  return {
    directResources: [...direct.values()],
    preloads: [...preloads].sort(),
    entries: [...new Set(entries)],
    violations,
    embedded,
  };
}

export { parseBuiltHtml, parseSrcset };
