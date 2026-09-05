import { createViolation } from "./shared.mjs";

function skipWhitespace(content, index) {
  while (index < content.length && /\s/u.test(content[index])) index += 1;
  return index;
}

function readQuoted(content, index) {
  const quote = content[index];
  let value = "";
  let hasEscape = false;
  index += 1;
  while (index < content.length) {
    const character = content[index];
    if (character === "\\") {
      hasEscape = true;
      if (index + 1 >= content.length) return null;
      value += content[index + 1];
      index += 2;
    } else if (character === quote) {
      return { value, end: index + 1, hasEscape };
    } else {
      value += character;
      index += 1;
    }
  }
  return null;
}

function readUrlFunction(content, index) {
  let cursor = skipWhitespace(content, index);
  if (content[cursor] === '"' || content[cursor] === "'") {
    const quoted = readQuoted(content, cursor);
    if (!quoted) return null;
    cursor = skipWhitespace(content, quoted.end);
    return content[cursor] === ")"
      ? { value: quoted.value, end: cursor + 1, hasEscape: quoted.hasEscape }
      : null;
  }
  const start = cursor;
  let hasEscape = false;
  while (cursor < content.length && content[cursor] !== ")") {
    if (content[cursor] === "\\") hasEscape = true;
    cursor += 1;
  }
  if (cursor >= content.length) return null;
  return {
    value: content.slice(start, cursor).trim(),
    end: cursor + 1,
    hasEscape,
  };
}

function isCssNameCharacter(character) {
  if (!character) return false;
  return /[-_0-9A-Za-z]/u.test(character) || character.codePointAt(0) >= 0x80;
}

// Decode identifier tokens only to recognize resource-loading keywords.
// Escaped resource keywords fail closed instead of being interpreted as URLs.
function readCssIdentifier(content, index) {
  let value = "";
  let hasEscape = false;
  let invalidEscape = false;
  let cursor = index;
  while (cursor < content.length) {
    const character = content[cursor];
    if (character !== "\\") {
      if (!isCssNameCharacter(character)) break;
      value += character;
      cursor += 1;
      continue;
    }

    hasEscape = true;
    const escaped = content[cursor + 1];
    if (escaped === undefined) {
      invalidEscape = true;
      cursor += 1;
      break;
    }
    const escapedCodePoint = escaped.codePointAt(0);
    if (
      escaped === "\n" ||
      escaped === "\r" ||
      escaped === "\f" ||
      escapedCodePoint < 0x20 ||
      escapedCodePoint === 0x7f
    ) {
      invalidEscape = true;
      cursor += escaped === "\r" && content[cursor + 2] === "\n" ? 3 : 2;
      continue;
    }
    if (/[0-9A-Fa-f]/u.test(escaped)) {
      let end = cursor + 1;
      while (
        end < content.length &&
        end < cursor + 7 &&
        /[0-9A-Fa-f]/u.test(content[end])
      ) {
        end += 1;
      }
      const codePoint = Number.parseInt(content.slice(cursor + 1, end), 16);
      if (
        codePoint === 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        invalidEscape = true;
      } else {
        value += String.fromCodePoint(codePoint);
      }
      if (/\s/u.test(content[end] || "")) {
        end += content[end] === "\r" && content[end + 1] === "\n" ? 2 : 1;
      }
      cursor = end;
      continue;
    }
    value += escaped;
    cursor += 2;
  }
  return { value, end: cursor, hasEscape, invalidEscape };
}

function skipAtRuleStatement(content, index) {
  let cursor = index;
  let depth = 0;
  while (cursor < content.length) {
    if (content[cursor] === '"' || content[cursor] === "'") {
      const quoted = readQuoted(content, cursor);
      if (!quoted) return content.length;
      cursor = quoted.end;
      continue;
    }
    if (content[cursor] === "(") depth += 1;
    else if (content[cursor] === ")" && depth > 0) depth -= 1;
    else if (content[cursor] === ";" && depth === 0) return cursor + 1;
    cursor += 1;
  }
  return content.length;
}

