import { describe, expect, it } from "vitest";
import { bvaValuesForField, synthesizeBvaCases } from "@/lib/generation/bva";
import type { InputField } from "@/lib/schemas/test-case";
import { makeSuite } from "./helpers";

const field = (overrides: Partial<InputField> & Pick<InputField, "name" | "dataType">): InputField => ({
  required: true,
  ...overrides,
});

describe("bvaValuesForField", () => {
  it("covers min, max, min-1 and max+1 for integers", () => {
    const values = bvaValuesForField(field({ name: "age", dataType: "int", min: 10, max: 18 })).map((v) => v.value);
    expect(values).toEqual(expect.arrayContaining(["10", "18", "9", "19"]));
  });

  it("uses a 0.01 step for decimals", () => {
    const values = bvaValuesForField(field({ name: "rate", dataType: "decimal", min: 0, max: 1 })).map((v) => v.value);
    expect(values).toEqual(expect.arrayContaining(["0", "1", "-0.01", "1.01"]));
  });

  it("uses length boundaries for strings instead of integer arithmetic", () => {
    // The legacy C# engine forced string fields through int min/max — the bug
    // this test pins down.
    const values = bvaValuesForField(field({ name: "username", dataType: "string", min: 5, maxLength: 50 }));
    const byLength = values.map((v) => v.value.length);
    expect(byLength).toEqual(expect.arrayContaining([0, 5, 4, 50, 51]));
    expect(values.every((v) => !/^\d+$/.test(v.value) || v.value === "")).toBe(true);
  });

  it("returns both values for booleans", () => {
    expect(bvaValuesForField(field({ name: "active", dataType: "bool" })).map((v) => v.value)).toEqual([
      "true",
      "false",
    ]);
  });

  it("covers every allowed enum value plus one invalid", () => {
    const values = bvaValuesForField(
      field({ name: "status", dataType: "enum", allowedValues: ["NEW", "PAID"] })
    );
    expect(values.map((v) => v.value)).toEqual(["NEW", "PAID", "__INVALID_STATUS__"]);
    expect(values.filter((v) => v.kind === "negative")).toHaveLength(1);
  });

  it("steps one day around date boundaries", () => {
    const values = bvaValuesForField(
      field({ name: "startDate", dataType: "date", min: "2026-01-10", max: "2026-01-20" })
    ).map((v) => v.value);
    expect(values).toEqual(["2026-01-10", "2026-01-20", "2026-01-09", "2026-01-21"]);
  });

  it("returns nothing for an unbounded numeric field", () => {
    expect(bvaValuesForField(field({ name: "amount", dataType: "int" }))).toHaveLength(0);
  });
});

describe("synthesizeBvaCases", () => {
  const suite = makeSuite({
    fields: [field({ name: "age", dataType: "int", min: 10, max: 18 })],
    testCases: [],
  });

  it("numbers cases continuing from the given index", () => {
    const cases = synthesizeBvaCases(suite, 3);
    expect(cases[0].id).toBe("TC-003");
    expect(cases[1].id).toBe("TC-004");
  });

  it("produces as many cases as interesting values — not one per field", () => {
    // The legacy engine capped case count at max(2, fieldCount).
    const cases = synthesizeBvaCases(suite, 1);
    expect(cases.length).toBeGreaterThan(2);
  });

  it("never fabricates execution results", () => {
    const cases = synthesizeBvaCases(suite, 1);
    for (const tc of cases) {
      expect(tc).not.toHaveProperty("status");
      expect(tc.expectedResult).not.toMatch(/passed|failed|DF-\d+/i);
    }
  });

  it("keeps titles within the R2 limit even for long length-boundary values", () => {
    const longStringSuite = makeSuite({
      fields: [field({ name: "email", dataType: "string", maxLength: 254 })],
      testCases: [],
    });
    const cases = synthesizeBvaCases(longStringSuite, 1);
    expect(cases.length).toBeGreaterThan(0);
    for (const tc of cases) {
      expect(tc.title.length).toBeLessThanOrEqual(120);
    }
    // The full value still has to reach the tester via the data table.
    expect(cases.some((tc) => tc.testData[0].value.length === 255)).toBe(true);
  });

  it("skips values already covered by existing cases", () => {
    const withExisting = makeSuite({
      fields: suite.fields,
      testCases: [
        {
          ...makeSuite().testCases[0],
          testData: [{ field: "age", value: "10" }],
        },
      ],
    });
    const cases = synthesizeBvaCases(withExisting, 2);
    expect(cases.some((c) => c.testData[0].value === "10")).toBe(false);
  });
});
