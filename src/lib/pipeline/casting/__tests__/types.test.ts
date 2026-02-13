/**
 * Tests for type casting functions
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { castToBoolean, castToDate, castToNumber, castToString, tryCast } from "../types";

describe("castToString", () => {
  it("should convert null to empty string", () => {
    assert.equal(castToString(null), "");
  });

  it("should convert undefined to empty string", () => {
    assert.equal(castToString(undefined), "");
  });

  it("should keep string unchanged", () => {
    assert.equal(castToString("hello"), "hello");
  });

  it("should convert number to string", () => {
    assert.equal(castToString(42), "42");
    assert.equal(castToString(3.14), "3.14");
  });

  it("should convert boolean to string", () => {
    assert.equal(castToString(true), "true");
    assert.equal(castToString(false), "false");
  });

  it("should convert Date to ISO string", () => {
    const date = new Date("2023-01-15T10:30:00Z");
    assert.equal(castToString(date), "2023-01-15T10:30:00.000Z");
  });
});

describe("castToNumber", () => {
  it("should convert null to null", () => {
    assert.equal(castToNumber(null), null);
  });

  it("should convert undefined to null", () => {
    assert.equal(castToNumber(undefined), null);
  });

  it("should convert empty string to null", () => {
    assert.equal(castToNumber(""), null);
  });

  it("should keep number unchanged", () => {
    assert.equal(castToNumber(42), 42);
    assert.equal(castToNumber(3.14), 3.14);
  });

  it("should convert string number to number", () => {
    assert.equal(castToNumber("42"), 42);
    assert.equal(castToNumber("3.14"), 3.14);
  });

  it("should handle negative numbers", () => {
    assert.equal(castToNumber("-42"), -42);
  });

  it("should handle numbers with commas", () => {
    assert.equal(castToNumber("1,234.56"), 1234.56);
  });

  it("should handle scientific notation", () => {
    assert.equal(castToNumber("1.5e3"), 1500);
  });

  it("should return null for non-numeric strings", () => {
    assert.equal(castToNumber("hello"), null);
  });

  it("should return null for NaN", () => {
    assert.equal(castToNumber(NaN), null);
  });

  it("should return null for Infinity", () => {
    assert.equal(castToNumber(Infinity), null);
  });
});

describe("castToBoolean", () => {
  it("should convert null to null", () => {
    assert.equal(castToBoolean(null), null);
  });

  it("should convert undefined to null", () => {
    assert.equal(castToBoolean(undefined), null);
  });

  it("should convert empty string to null", () => {
    assert.equal(castToBoolean(""), null);
  });

  it("should keep boolean unchanged", () => {
    assert.equal(castToBoolean(true), true);
    assert.equal(castToBoolean(false), false);
  });

  it("should convert 'true' to true", () => {
    assert.equal(castToBoolean("true"), true);
    assert.equal(castToBoolean("TRUE"), true);
    assert.equal(castToBoolean("True"), true);
  });

  it("should convert 'false' to false", () => {
    assert.equal(castToBoolean("false"), false);
    assert.equal(castToBoolean("FALSE"), false);
    assert.equal(castToBoolean("False"), false);
  });

  it("should convert 'yes' to true", () => {
    assert.equal(castToBoolean("yes"), true);
    assert.equal(castToBoolean("YES"), true);
  });

  it("should convert 'no' to false", () => {
    assert.equal(castToBoolean("no"), false);
    assert.equal(castToBoolean("NO"), false);
  });

  it("should convert 'y' to true", () => {
    assert.equal(castToBoolean("y"), true);
    assert.equal(castToBoolean("Y"), true);
  });

  it("should convert 'n' to false", () => {
    assert.equal(castToBoolean("n"), false);
    assert.equal(castToBoolean("N"), false);
  });

  it("should convert number 1 to true", () => {
    assert.equal(castToBoolean(1), true);
  });

  it("should convert number 0 to false", () => {
    assert.equal(castToBoolean(0), false);
  });

  it("should convert string '1' to true", () => {
    assert.equal(castToBoolean("1"), true);
  });

  it("should convert string '0' to false", () => {
    assert.equal(castToBoolean("0"), false);
  });

  it("should return null for other numbers", () => {
    assert.equal(castToBoolean(2), null);
    assert.equal(castToBoolean(-1), null);
  });

  it("should return null for invalid strings", () => {
    assert.equal(castToBoolean("maybe"), null);
  });
});

describe("castToDate", () => {
  it("should convert null to null", () => {
    assert.equal(castToDate(null), null);
  });

  it("should convert undefined to null", () => {
    assert.equal(castToDate(undefined), null);
  });

  it("should convert empty string to null", () => {
    assert.equal(castToDate(""), null);
  });

  it("should keep Date unchanged", () => {
    const date = new Date("2023-01-15");
    const result = castToDate(date);
    assert.ok(result instanceof Date);
    assert.equal(result.toISOString(), date.toISOString());
  });

  it("should parse ISO date format", () => {
    const result = castToDate("2023-01-15");
    assert.ok(result instanceof Date);
    assert.equal(result.getFullYear(), 2023);
    assert.equal(result.getMonth(), 0); // January
    assert.equal(result.getDate(), 15);
  });

  it("should parse ISO datetime format", () => {
    const result = castToDate("2023-01-15T10:30:00Z");
    assert.ok(result instanceof Date);
    assert.equal(result.toISOString(), "2023-01-15T10:30:00.000Z");
  });

  it("should parse US date format", () => {
    const result = castToDate("01/15/2023");
    assert.ok(result instanceof Date);
  });

  it("should return null for invalid date strings", () => {
    assert.equal(castToDate("not a date"), null);
  });

  it("should return null for invalid Date object", () => {
    const invalidDate = new Date("invalid");
    assert.equal(castToDate(invalidDate), null);
  });
});

describe("tryCast", () => {
  it("should successfully cast to string", () => {
    const result = tryCast(42, "string");
    assert.equal(result.success, true);
    assert.equal(result.value, "42");
    assert.equal(result.error, undefined);
  });

  it("should successfully cast to number", () => {
    const result = tryCast("42", "number");
    assert.equal(result.success, true);
    assert.equal(result.value, 42);
  });

  it("should fail to cast invalid number", () => {
    const result = tryCast("hello", "number");
    assert.equal(result.success, false);
    assert.equal(result.value, null);
    assert.match(result.error!, /Cannot convert.*to number/);
  });

  it("should successfully cast to boolean", () => {
    const result = tryCast("true", "boolean");
    assert.equal(result.success, true);
    assert.equal(result.value, true);
  });

  it("should fail to cast invalid boolean", () => {
    const result = tryCast("maybe", "boolean");
    assert.equal(result.success, false);
    assert.equal(result.value, null);
    assert.match(result.error!, /Cannot convert.*to boolean/);
  });

  it("should successfully cast to date", () => {
    const result = tryCast("2023-01-15", "date");
    assert.equal(result.success, true);
    assert.ok(result.value instanceof Date);
  });

  it("should fail to cast invalid date", () => {
    const result = tryCast("not a date", "date");
    assert.equal(result.success, false);
    assert.equal(result.value, null);
    assert.match(result.error!, /Cannot convert.*to date/);
  });

  it("should handle casting errors gracefully", () => {
    const result = tryCast("test", "number");
    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});
