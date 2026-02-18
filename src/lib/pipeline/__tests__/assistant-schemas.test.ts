import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transformationStepsSchema } from "../assistantSchemas";

describe("assistantSchemas", () => {
  it("rejects unknown transformation step types", () => {
    const result = transformationStepsSchema.safeParse([
      {
        id: "s1",
        type: "fill_nulls",
        config: { type: "fill_nulls", columns: ["a"] },
      },
    ]);

    assert.equal(result.success, false);
  });

  it("rejects mismatched step.type vs config.type", () => {
    const result = transformationStepsSchema.safeParse([
      {
        id: "s1",
        type: "trim",
        config: { type: "uppercase", columns: ["name"] },
      },
    ]);

    assert.equal(result.success, false);
  });

  it("accepts a valid step", () => {
    const result = transformationStepsSchema.safeParse([
      {
        id: "s1",
        type: "trim",
        config: { type: "trim", columns: ["name"] },
      },
    ]);

    assert.equal(result.success, true);
  });
});
