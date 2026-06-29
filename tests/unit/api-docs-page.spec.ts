import { describe, expect, it } from "vitest";

import { extractOpenApiSummary } from "../../src/pages/api-docs-page";

describe("pages: api-docs-page", () => {
  it("extracts visible API metadata and operations from the OpenAPI contract", () => {
    const summary = extractOpenApiSummary(`
openapi: 3.1.0
info:
  title: 2048 Next API
  version: 1.0.0
servers:
  - url: /api
    description: Same-origin API proxy.
paths:
  /achievements:
    get:
      tags: [Achievements]
      summary: List public achievement definitions.
      security: []
  /admin/achievements/{achievementId}:
    patch:
      tags: [Admin, Achievements]
      summary: Update an achievement definition.
      deprecated: true
components:
  schemas:
    ApiEnvelope:
      type: object
`);

    expect(summary.title).toBe("2048 Next API");
    expect(summary.version).toBe("1.0.0");
    expect(summary.servers).toEqual([
      {
        url: "/api",
        description: "Same-origin API proxy."
      }
    ]);
    expect(summary.operations).toEqual([
      {
        method: "GET",
        path: "/achievements",
        summary: "List public achievement definitions.",
        tags: ["Achievements"],
        deprecated: false
      },
      {
        method: "PATCH",
        path: "/admin/achievements/{achievementId}",
        summary: "Update an achievement definition.",
        tags: ["Admin", "Achievements"],
        deprecated: true
      }
    ]);
  });
});
