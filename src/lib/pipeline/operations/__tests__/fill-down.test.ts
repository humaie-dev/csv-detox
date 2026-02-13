/**
 * Tests for fill down operation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import type { FillDownConfig } from "../../types";
import { fillDown } from "../fill-down";

describe("fillDown operation", () => {
  it("should fill single column with string values", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: "", Amount: 200 },
        { Product: "", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows.length, 3);
    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "Apple"); // Filled from above
    assert.equal(result.rows[2].Product, "Apple"); // Filled from above
    assert.equal(result.rows[0].Amount, 100); // Unchanged
    assert.equal(result.rows[1].Amount, 200); // Unchanged
  });

  it("should fill multiple columns independently", () => {
    const table: ParseResult = {
      rows: [
        { Category: "Food", Product: "Apple", Price: 1.5 },
        { Category: "", Product: "Orange", Price: 2.0 },
        { Category: "", Product: "", Price: 1.8 },
        { Category: "Drink", Product: "", Price: 3.0 },
      ],
      columns: [
        { name: "Category", type: "string", nonNullCount: 2, nullCount: 2, sampleValues: [] },
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 2, sampleValues: [] },
        { name: "Price", type: "number", nonNullCount: 4, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Category", "Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Category, "Food");
    assert.equal(result.rows[1].Category, "Food"); // Filled
    assert.equal(result.rows[2].Category, "Food"); // Filled
    assert.equal(result.rows[3].Category, "Drink"); // New value

    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "Orange"); // New value
    assert.equal(result.rows[2].Product, "Orange"); // Filled from row 1
    assert.equal(result.rows[3].Product, "Orange"); // Filled from row 2
  });

  it("should preserve data types (numbers)", () => {
    const table: ParseResult = {
      rows: [
        { id: 100, name: "A" },
        { id: null, name: "B" },
        { id: "", name: "C" },
      ],
      columns: [
        { name: "id", type: "number", nonNullCount: 1, nullCount: 2, sampleValues: [] },
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["id"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].id, 100);
    assert.equal(result.rows[1].id, 100); // Filled with number
    assert.equal(result.rows[2].id, 100); // Filled with number
    assert.strictEqual(typeof result.rows[1].id, "number");
  });

  it("should preserve data types (booleans)", () => {
    const table: ParseResult = {
      rows: [
        { active: true, name: "A" },
        { active: "", name: "B" },
        { active: false, name: "C" },
        { active: null, name: "D" },
      ],
      columns: [
        { name: "active", type: "boolean", nonNullCount: 2, nullCount: 2, sampleValues: [] },
        { name: "name", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["active"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].active, true);
    assert.equal(result.rows[1].active, true); // Filled with true
    assert.equal(result.rows[2].active, false); // New value
    assert.equal(result.rows[3].active, false); // Filled with false
  });

  it("should leave first row empty if it starts empty", () => {
    const table: ParseResult = {
      rows: [
        { Product: "", Amount: 100 },
        { Product: "Apple", Amount: 200 },
        { Product: "", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, null); // No source above, stays null
    assert.equal(result.rows[1].Product, "Apple");
    assert.equal(result.rows[2].Product, "Apple"); // Filled from row 1
  });

  it("should handle all rows empty (no change)", () => {
    const table: ParseResult = {
      rows: [
        { Product: "", Amount: 100 },
        { Product: null, Amount: 200 },
        { Product: "", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 0, nullCount: 3, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, null);
    assert.equal(result.rows[1].Product, null);
    assert.equal(result.rows[2].Product, null);
  });

  it("should stop filling at next non-empty value", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: "", Amount: 200 },
        { Product: "Orange", Amount: 150 },
        { Product: "", Amount: 175 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 2, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 4, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "Apple"); // Filled with Apple
    assert.equal(result.rows[2].Product, "Orange"); // New value
    assert.equal(result.rows[3].Product, "Orange"); // Filled with Orange
  });

  it("should handle multiple fill sequences in same column", () => {
    const table: ParseResult = {
      rows: [
        { Region: "North", Sales: 100 },
        { Region: "", Sales: 150 },
        { Region: "", Sales: 120 },
        { Region: "South", Sales: 200 },
        { Region: "", Sales: 180 },
        { Region: "East", Sales: 140 },
      ],
      columns: [
        { name: "Region", type: "string", nonNullCount: 3, nullCount: 3, sampleValues: [] },
        { name: "Sales", type: "number", nonNullCount: 6, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 6,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Region"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Region, "North");
    assert.equal(result.rows[1].Region, "North");
    assert.equal(result.rows[2].Region, "North");
    assert.equal(result.rows[3].Region, "South");
    assert.equal(result.rows[4].Region, "South");
    assert.equal(result.rows[5].Region, "East");
  });

  it("should not treat whitespace as empty by default", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: "   ", Amount: 200 },
        { Product: "", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
      treatWhitespaceAsEmpty: false,
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "   "); // Whitespace preserved as value
    assert.equal(result.rows[2].Product, "   "); // Filled with whitespace
  });

  it("should treat whitespace as empty when option enabled", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: "   ", Amount: 200 },
        { Product: "", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
      treatWhitespaceAsEmpty: true,
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "Apple"); // Whitespace treated as empty, filled
    assert.equal(result.rows[2].Product, "Apple"); // Empty, filled
  });

  it("should handle real-world hierarchical product data", () => {
    const table: ParseResult = {
      rows: [
        { Product: "04704 750ML WHITE", Measure: "New Category $ Sales", LOYAL: "$232,645.50" },
        { Product: "", Measure: "Lost Category $ Sales", LOYAL: "$362,570.30" },
        { Product: "", Measure: "Increased Category", LOYAL: "$3,937,347.88" },
        { Product: "05102 1L RED", Measure: "New Category $ Sales", LOYAL: "$145,200.00" },
        { Product: "", Measure: "Lost Category $ Sales", LOYAL: "$98,450.20" },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 3, sampleValues: [] },
        { name: "Measure", type: "string", nonNullCount: 5, nullCount: 0, sampleValues: [] },
        { name: "LOYAL", type: "string", nonNullCount: 5, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 5,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    // First product group
    assert.equal(result.rows[0].Product, "04704 750ML WHITE");
    assert.equal(result.rows[1].Product, "04704 750ML WHITE");
    assert.equal(result.rows[2].Product, "04704 750ML WHITE");

    // Second product group
    assert.equal(result.rows[3].Product, "05102 1L RED");
    assert.equal(result.rows[4].Product, "05102 1L RED");

    // Measure and LOYAL columns unchanged
    assert.equal(result.rows[1].Measure, "Lost Category $ Sales");
    assert.equal(result.rows[2].LOYAL, "$3,937,347.88");
  });

  it("should throw error when column does not exist", () => {
    const table: ParseResult = {
      rows: [{ Product: "Apple" }],
      columns: [
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["NonExistent"],
    };

    assert.throws(() => fillDown(table, config), {
      message: /Column "NonExistent" does not exist/,
    });
  });

  it("should throw error when columns array is empty", () => {
    const table: ParseResult = {
      rows: [{ Product: "Apple" }],
      columns: [
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: [],
    };

    assert.throws(() => fillDown(table, config), {
      message: /At least one column must be specified/,
    });
  });

  it("should handle single row table (no change)", () => {
    const table: ParseResult = {
      rows: [{ Product: "Apple", Amount: 100 }],
      columns: [
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].Product, "Apple");
  });

  it("should handle empty table", () => {
    const table: ParseResult = {
      rows: [],
      columns: [
        { name: "Product", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 0,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows.length, 0);
  });

  it("should handle mixed types in same column", () => {
    const table: ParseResult = {
      rows: [
        { value: 100, name: "A" },
        { value: "", name: "B" },
        { value: "text", name: "C" },
        { value: null, name: "D" },
      ],
      columns: [
        { name: "value", type: "string", nonNullCount: 2, nullCount: 2, sampleValues: [] },
        { name: "name", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["value"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].value, 100);
    assert.equal(result.rows[1].value, 100); // Filled with number
    assert.equal(result.rows[2].value, "text"); // New string value
    assert.equal(result.rows[3].value, "text"); // Filled with string
  });

  it("should not modify column metadata", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: "", Amount: 200 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 1, nullCount: 1, sampleValues: ["Apple"] },
        { name: "Amount", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [100, 200] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { columns: resultColumns } = fillDown(table, config);

    assert.deepEqual(resultColumns, table.columns);
  });

  it("should handle null values", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: null, Amount: 200 },
        { Product: "Orange", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "Apple"); // null filled with Apple
    assert.equal(result.rows[2].Product, "Orange");
  });

  it("should handle empty strings", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Apple", Amount: 100 },
        { Product: "", Amount: 200 },
        { Product: "Orange", Amount: 150 },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
        { name: "Amount", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillDownConfig = {
      type: "fill_down",
      columns: ["Product"],
    };

    const { table: result } = fillDown(table, config);

    assert.equal(result.rows[0].Product, "Apple");
    assert.equal(result.rows[1].Product, "Apple"); // "" filled with Apple
    assert.equal(result.rows[2].Product, "Orange");
  });
});
