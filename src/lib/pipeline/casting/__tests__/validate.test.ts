import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateCast } from "../validate.js";

describe("validateCast", () => {
  describe("Basic validation", () => {
    it("should validate all-valid number values", () => {
      const values = [1, 2, 3, "4", "5.5", null];
      const result = validateCast(values, "number");

      assert.equal(result.total, 6);
      assert.equal(result.valid, 6); // null is treated as valid
      assert.equal(result.invalid, 0);
      assert.equal(result.invalidSamples.length, 0);
      assert.equal(result.failureRate, 0);
      assert.equal(result.recommendedMode, "fail");
    });

    it("should validate mixed valid/invalid number values", () => {
      const values = [1, 2, "three", "4", "invalid", null];
      const result = validateCast(values, "number");

      assert.equal(result.total, 6);
      assert.equal(result.valid, 4); // 1, 2, "4", null
      assert.equal(result.invalid, 2); // "three", "invalid"
      assert.equal(result.invalidSamples.length, 2);
      assert.equal(result.failureRate, (2 / 6) * 100);
    });

    it("should validate all-invalid number values", () => {
      const values = ["abc", "def", "ghi"];
      const result = validateCast(values, "number");

      assert.equal(result.total, 3);
      assert.equal(result.valid, 0);
      assert.equal(result.invalid, 3);
      assert.equal(result.failureRate, 100);
    });
  });

  describe("Recommended error handling mode", () => {
    it("should recommend 'fail' when all values are valid", () => {
      const values = [1, 2, 3, 4, 5];
      const result = validateCast(values, "number");

      assert.equal(result.recommendedMode, "fail");
      assert.equal(result.failureRate, 0);
    });

    it("should recommend 'skip' for low failure rate (<=5%)", () => {
      // 1 failure out of 20 = 5%
      const values = Array(19).fill(1).concat(["invalid"]);
      const result = validateCast(values, "number");

      assert.equal(result.invalid, 1);
      assert.equal(result.failureRate, 5);
      assert.equal(result.recommendedMode, "skip");
    });

    it("should recommend 'null' for medium failure rate (<=20%)", () => {
      // 2 failures out of 10 = 20%
      const values = Array(8).fill(1).concat(["invalid1", "invalid2"]);
      const result = validateCast(values, "number");

      assert.equal(result.invalid, 2);
      assert.equal(result.failureRate, 20);
      assert.equal(result.recommendedMode, "null");
    });

    it("should recommend 'fail' for high failure rate (>20%)", () => {
      // 3 failures out of 10 = 30%
      const values = Array(7).fill(1).concat(["invalid1", "invalid2", "invalid3"]);
      const result = validateCast(values, "number");

      assert.equal(result.invalid, 3);
      assert.equal(result.failureRate, 30);
      assert.equal(result.recommendedMode, "fail");
    });
  });

  describe("Invalid samples collection", () => {
    it("should collect up to maxSamples invalid values", () => {
      const values = ["a", "b", "c", "d", "e", "f", "g"];
      const result = validateCast(values, "number", undefined, 3); // maxSamples=3

      assert.equal(result.invalid, 7);
      assert.equal(result.invalidSamples.length, 3);
      assert.deepEqual(
        result.invalidSamples.map((s) => s.value),
        ["a", "b", "c"]
      );
    });

    it("should include error messages in invalid samples", () => {
      const values = ["invalid"];
      const result = validateCast(values, "number");

      assert.equal(result.invalidSamples.length, 1);
      assert.equal(result.invalidSamples[0].value, "invalid");
      assert.ok(result.invalidSamples[0].error);
      assert.ok(result.invalidSamples[0].error.length > 0);
    });

    it("should collect all invalid samples when fewer than maxSamples", () => {
      const values = ["a", "b", 1, 2];
      const result = validateCast(values, "number", undefined, 5); // maxSamples=5

      assert.equal(result.invalid, 2);
      assert.equal(result.invalidSamples.length, 2);
    });
  });

  describe("Performance - maxRows sampling", () => {
    it("should sample first maxRows values", () => {
      // Create 2000 values, first 900 valid, next 200 invalid (rows 900-1099)
      const values = Array(900).fill(1).concat(Array(200).fill("invalid")).concat(Array(900).fill(2));
      
      // With maxRows=1000, should only see first 1000 rows
      const result = validateCast(values, "number", undefined, 5, 1000);

      assert.equal(result.total, 1000); // Sampled first 1000
      assert.equal(result.valid, 900); // First 900 are valid
      assert.equal(result.invalid, 100); // Only 100 invalid (rows 900-999)
      assert.equal(result.failureRate, 10);
    });

    it("should handle arrays smaller than maxRows", () => {
      const values = [1, 2, 3];
      const result = validateCast(values, "number", undefined, 5, 1000);

      assert.equal(result.total, 3);
      assert.equal(result.valid, 3);
    });
  });

  describe("Type-specific validation", () => {
    it("should validate boolean values", () => {
      const values = ["true", "false", "yes", "no", "1", "0", "maybe", null];
      const result = validateCast(values, "boolean");

      assert.equal(result.valid, 7); // All except "maybe"
      assert.equal(result.invalid, 1);
      assert.equal(result.invalidSamples[0].value, "maybe");
    });

    it("should validate date values", () => {
      const values = ["2023-01-15", "01/15/2023", "Jan 15, 2023", "invalid-date", null];
      const result = validateCast(values, "date");

      assert.equal(result.valid, 4); // First 3 + null
      assert.equal(result.invalid, 1);
      assert.equal(result.invalidSamples[0].value, "invalid-date");
    });

    it("should validate string values (always succeed)", () => {
      const values = [1, true, null, "text", { obj: true }];
      const result = validateCast(values, "string");

      assert.equal(result.valid, 5);
      assert.equal(result.invalid, 0);
      assert.equal(result.failureRate, 0);
      assert.equal(result.recommendedMode, "fail");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const result = validateCast([], "number");

      assert.equal(result.total, 0);
      assert.equal(result.valid, 0);
      assert.equal(result.invalid, 0);
      assert.equal(result.failureRate, 0);
      assert.equal(result.recommendedMode, "fail");
    });

    it("should handle array with only nulls", () => {
      const values = [null, null, null];
      const result = validateCast(values, "number");

      assert.equal(result.total, 3);
      assert.equal(result.valid, 3); // Nulls are valid
      assert.equal(result.invalid, 0);
    });

    it("should handle mixed types", () => {
      const values = [1, "2", true, null, undefined, { obj: true }, [1, 2]];
      const result = validateCast(values, "number");

      // 1, "2", null, undefined should be valid (4)
      // true, {obj: true}, [1,2] should be invalid (3)
      assert.equal(result.total, 7);
      assert.ok(result.invalid >= 2); // At least objects/arrays fail
    });
  });

  describe("Date format validation", () => {
    it("should validate dates with custom format", () => {
      // Note: format parameter is passed but current implementation auto-detects
      const values = ["2023-01-15", "2023-12-31"];
      const result = validateCast(values, "date", "YYYY-MM-DD");

      assert.equal(result.valid, 2);
      assert.equal(result.invalid, 0);
    });
  });
});
