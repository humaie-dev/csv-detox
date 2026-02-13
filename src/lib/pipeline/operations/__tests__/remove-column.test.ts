import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import type { RemoveColumnConfig } from "../../types";
import { removeColumn } from "../remove-column";

describe("removeColumn", () => {
  it("should remove a single column", () => {
    const table: ParseResult = {
      rows: [
        { name: "Alice", age: 30, city: "NYC" },
        { name: "Bob", age: 25, city: "LA" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "city", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: RemoveColumnConfig = {
      type: "remove_column",
      columns: ["age"],
    };

    const { table: result } = removeColumn(table, config);

    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "name");
    assert.equal(result.columns[1].name, "city");
    assert.equal(result.rows[0].name, "Alice");
    assert.equal(result.rows[0].city, "NYC");
    assert.equal(result.rows[0].age, undefined);
  });

  it("should remove multiple columns", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice", age: 30, city: "NYC", country: "USA" }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "city", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "country", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: RemoveColumnConfig = {
      type: "remove_column",
      columns: ["age", "country"],
    };

    const { table: result } = removeColumn(table, config);

    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "name");
    assert.equal(result.columns[1].name, "city");
    assert.equal(result.rows[0].name, "Alice");
    assert.equal(result.rows[0].city, "NYC");
    assert.equal(result.rows[0].age, undefined);
    assert.equal(result.rows[0].country, undefined);
  });

  it("should throw error if column does not exist", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice" }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: RemoveColumnConfig = {
      type: "remove_column",
      columns: ["nonexistent"],
    };

    assert.throws(() => removeColumn(table, config), /Columns not found: nonexistent/);
  });

  it("should throw error if any column in list does not exist", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice", age: 30 }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: RemoveColumnConfig = {
      type: "remove_column",
      columns: ["age", "nonexistent", "another_missing"],
    };

    assert.throws(
      () => removeColumn(table, config),
      /Columns not found: nonexistent, another_missing/,
    );
  });

  it("should handle empty table with columns", () => {
    const table: ParseResult = {
      rows: [],
      columns: [
        { name: "name", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 0, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 0,
      warnings: [],
    };

    const config: RemoveColumnConfig = {
      type: "remove_column",
      columns: ["age"],
    };

    const { table: result } = removeColumn(table, config);

    assert.equal(result.columns.length, 1);
    assert.equal(result.columns[0].name, "name");
    assert.equal(result.rows.length, 0);
  });
});
