import { describe, expect, it } from "vitest";
import { MAX_BODY_CHARS, normalizeInput } from "@/lib/inputs/normalize";
import { summarizeOpenApi } from "@/lib/inputs/parsers/openapi";

describe("normalizeInput", () => {
  it("folds additional context into the free-text body", () => {
    const n = normalizeInput({
      sourceType: "freeText",
      useCaseName: "User Login",
      additionalContext: "Lock after 5 failures",
    });
    expect(n.title).toBe("User Login");
    expect(n.body).toContain("Lock after 5 failures");
  });

  it("assigns stable AC-n ids to acceptance criteria", () => {
    const n = normalizeInput({
      sourceType: "userStory",
      story: "As a user I want to reset my password",
      acceptanceCriteria: ["Link expires in 30 minutes", "", "  Password is 8-64 chars  "],
    });
    expect(n.acceptanceCriteria).toEqual([
      { id: "AC-1", text: "Link expires in 30 minutes" },
      { id: "AC-2", text: "Password is 8-64 chars" },
    ]);
  });

  it("truncates oversized documents and says so", () => {
    const n = normalizeInput({ sourceType: "document", text: "x".repeat(MAX_BODY_CHARS + 500) });
    expect(n.truncated).toBe(true);
    expect(n.body).toHaveLength(MAX_BODY_CHARS);
    expect(n.warnings.join(" ")).toMatch(/truncated/i);
  });
});

describe("summarizeOpenApi", () => {
  const yamlSpec = `
openapi: 3.0.0
info:
  title: Orders API
  description: Manage customer orders
paths:
  /orders/{id}:
    get:
      summary: Fetch an order
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            maximum: 9999
      responses:
        '200':
          description: OK
        '404':
          description: Not found
  /orders:
    post:
      summary: Create an order
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [amount, currency]
              properties:
                amount:
                  type: number
                  minimum: 0.01
                  maximum: 100000
                currency:
                  type: string
                  enum: [USD, EUR, VND]
      responses:
        '201':
          description: Created
`;

  it("extracts the title and every operation", () => {
    const { title, summary } = summarizeOpenApi(yamlSpec);
    expect(title).toBe("Orders API");
    expect(summary).toContain("GET /orders/{id}");
    expect(summary).toContain("POST /orders");
  });

  it("keeps the numeric and enum constraints that feed BVA", () => {
    const { summary } = summarizeOpenApi(yamlSpec);
    expect(summary).toContain("min 1");
    expect(summary).toContain("max 9999");
    expect(summary).toContain("min 0.01");
    expect(summary).toContain("one of [USD, EUR, VND]");
  });

  it("lists response status codes", () => {
    expect(summarizeOpenApi(yamlSpec).summary).toContain("404");
  });

  it("parses a JSON spec too (JSON is valid YAML)", () => {
    const json = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Tiny API" },
      paths: { "/ping": { get: { summary: "Ping", responses: { "200": { description: "pong" } } } } },
    });
    expect(summarizeOpenApi(json).title).toBe("Tiny API");
  });

  it("rejects a document without paths", () => {
    expect(() => summarizeOpenApi("hello: world")).toThrow(/OpenAPI/i);
  });
});
