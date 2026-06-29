export interface OpenApiServerSummary {
  url: string;
  description: string;
}

export interface OpenApiOperationSummary {
  method: string;
  path: string;
  summary: string;
  tags: string[];
  deprecated: boolean;
}

export interface OpenApiSummary {
  title: string;
  version: string;
  summary: string;
  servers: OpenApiServerSummary[];
  operations: OpenApiOperationSummary[];
}

export interface ApiDocsBootstrapOptions {
  documentLike?: Document;
  fetchLike?: typeof fetch;
  contractUrl?: string;
}

const DEFAULT_CONTRACT_URL = "./openapi/2048next.v1.yaml";
const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);

function cleanYamlValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => cleanYamlValue(item))
    .filter(Boolean);
}

function countByMethod(operations: OpenApiOperationSummary[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const operation of operations) {
    counts.set(operation.method, (counts.get(operation.method) || 0) + 1);
  }
  return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function groupByPrimaryTag(
  operations: OpenApiOperationSummary[]
): Array<[string, OpenApiOperationSummary[]]> {
  const groups = new Map<string, OpenApiOperationSummary[]>();
  for (const operation of operations) {
    const tag = operation.tags[0] || "Other";
    const bucket = groups.get(tag) || [];
    bucket.push(operation);
    groups.set(tag, bucket);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export function extractOpenApiSummary(source: string): OpenApiSummary {
  const lines = source.split(/\r?\n/u);
  const result: OpenApiSummary = {
    title: "2048 Next API",
    version: "--",
    summary: "",
    servers: [],
    operations: []
  };
  let topSection = "";
  let currentServer: OpenApiServerSummary | null = null;
  let currentPath = "";
  let currentOperation: OpenApiOperationSummary | null = null;

  for (const line of lines) {
    const topMatch = line.match(/^([A-Za-z][\w-]*):/u);
    if (topMatch) {
      topSection = topMatch[1] || "";
      currentServer = null;
      if (topSection !== "paths") {
        currentPath = "";
        currentOperation = null;
      }
      continue;
    }

    if (topSection === "info") {
      const titleMatch = line.match(/^  title:\s*(.+)$/u);
      const versionMatch = line.match(/^  version:\s*(.+)$/u);
      const summaryMatch = line.match(/^  summary:\s*(.+)$/u);
      if (titleMatch) result.title = cleanYamlValue(titleMatch[1] || "");
      if (versionMatch) result.version = cleanYamlValue(versionMatch[1] || "");
      if (summaryMatch) result.summary = cleanYamlValue(summaryMatch[1] || "");
      continue;
    }

    if (topSection === "servers") {
      const serverMatch = line.match(/^  - url:\s*(.+)$/u);
      const descriptionMatch = line.match(/^    description:\s*(.+)$/u);
      if (serverMatch) {
        currentServer = {
          url: cleanYamlValue(serverMatch[1] || ""),
          description: ""
        };
        result.servers.push(currentServer);
      } else if (descriptionMatch && currentServer) {
        currentServer.description = cleanYamlValue(descriptionMatch[1] || "");
      }
      continue;
    }

    if (topSection !== "paths") continue;

    const pathMatch = line.match(/^  (\/[^:]+):\s*$/u);
    if (pathMatch) {
      currentPath = pathMatch[1] || "";
      currentOperation = null;
      continue;
    }

    const methodMatch = line.match(/^    ([a-z]+):\s*$/u);
    const method = methodMatch?.[1] || "";
    if (currentPath && HTTP_METHODS.has(method)) {
      currentOperation = {
        method: method.toUpperCase(),
        path: currentPath,
        summary: "",
        tags: [],
        deprecated: false
      };
      result.operations.push(currentOperation);
      continue;
    }

    if (!currentOperation) continue;

    const tagsMatch = line.match(/^      tags:\s*(.+)$/u);
    const summaryMatch = line.match(/^      summary:\s*(.+)$/u);
    const deprecatedMatch = line.match(/^      deprecated:\s*(true|false)$/u);
    if (tagsMatch) currentOperation.tags = parseInlineList(tagsMatch[1] || "");
    if (summaryMatch) currentOperation.summary = cleanYamlValue(summaryMatch[1] || "");
    if (deprecatedMatch) currentOperation.deprecated = deprecatedMatch[1] === "true";
  }

  return result;
}

function getNode<T extends HTMLElement>(documentLike: Document, id: string): T | null {
  return documentLike.getElementById(id) as T | null;
}

function setText(documentLike: Document, id: string, value: string): void {
  const node = getNode(documentLike, id);
  if (node) node.textContent = value;
}

function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createStat(documentLike: Document, value: string, label: string): HTMLElement {
  const node = documentLike.createElement("div");
  const strong = documentLike.createElement("strong");
  const span = documentLike.createElement("span");
  node.className = "api-docs-stat";
  strong.textContent = value;
  span.textContent = label;
  node.append(strong, span);
  return node;
}

function renderStats(documentLike: Document, summary: OpenApiSummary): void {
  const mount = getNode(documentLike, "api-docs-stats");
  if (!mount) return;
  clear(mount);
  mount.append(createStat(documentLike, String(summary.operations.length), "端点"));
  mount.append(createStat(documentLike, String(summary.servers.length), "服务地址"));
  for (const [method, count] of countByMethod(summary.operations)) {
    mount.append(createStat(documentLike, String(count), method));
  }
}

function renderServers(documentLike: Document, servers: OpenApiServerSummary[]): void {
  const mount = getNode(documentLike, "api-docs-servers");
  if (!mount) return;
  clear(mount);
  for (const server of servers) {
    const node = documentLike.createElement("div");
    const code = documentLike.createElement("code");
    const description = documentLike.createElement("p");
    node.className = "api-docs-server";
    code.textContent = server.url;
    description.textContent = server.description || "未提供说明";
    node.append(code, description);
    mount.append(node);
  }
}

function renderOperations(documentLike: Document, operations: OpenApiOperationSummary[]): void {
  const mount = getNode(documentLike, "api-docs-operations");
  if (!mount) return;
  clear(mount);

  for (const [tag, items] of groupByPrimaryTag(operations)) {
    const group = documentLike.createElement("section");
    const title = documentLike.createElement("h3");
    group.className = "api-docs-group";
    title.textContent = tag;
    group.append(title);

    for (const operation of items) {
      const row = documentLike.createElement("div");
      const method = documentLike.createElement("span");
      const path = documentLike.createElement("span");
      const details = documentLike.createElement("span");
      row.className = "api-docs-operation";
      method.className = "api-docs-method";
      method.dataset.method = operation.method;
      method.textContent = operation.method;
      path.className = "api-docs-path";
      path.textContent = operation.path;
      details.className = "api-docs-operation-summary";
      details.textContent = operation.summary || "未提供 summary";
      row.append(method, path, details);
      if (operation.deprecated) {
        const deprecated = documentLike.createElement("span");
        deprecated.className = "api-docs-deprecated";
        deprecated.textContent = "deprecated";
        details.append(documentLike.createElement("br"), deprecated);
      }
      group.append(row);
    }

    mount.append(group);
  }
}

function setStatus(documentLike: Document, message: string, state: "ok" | "error" = "ok"): void {
  const node = getNode(documentLike, "api-docs-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

export async function bootstrapApiDocsPage(options: ApiDocsBootstrapOptions = {}): Promise<void> {
  const documentLike = options.documentLike || (typeof document === "undefined" ? null : document);
  const fetchLike = options.fetchLike || (typeof fetch === "undefined" ? null : fetch.bind(globalThis));
  const contractUrl = options.contractUrl || DEFAULT_CONTRACT_URL;

  if (!documentLike || !fetchLike) return;

  try {
    const response = await fetchLike(contractUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`OpenAPI contract request failed: ${response.status}`);
    }
    const source = await response.text();
    const summary = extractOpenApiSummary(source);

    setText(documentLike, "api-docs-title", summary.title);
    setText(
      documentLike,
      "api-docs-summary",
      summary.summary || "2048 Next 接口契约，覆盖账号、排行榜、记录、ranked 对局、救援、管理后台和成就系统。"
    );
    setText(documentLike, "api-docs-version", `version ${summary.version}`);
    renderStats(documentLike, summary);
    renderServers(documentLike, summary.servers);
    renderOperations(documentLike, summary.operations);
    setStatus(documentLike, "已从 OpenAPI 契约加载", "ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(documentLike, `加载失败：${message}`, "error");
  }
}