function unsupportedEscapeViolation(requestUrl) {
  return createViolation(
    "unsupported-css-escape",
    "CSS escapes are unsupported inside @import and url() resource specifiers",
    {
      path: requestUrl,
      suggestedAction:
        "Use an unescaped literal local resource URL; CSS resource escapes fail closed.",
    },
  );
}

function parseCssDependencies(content, requestUrl) {
  const imports = [];
  const assets = [];
  const violations = [];
  let index = 0;
  while (index < content.length) {
    if (content[index] === "/" && content[index + 1] === "*") {
      const end = content.indexOf("*/", index + 2);
      if (end === -1) {
        violations.push(
          createViolation("invalid-css", "unterminated CSS comment", {
            path: requestUrl,
            suggestedAction: "Rebuild syntactically valid CSS.",
          }),
        );
        break;
      }
      index = end + 2;
      continue;
    }
    if (content[index] === '"' || content[index] === "'") {
      const quoted = readQuoted(content, index);
      if (!quoted) {
        violations.push(
          createViolation("invalid-css", "unterminated CSS string", {
            path: requestUrl,
            suggestedAction: "Rebuild syntactically valid CSS.",
          }),
        );
        break;
      }
      index = quoted.end;
      continue;
    }
    if (content[index] === "@") {
      const keyword = readCssIdentifier(content, index + 1);
      if (keyword.value.toLowerCase() === "import") {
        if (keyword.hasEscape || keyword.invalidEscape) {
          violations.push(unsupportedEscapeViolation(requestUrl));
          index = skipAtRuleStatement(content, keyword.end);
          continue;
        }
        const cursor = skipWhitespace(content, keyword.end);
        let parsed = null;
        let keywordHasEscape = false;
        if (content[cursor] === '"' || content[cursor] === "'") {
          parsed = readQuoted(content, cursor);
        } else {
          const urlKeyword = readCssIdentifier(content, cursor);
          const open = skipWhitespace(content, urlKeyword.end);
          if (
            urlKeyword.value.toLowerCase() === "url" &&
            content[open] === "("
          ) {
            keywordHasEscape = urlKeyword.hasEscape || urlKeyword.invalidEscape;
            parsed = readUrlFunction(content, open + 1);
          }
        }
        if (parsed) {
          if (keywordHasEscape || parsed.hasEscape) {
            violations.push(unsupportedEscapeViolation(requestUrl));
          } else {
            imports.push(parsed.value);
          }
          index = parsed.end;
        } else {
          violations.push(
            createViolation(
              "invalid-css-import",
              "@import must use a literal string or url()",
              {
                path: requestUrl,
                suggestedAction: "Use a literal local @import URL.",
              },
            ),
          );
          index = keyword.end;
        }
        continue;
      }
    }

    const before = index > 0 ? content[index - 1] : "";
    if (
      !isCssNameCharacter(before) &&
      before !== "\\" &&
      (content[index] === "\\" || /[-_A-Za-z]/u.test(content[index] || ""))
    ) {
      const keyword = readCssIdentifier(content, index);
      const open = skipWhitespace(content, keyword.end);
      if (keyword.value.toLowerCase() === "url" && content[open] === "(") {
        const parsed = readUrlFunction(content, open + 1);
        if (keyword.hasEscape || keyword.invalidEscape) {
          violations.push(unsupportedEscapeViolation(requestUrl));
        } else if (parsed?.hasEscape) {
          violations.push(unsupportedEscapeViolation(requestUrl));
        } else if (parsed) {
          assets.push(parsed.value);
        } else {
          violations.push(
            createViolation(
              "invalid-css-url",
              "url() must contain a closed literal URL",
              {
                path: requestUrl,
                suggestedAction: "Use a closed literal local CSS URL.",
              },
            ),
          );
        }
        index = parsed?.end || open + 1;
        continue;
      }
    }
    index += 1;
  }
  return { imports, assets, violations };
}

export { parseCssDependencies };
