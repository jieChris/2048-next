/**
 * Shared utility functions for audit scripts.
 *
 * Extracted from game-manager-audit.mjs, refactor-closure-audit.mjs,
 * and refactor-progress-report.mjs to eliminate duplication.
 */

/**
 * Count lines that are not blank (after trimming whitespace).
 * @param {string} content
 * @returns {number}
 */
export function countNonEmptyLines(content) {
  if (!content) return 0;
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

/**
 * Collect top-level `function name(` declarations and compute their
 * approximate line ranges (start, end, lineCount).
 * @param {string} content
 * @returns {Array<{name: string, startLine: number, endLine: number, lineCount: number}>}
 */
export function collectFunctionRanges(content) {
  const lines = content.split(/\r?\n/u);
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^function\s+([A-Za-z0-9_]+)\s*\(/u);
    if (!match) continue;
    starts.push({ line: index + 1, name: match[1] });
  }
  return starts.map((entry, index) => {
    const next = starts[index + 1];
    const endLine = next ? next.line - 1 : lines.length;
    return {
      name: entry.name,
      startLine: entry.line,
      endLine,
      lineCount: endLine - entry.line + 1
    };
  });
}
