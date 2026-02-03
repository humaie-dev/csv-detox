/**
 * Unit tests for unpivot operation
 */

import { describe, it } from "node:test";
import * as assert from "node:assert";
import { unpivot } from "../unpivot";
import type { ParseResult } from "@/lib/parsers/types";
import type { UnpivotConfig } from "@/lib/pipeline/types";

describe("unpivot", () => {
  it("should unpivot basic wide data to long format", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Jan: 100, Feb: 200, Mar: 150 },
        { Name: "Bob", Jan: 80, Feb: 90, Mar: 120 },
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice", "Bob"] },
        { name: "Jan", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 80] },
        { name: "Feb", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [200, 90] },
        { name: "Mar", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [150, 120] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan", "Feb", "Mar"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    const { table: result } = unpivot(table, config);

    assert.strictEqual(result.rowCount, 6); // 2 rows * 3 months
    assert.strictEqual(result.rows.length, 6);
    assert.strictEqual(result.columns.length, 3); // Name, Month, Sales

    // Check first group (Alice)
    assert.strictEqual(result.rows[0].Name, "Alice");
    assert.strictEqual(result.rows[0].Month, "Jan");
    assert.strictEqual(result.rows[0].Sales, 100);

    assert.strictEqual(result.rows[1].Name, "Alice");
    assert.strictEqual(result.rows[1].Month, "Feb");
    assert.strictEqual(result.rows[1].Sales, 200);

    assert.strictEqual(result.rows[2].Name, "Alice");
    assert.strictEqual(result.rows[2].Month, "Mar");
    assert.strictEqual(result.rows[2].Sales, 150);

    // Check second group (Bob)
    assert.strictEqual(result.rows[3].Name, "Bob");
    assert.strictEqual(result.rows[3].Month, "Jan");
    assert.strictEqual(result.rows[3].Sales, 80);
  });

  it("should handle single value column", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Q1: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Q1", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Q1"],
      variableColumnName: "Quarter",
      valueColumnName: "Revenue",
    };

    const { table: result } = unpivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Name, "Alice");
    assert.strictEqual(result.rows[0].Quarter, "Q1");
    assert.strictEqual(result.rows[0].Revenue, 100);
  });

  it("should handle multiple id columns", () => {
    const table: ParseResult = {
      rows: [
        { Region: "North", Product: "Widget", Jan: 100, Feb: 200 },
      ],
      columns: [
        { name: "Region", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["North"] },
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Widget"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
        { name: "Feb", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [200] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Region", "Product"],
      valueColumns: ["Jan", "Feb"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    const { table: result } = unpivot(table, config);

    assert.strictEqual(result.rowCount, 2);
    assert.strictEqual(result.rows[0].Region, "North");
    assert.strictEqual(result.rows[0].Product, "Widget");
    assert.strictEqual(result.rows[0].Month, "Jan");
    assert.strictEqual(result.rows[0].Sales, 100);
  });

  it("should preserve null values in value columns", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100, Feb: null, Mar: 150 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
        { name: "Feb", type: "number", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Mar", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [150] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan", "Feb", "Mar"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    const { table: result } = unpivot(table, config);

    assert.strictEqual(result.rowCount, 3);
    assert.strictEqual(result.rows[1].Sales, null); // Feb is null
  });

  it("should preserve column types from id columns", () => {
    const table: ParseResult = {
      rows: [{ ID: 1, Jan: 100, Feb: 200 }],
      columns: [
        { name: "ID", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [1] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
        { name: "Feb", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [200] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["ID"],
      valueColumns: ["Jan", "Feb"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    const { table: result } = unpivot(table, config);

    const idColumn = result.columns.find((c) => c.name === "ID");
    assert.strictEqual(idColumn?.type, "number");
  });

  it("should infer value column type from majority type of value columns", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100, Feb: 200, Mar: 150 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
        { name: "Feb", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [200] },
        { name: "Mar", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [150] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan", "Feb", "Mar"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    const { table: result } = unpivot(table, config);

    const valueColumn = result.columns.find((c) => c.name === "Sales");
    assert.strictEqual(valueColumn?.type, "number");
  });

  it("should handle empty data", () => {
    const table: ParseResult = {
      rows: [],
      columns: [
        { name: "Name", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
        { name: "Jan", type: "number", nonNullCount: 0, nullCount: 0, sampleValues: [] },
        { name: "Feb", type: "number", nonNullCount: 0, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 0,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan", "Feb"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    const { table: result } = unpivot(table, config);

    assert.strictEqual(result.rowCount, 0);
    assert.strictEqual(result.rows.length, 0);
  });

  it("should throw error if id column does not exist", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["InvalidColumn"],
      valueColumns: ["Jan"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    assert.throws(
      () => unpivot(table, config),
      /ID column "InvalidColumn" does not exist/
    );
  });

  it("should throw error if value column does not exist", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["InvalidColumn"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    assert.throws(
      () => unpivot(table, config),
      /Value column "InvalidColumn" does not exist/
    );
  });

  it("should throw error if no value columns specified", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: [],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    assert.throws(
      () => unpivot(table, config),
      /At least one value column must be specified/
    );
  });

  it("should throw error if id and value columns overlap", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name", "Jan"],
      valueColumns: ["Jan"],
      variableColumnName: "Month",
      valueColumnName: "Sales",
    };

    assert.throws(
      () => unpivot(table, config),
      /ID columns and value columns must not overlap/
    );
  });

  it("should throw error if variable column name conflicts with id column", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan"],
      variableColumnName: "Name",
      valueColumnName: "Sales",
    };

    assert.throws(
      () => unpivot(table, config),
      /Variable column name "Name" conflicts with an ID column/
    );
  });

  it("should throw error if variable and value column names are the same", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan"],
      variableColumnName: "Value",
      valueColumnName: "Value",
    };

    assert.throws(
      () => unpivot(table, config),
      /Variable column and value column must have different names/
    );
  });

  it("should throw error if variable column name is empty", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Jan: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UnpivotConfig = {
      type: "unpivot",
      idColumns: ["Name"],
      valueColumns: ["Jan"],
      variableColumnName: "  ",
      valueColumnName: "Sales",
    };

    assert.throws(
      () => unpivot(table, config),
      /Variable column name cannot be empty/
    );
  });
});
