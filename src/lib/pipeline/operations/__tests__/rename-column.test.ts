import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renameColumn } from "../rename-column";
import type { ParseResult } from "@/lib/parsers/types";
import type { RenameColumnConfig } from "../../types";

describe("renameColumn", () => {
  it("should rename a column", () => {
    const table: ParseResult = {
      rows: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: RenameColumnConfig = {
      type: "rename_column",
      oldName: "name",
      newName: "full_name",
    };

    const { table: result } = renameColumn(table, config);

    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "full_name");
    assert.equal(result.columns[1].name, "age");
    assert.equal(result.rows[0].full_name, "Alice");
    assert.equal(result.rows[1].full_name, "Bob");
    assert.equal(result.rows[0].name, undefined);
  });

  it("should throw error if old column does not exist", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice" }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: RenameColumnConfig = {
      type: "rename_column",
      oldName: "nonexistent",
      newName: "new_name",
    };

    assert.throws(
      () => renameColumn(table, config),
      /Column not found: nonexistent/
    );
  });

  it("should throw error if new column name already exists", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice", age: 30 }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: RenameColumnConfig = {
      type: "rename_column",
      oldName: "name",
      newName: "age",
    };

    assert.throws(
      () => renameColumn(table, config),
      /Column already exists: age/
    );
  });

  it("should handle renaming column to same name (no-op)", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice" }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: RenameColumnConfig = {
      type: "rename_column",
      oldName: "name",
      newName: "name",
    };

    const { table: result } = renameColumn(table, config);

    assert.equal(result.columns[0].name, "name");
    assert.equal(result.rows[0].name, "Alice");
  });
});
