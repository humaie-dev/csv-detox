/**
 * Unit tests for pivot operation
 */

import * as assert from "node:assert";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import type { PivotConfig } from "@/lib/pipeline/types";
import { pivot } from "../pivot";

describe("pivot", () => {
  it("should pivot basic long data to wide format", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Feb", Sales: 200 },
        { Name: "Bob", Month: "Jan", Sales: 80 },
        { Name: "Bob", Month: "Feb", Sales: 90 },
      ],
      columns: [
        {
          name: "Name",
          type: "string",
          nonNullCount: 4,
          nullCount: 0,
          sampleValues: ["Alice", "Bob"],
        },
        {
          name: "Month",
          type: "string",
          nonNullCount: 4,
          nullCount: 0,
          sampleValues: ["Jan", "Feb"],
        },
        {
          name: "Sales",
          type: "number",
          nonNullCount: 4,
          nullCount: 0,
          sampleValues: [100, 200, 80, 90],
        },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 2); // 2 unique names
    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.columns.length, 3); // Name, Feb, Jan (sorted)

    // Check Alice's row
    const aliceRow = result.rows.find((r) => r.Name === "Alice");
    assert.ok(aliceRow);
    assert.strictEqual(aliceRow.Jan, 100);
    assert.strictEqual(aliceRow.Feb, 200);

    // Check Bob's row
    const bobRow = result.rows.find((r) => r.Name === "Bob");
    assert.ok(bobRow);
    assert.strictEqual(bobRow.Jan, 80);
    assert.strictEqual(bobRow.Feb, 90);
  });

  it("should handle single index column", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Widget", Quarter: "Q1", Revenue: 1000 },
        { Product: "Widget", Quarter: "Q2", Revenue: 1500 },
      ],
      columns: [
        {
          name: "Product",
          type: "string",
          nonNullCount: 2,
          nullCount: 0,
          sampleValues: ["Widget"],
        },
        {
          name: "Quarter",
          type: "string",
          nonNullCount: 2,
          nullCount: 0,
          sampleValues: ["Q1", "Q2"],
        },
        {
          name: "Revenue",
          type: "number",
          nonNullCount: 2,
          nullCount: 0,
          sampleValues: [1000, 1500],
        },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Product"],
      columnSource: "Quarter",
      valueSource: "Revenue",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Product, "Widget");
    assert.strictEqual(result.rows[0].Q1, 1000);
    assert.strictEqual(result.rows[0].Q2, 1500);
  });

  it("should handle multiple index columns", () => {
    const table: ParseResult = {
      rows: [
        { Region: "North", Product: "Widget", Month: "Jan", Sales: 100 },
        { Region: "North", Product: "Widget", Month: "Feb", Sales: 200 },
        { Region: "South", Product: "Gadget", Month: "Jan", Sales: 150 },
      ],
      columns: [
        {
          name: "Region",
          type: "string",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: ["North", "South"],
        },
        {
          name: "Product",
          type: "string",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: ["Widget", "Gadget"],
        },
        {
          name: "Month",
          type: "string",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: ["Jan", "Feb"],
        },
        {
          name: "Sales",
          type: "number",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: [100, 200, 150],
        },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Region", "Product"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 2); // 2 unique combinations

    const northRow = result.rows.find((r) => r.Region === "North");
    assert.ok(northRow);
    assert.strictEqual(northRow.Product, "Widget");
    assert.strictEqual(northRow.Jan, 100);
    assert.strictEqual(northRow.Feb, 200);

    const southRow = result.rows.find((r) => r.Region === "South");
    assert.ok(southRow);
    assert.strictEqual(southRow.Product, "Gadget");
    assert.strictEqual(southRow.Jan, 150);
    assert.strictEqual(southRow.Feb, null); // Missing combination
  });

  it("should fill missing combinations with null", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Mar", Sales: 300 }, // Feb missing
        { Name: "Bob", Month: "Feb", Sales: 200 },
      ],
      columns: [
        {
          name: "Name",
          type: "string",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: ["Alice", "Bob"],
        },
        {
          name: "Month",
          type: "string",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: ["Jan", "Feb", "Mar"],
        },
        {
          name: "Sales",
          type: "number",
          nonNullCount: 3,
          nullCount: 0,
          sampleValues: [100, 300, 200],
        },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    const aliceRow = result.rows.find((r) => r.Name === "Alice");
    assert.ok(aliceRow);
    assert.strictEqual(aliceRow.Jan, 100);
    assert.strictEqual(aliceRow.Feb, null); // Missing
    assert.strictEqual(aliceRow.Mar, 300);

    const bobRow = result.rows.find((r) => r.Name === "Bob");
    assert.ok(bobRow);
    assert.strictEqual(bobRow.Jan, null); // Missing
    assert.strictEqual(bobRow.Feb, 200);
    assert.strictEqual(bobRow.Mar, null); // Missing
  });

  it("should use last value for duplicate combinations by default", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Jan", Sales: 150 }, // Duplicate
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 150] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Jan, 150); // Last value
  });

  it("should use first value with aggregation=first", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Jan", Sales: 150 }, // Duplicate
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 150] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
      aggregation: "first",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Jan, 100); // First value
  });

  it("should sum values with aggregation=sum", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Jan", Sales: 150 }, // Duplicate
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 150] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
      aggregation: "sum",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Jan, 250); // Sum
  });

  it("should average values with aggregation=mean", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Jan", Sales: 150 }, // Duplicate
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 150] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
      aggregation: "mean",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Jan, 125); // Average
  });

  it("should count values with aggregation=count", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: "Jan", Sales: 100 },
        { Name: "Alice", Month: "Jan", Sales: 150 }, // Duplicate
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 150] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
      aggregation: "count",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].Jan, 2); // Count
  });

  it("should handle null values in column source", () => {
    const table: ParseResult = {
      rows: [
        { Name: "Alice", Month: null, Sales: 100 },
        { Name: "Alice", Month: "Jan", Sales: 200 },
      ],
      columns: [
        { name: "Name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 1, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 200] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.rows[0].null, 100); // null becomes column "null"
    assert.strictEqual(result.rows[0].Jan, 200);
  });

  it("should handle empty data", () => {
    const table: ParseResult = {
      rows: [],
      columns: [
        { name: "Name", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
        { name: "Month", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
        { name: "Sales", type: "number", nonNullCount: 0, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 0,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    assert.strictEqual(result.rowCount, 0);
    assert.strictEqual(result.rows.length, 0);
  });

  it("should preserve index column types", () => {
    const table: ParseResult = {
      rows: [{ ID: 1, Month: "Jan", Sales: 100 }],
      columns: [
        { name: "ID", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [1] },
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["ID"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    const idColumn = result.columns.find((c) => c.name === "ID");
    assert.strictEqual(idColumn?.type, "number");
  });

  it("should infer new column type from value source", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Month: "Jan", Sales: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    const { table: result } = pivot(table, config);

    const janColumn = result.columns.find((c) => c.name === "Jan");
    assert.strictEqual(janColumn?.type, "number");
  });

  it("should throw error if no index columns specified", () => {
    const table: ParseResult = {
      rows: [{ Month: "Jan", Sales: 100 }],
      columns: [
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: [],
      columnSource: "Month",
      valueSource: "Sales",
    };

    assert.throws(() => pivot(table, config), /At least one index column must be specified/);
  });

  it("should throw error if index column does not exist", () => {
    const table: ParseResult = {
      rows: [{ Month: "Jan", Sales: 100 }],
      columns: [
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["InvalidColumn"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    assert.throws(() => pivot(table, config), /Index column "InvalidColumn" does not exist/);
  });

  it("should throw error if column source does not exist", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Sales: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "InvalidColumn",
      valueSource: "Sales",
    };

    assert.throws(() => pivot(table, config), /Column source "InvalidColumn" does not exist/);
  });

  it("should throw error if value source does not exist", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Month: "Jan" }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Jan"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Month",
      valueSource: "InvalidColumn",
    };

    assert.throws(() => pivot(table, config), /Value source "InvalidColumn" does not exist/);
  });

  it("should throw error if column source is in index columns", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Month: "Jan", Sales: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Month", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Jan"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name", "Month"],
      columnSource: "Month",
      valueSource: "Sales",
    };

    assert.throws(() => pivot(table, config), /Column source cannot be an index column/);
  });

  it("should throw error if column source and value source are the same", () => {
    const table: ParseResult = {
      rows: [{ Name: "Alice", Sales: 100 }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Alice"] },
        { name: "Sales", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [100] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: PivotConfig = {
      type: "pivot",
      indexColumns: ["Name"],
      columnSource: "Sales",
      valueSource: "Sales",
    };

    assert.throws(() => pivot(table, config), /Column source and value source must be different/);
  });
});
