/**
 * Tests for fill across operation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import type { FillAcrossConfig } from "../../types";
import { fillAcross } from "../fill-across";

describe("fillAcross operation", () => {
  it("should fill single row with string values left to right", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: "", Q3: "", Q4: "150" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q4", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3", "Q4"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100"); // Filled from Q1
    assert.equal(result.rows[0].Q3, "100"); // Filled from Q1
    assert.equal(result.rows[0].Q4, "150"); // New value
  });

  it("should process each row independently", () => {
    const table: ParseResult = {
      rows: [
        { Q1: "100", Q2: "", Q3: "120" },
        { Q1: "200", Q2: "", Q3: "" },
        { Q1: "", Q2: "300", Q3: "" },
      ],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3"],
    };

    const { table: result } = fillAcross(table, config);

    // Row 1: Q1=100, Q2 filled with 100, Q3=120
    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100");
    assert.equal(result.rows[0].Q3, "120");

    // Row 2: Q1=200, Q2 filled with 200, Q3 filled with 200
    assert.equal(result.rows[1].Q1, "200");
    assert.equal(result.rows[1].Q2, "200");
    assert.equal(result.rows[1].Q3, "200");

    // Row 3: Q1=null (no left value), Q2=300, Q3 filled with 300
    assert.equal(result.rows[2].Q1, null);
    assert.equal(result.rows[2].Q2, "300");
    assert.equal(result.rows[2].Q3, "300");
  });

  it("should preserve data types (numbers)", () => {
    const table: ParseResult = {
      rows: [{ Jan: 1000, Feb: null, Mar: "", Apr: 1500 }],
      columns: [
        { name: "Jan", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Feb", type: "number", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Mar", type: "number", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Apr", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Jan", "Feb", "Mar", "Apr"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Jan, 1000);
    assert.equal(result.rows[0].Feb, 1000); // Filled with number
    assert.equal(result.rows[0].Mar, 1000); // Filled with number
    assert.equal(result.rows[0].Apr, 1500);
    assert.strictEqual(typeof result.rows[0].Feb, "number");
  });

  it("should preserve data types (booleans)", () => {
    const table: ParseResult = {
      rows: [{ Col1: true, Col2: "", Col3: false, Col4: null }],
      columns: [
        { name: "Col1", type: "boolean", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Col2", type: "boolean", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Col3", type: "boolean", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Col4", type: "boolean", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Col1", "Col2", "Col3", "Col4"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Col1, true);
    assert.equal(result.rows[0].Col2, true); // Filled with true
    assert.equal(result.rows[0].Col3, false); // New value
    assert.equal(result.rows[0].Col4, false); // Filled with false
  });

  it("should leave first column empty if it starts empty", () => {
    const table: ParseResult = {
      rows: [{ Q1: "", Q2: "100", Q3: "", Q4: "150" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q4", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3", "Q4"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, null); // No source from left
    assert.equal(result.rows[0].Q2, "100");
    assert.equal(result.rows[0].Q3, "100"); // Filled from Q2
    assert.equal(result.rows[0].Q4, "150");
  });

  it("should handle all columns empty (no change)", () => {
    const table: ParseResult = {
      rows: [{ Q1: "", Q2: null, Q3: "", Q4: null }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q4", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3", "Q4"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, null);
    assert.equal(result.rows[0].Q2, null);
    assert.equal(result.rows[0].Q3, null);
    assert.equal(result.rows[0].Q4, null);
  });

  it("should respect column order from config", () => {
    const table: ParseResult = {
      rows: [{ A: "First", B: "", C: "Third", D: "" }],
      columns: [
        { name: "A", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "B", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "C", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "D", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    // Process in order: A → C → D (skip B)
    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["A", "C", "D"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].A, "First");
    assert.equal(result.rows[0].B, ""); // Not in config, unchanged
    assert.equal(result.rows[0].C, "Third"); // Has value
    assert.equal(result.rows[0].D, "Third"); // Filled from C
  });

  it("should stop filling at next non-empty value", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: "", Q3: "300", Q4: "" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q4", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3", "Q4"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100"); // Filled with 100
    assert.equal(result.rows[0].Q3, "300"); // New value
    assert.equal(result.rows[0].Q4, "300"); // Filled with 300
  });

  it("should handle multiple fill sequences in same row", () => {
    const table: ParseResult = {
      rows: [{ Jan: "10", Feb: "", Mar: "", Apr: "40", May: "", Jun: "60" }],
      columns: [
        { name: "Jan", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Feb", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Mar", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Apr", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "May", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Jun", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Jan, "10");
    assert.equal(result.rows[0].Feb, "10");
    assert.equal(result.rows[0].Mar, "10");
    assert.equal(result.rows[0].Apr, "40");
    assert.equal(result.rows[0].May, "40");
    assert.equal(result.rows[0].Jun, "60");
  });

  it("should not treat whitespace as empty by default", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: "   ", Q3: "" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3"],
      treatWhitespaceAsEmpty: false,
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "   "); // Whitespace preserved as value
    assert.equal(result.rows[0].Q3, "   "); // Filled with whitespace
  });

  it("should treat whitespace as empty when option enabled", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: "   ", Q3: "" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3"],
      treatWhitespaceAsEmpty: true,
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100"); // Whitespace treated as empty, filled
    assert.equal(result.rows[0].Q3, "100"); // Empty, filled
  });

  it("should handle real-world quarterly data pattern", () => {
    const table: ParseResult = {
      rows: [
        { Product: "Widget A", Q1: "100", Q2: "", Q3: "", Q4: "150" },
        { Product: "Widget B", Q1: "200", Q2: "220", Q3: "", Q4: "" },
        { Product: "Widget C", Q1: "", Q2: "", Q3: "300", Q4: "" },
      ],
      columns: [
        { name: "Product", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "Q1", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
        { name: "Q4", type: "string", nonNullCount: 1, nullCount: 2, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3", "Q4"],
    };

    const { table: result } = fillAcross(table, config);

    // Row 1: Q1=100, Q2=100, Q3=100, Q4=150
    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100");
    assert.equal(result.rows[0].Q3, "100");
    assert.equal(result.rows[0].Q4, "150");

    // Row 2: Q1=200, Q2=220, Q3=220, Q4=220
    assert.equal(result.rows[1].Q1, "200");
    assert.equal(result.rows[1].Q2, "220");
    assert.equal(result.rows[1].Q3, "220");
    assert.equal(result.rows[1].Q4, "220");

    // Row 3: Q1=null, Q2=null, Q3=300, Q4=300
    assert.equal(result.rows[2].Q1, null);
    assert.equal(result.rows[2].Q2, null);
    assert.equal(result.rows[2].Q3, "300");
    assert.equal(result.rows[2].Q4, "300");

    // Product column unchanged
    assert.equal(result.rows[0].Product, "Widget A");
  });

  it("should throw error when column does not exist", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100" }],
      columns: [{ name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["NonExistent"],
    };

    assert.throws(() => fillAcross(table, config), {
      message: /Column "NonExistent" does not exist/,
    });
  });

  it("should throw error when columns array is empty", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100" }],
      columns: [{ name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: [],
    };

    assert.throws(() => fillAcross(table, config), {
      message: /At least one column must be specified/,
    });
  });

  it("should handle empty table", () => {
    const table: ParseResult = {
      rows: [],
      columns: [{ name: "Q1", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] }],
      rowCount: 0,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows.length, 0);
  });

  it("should handle mixed types in same row", () => {
    const table: ParseResult = {
      rows: [{ Col1: 100, Col2: "", Col3: "text", Col4: null }],
      columns: [
        { name: "Col1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Col2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Col3", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Col4", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Col1", "Col2", "Col3", "Col4"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Col1, 100);
    assert.equal(result.rows[0].Col2, 100); // Filled with number
    assert.equal(result.rows[0].Col3, "text"); // New string value
    assert.equal(result.rows[0].Col4, "text"); // Filled with string
  });

  it("should not modify column metadata", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: "", Q3: "300" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["100"] },
        { name: "Q2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["300"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3"],
    };

    const { columns: resultColumns } = fillAcross(table, config);

    assert.deepEqual(resultColumns, table.columns);
  });

  it("should handle null values", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: null, Q3: "300" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100"); // null filled with 100
    assert.equal(result.rows[0].Q3, "300");
  });

  it("should handle empty strings", () => {
    const table: ParseResult = {
      rows: [{ Q1: "100", Q2: "", Q3: "300" }],
      columns: [
        { name: "Q1", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "Q2", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "Q3", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FillAcrossConfig = {
      type: "fill_across",
      columns: ["Q1", "Q2", "Q3"],
    };

    const { table: result } = fillAcross(table, config);

    assert.equal(result.rows[0].Q1, "100");
    assert.equal(result.rows[0].Q2, "100"); // "" filled with 100
    assert.equal(result.rows[0].Q3, "300");
  });
});
