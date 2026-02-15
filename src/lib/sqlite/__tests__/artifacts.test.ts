import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParseOptions } from "../../parsers/types";
import { getParseOptionsJson } from "../artifacts";

describe("SQLite Artifacts", () => {
  describe("getParseOptionsJson", () => {
    it("should be stable across key order", () => {
      const a: ParseOptions = {
        delimiter: ",",
        sheetIndex: 1,
        hasHeaders: true,
      };
      const b: ParseOptions = {
        hasHeaders: true,
        sheetIndex: 1,
        delimiter: ",",
      };

      assert.strictEqual(getParseOptionsJson(a), getParseOptionsJson(b));
    });

    it("should ignore undefined fields", () => {
      const a: ParseOptions = {
        delimiter: ",",
        sheetName: undefined,
      };
      const b: ParseOptions = {
        delimiter: ",",
      };

      assert.strictEqual(getParseOptionsJson(a), getParseOptionsJson(b));
    });
  });
});
