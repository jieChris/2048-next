import type { JsonApiClient, JsonRecord } from "./api-client";
import type { paths } from "./generated-api/2048next-v1";

type PathKey = keyof paths & string;
type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type OperationFor<Path extends PathKey, Method extends HttpMethod> =
  Method extends keyof paths[Path] ? NonNullable<paths[Path][Method]> : never;
type OperationQuery<Operation> =
  Operation extends { parameters: { query?: infer Query } } ? Query : never;
type OperationPath<Operation> =
  Operation extends { parameters: { path?: infer Path } } ? Path : never;
type OperationBody<Operation> =
  Operation extends { requestBody?: { content: { "application/json": infer Body } } } ? Body : never;
type TypedApiRequestOptions<Operation> = {
  path?: OperationPath<Operation>;
  query?: OperationQuery<Operation>;
  body?: OperationBody<Operation>;
};

export interface TypedApiClient {
  request<Path extends PathKey, Method extends HttpMethod>(
    method: Method,
    path: Path,
    options?: TypedApiRequestOptions<OperationFor<Path, Method>>
  ): Promise<JsonRecord>;
}

function appendQuery(path: string, query: unknown): string {
  if (!query || typeof query !== "object") return path;
  const params = new URLSearchParams();
  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? path + "?" + queryString : path;
}

function interpolatePath(path: string, params: unknown): string {
  if (!params || typeof params !== "object") return path;
  return path.replace(/\{([^}]+)\}/gu, (match, key) => {
    const value = (params as Record<string, unknown>)[key];
    if (value === undefined || value === null) return match;
    return encodeURIComponent(String(value));
  });
}

export function createTypedApiClient(client: JsonApiClient): TypedApiClient {
  return {
    request(method, path, options = {}) {
      const requestPath = appendQuery(interpolatePath(path, options.path), options.query);
      const init: RequestInit = { method: method.toUpperCase() };
      if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
      }
      return client.request(requestPath, init);
    }
  };
}
