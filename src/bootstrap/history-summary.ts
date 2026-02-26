type SummaryFilterValue = "all" | "mismatch" | "match" | "incomplete";

const FILTER_LABELS: Record<SummaryFilterValue, string> = {
  all: "全部",
  mismatch: "仅不一致",
  match: "仅一致",
  incomplete: "样本不足"
};

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizeNonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

function normalizeFilter(value: unknown): SummaryFilterValue {
  if (value === "mismatch") return "mismatch";
  if (value === "match") return "match";
  if (value === "incomplete") return "incomplete";
  return "all";
}

export function resolveHistorySummaryText(input: {
  total?: unknown;
  page?: unknown;
  pageSize?: unknown;
  adapterParityFilter?: unknown;
}): string {
  const total = normalizeNonNegativeInteger(input && input.total);
  const page = normalizePositiveInteger(input && input.page, 1);
  const pageSize = normalizePositiveInteger(input && input.pageSize, 30);
  const filter = normalizeFilter(input && input.adapterParityFilter);

  return (
    "共 " +
    total +
    " 条记录" +
    " · 当前第 " +
    page +
    " 页" +
    " · 每页 " +
    pageSize +
    " 条" +
    " · 诊断筛选: " +
    FILTER_LABELS[filter]
  );
}
