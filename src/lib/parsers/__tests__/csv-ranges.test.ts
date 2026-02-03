import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../csv";
import { ParseError } from "../types";

describe("CSV parser - row range extraction", () => {
  const sampleCSV = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago
David,28,Boston
Eve,32,Seattle`;

  it("should parse all rows by default", () => {
    const result = parseCSV(sampleCSV);
    assert.equal(result.rowCount, 5);
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[4].Name, "Eve");
  });

  it("should parse rows starting from startRow", () => {
    const result = parseCSV(sampleCSV, { startRow: 3 });
    // Row 3 (Bob,25,LA) becomes headers, rows 4-6 become data
    assert.equal(result.rowCount, 3);
    assert.equal(result.columns[0].name, "Bob"); // Bob's row becomes headers
    assert.equal(result.rows[0].Bob, "Charlie"); // Charlie is first data row
    assert.equal(result.rows[2].Bob, "Eve");
  });

  it("should parse rows up to endRow", () => {
    const result = parseCSV(sampleCSV, { startRow: 1, endRow: 3 });
    assert.equal(result.rowCount, 2); // Header + 2 data rows
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[1].Name, "Bob");
  });

  it("should parse rows in a specific range", () => {
    const result = parseCSV(sampleCSV, { startRow: 3, endRow: 5 });
    // Row 3 (Bob,25,LA) becomes headers, rows 4-5 become data
    assert.equal(result.rowCount, 2);
    assert.equal(result.columns[0].name, "Bob"); // Bob's row becomes headers
    assert.equal(result.rows[0].Bob, "Charlie");
    assert.equal(result.rows[1].Bob, "David");
  });

  it("should handle startRow = endRow (single row)", () => {
    const result = parseCSV(sampleCSV, { startRow: 2, endRow: 2 });
    assert.equal(result.rowCount, 0); // Only header, no data
  });

  it("should throw error if startRow < 1", () => {
    assert.throws(
      () => parseCSV(sampleCSV, { startRow: 0 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      }
    );
  });

  it("should throw error if endRow < startRow", () => {
    assert.throws(
      () => parseCSV(sampleCSV, { startRow: 5, endRow: 3 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      }
    );
  });

  it("should handle endRow beyond file length", () => {
    const result = parseCSV(sampleCSV, { startRow: 1, endRow: 100 });
    assert.equal(result.rowCount, 5); // All available rows
  });

  it("should throw error if range is empty (startRow beyond file)", () => {
    assert.throws(
      () => parseCSV(sampleCSV, { startRow: 100 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "EMPTY_RANGE");
        return true;
      }
    );
  });

  it("should skip first N rows correctly", () => {
    const csvWithTitle = `Company Report
Generated 2024-01-01
Name,Age,City
Alice,30,NYC
Bob,25,LA`;
    const result = parseCSV(csvWithTitle, { startRow: 3 });
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.rowCount, 2);
  });
});

describe("CSV parser - column range extraction", () => {
  const sampleCSV = `Name,Age,City,Country,Zip
Alice,30,NYC,USA,10001
Bob,25,LA,USA,90001
Charlie,35,Chicago,USA,60601`;

  it("should parse all columns by default", () => {
    const result = parseCSV(sampleCSV);
    assert.equal(result.columns.length, 5);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Name", "Age", "City", "Country", "Zip"]
    );
  });

  it("should parse columns starting from startColumn", () => {
    const result = parseCSV(sampleCSV, { startColumn: 3 });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["City", "Country", "Zip"]
    );
    assert.equal(result.rows[0].City, "NYC");
  });

  it("should parse columns up to endColumn", () => {
    const result = parseCSV(sampleCSV, { startColumn: 1, endColumn: 3 });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Name", "Age", "City"]
    );
  });

  it("should parse columns in a specific range", () => {
    const result = parseCSV(sampleCSV, { startColumn: 2, endColumn: 4 });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Age", "City", "Country"]
    );
    assert.equal(result.rows[0].Age, "30");
    assert.equal(result.rows[0].City, "NYC");
  });

  it("should handle startColumn = endColumn (single column)", () => {
    const result = parseCSV(sampleCSV, { startColumn: 2, endColumn: 2 });
    assert.equal(result.columns.length, 1);
    assert.equal(result.columns[0].name, "Age");
  });

  it("should throw error if startColumn < 1", () => {
    assert.throws(
      () => parseCSV(sampleCSV, { startColumn: 0 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      }
    );
  });

  it("should throw error if endColumn < startColumn", () => {
    assert.throws(
      () => parseCSV(sampleCSV, { startColumn: 4, endColumn: 2 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      }
    );
  });

  it("should handle endColumn beyond column count", () => {
    const result = parseCSV(sampleCSV, { startColumn: 1, endColumn: 100 });
    assert.equal(result.columns.length, 5); // All available columns
  });
});

describe("CSV parser - row and column range combined", () => {
  const sampleCSV = `Name,Age,City,Country,Zip
Alice,30,NYC,USA,10001
Bob,25,LA,USA,90001
Charlie,35,Chicago,USA,60601
David,28,Boston,USA,02101
Eve,32,Seattle,USA,98101`;

  it("should extract a specific rectangular range", () => {
    const result = parseCSV(sampleCSV, {
      startRow: 2,
      endRow: 4,
      startColumn: 2,
      endColumn: 4,
    });
    // startRow:2 means start from line 2 (Alice), endRow:4 means up to line 4 (Charlie)
    // hasHeaders:true (default) means first line (Alice) is treated as headers
    // So we get Bob and Charlie as data rows
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["30", "NYC", "USA"] // Alice's values become headers
    );
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0]["30"], "25"); // Bob's Age column (named "30")
    assert.equal(result.rows[1]["30"], "35"); // Charlie's Age column
  });

  it("should extract bottom-right corner", () => {
    const result = parseCSV(sampleCSV, {
      startRow: 5,
      startColumn: 4,
    });
    // startRow:5 means start from David's row
    // hasHeaders:true means David's row becomes headers
    // So Eve is the only data row
    assert.equal(result.columns.length, 2);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["USA", "02101"] // David's values become headers
    );
    assert.equal(result.rowCount, 1); // Only Eve
    assert.equal(result.rows[0]["USA"], "USA"); // Eve's Country
    assert.equal(result.rows[0]["02101"], "98101"); // Eve's Zip
  });
});

describe("CSV parser - hasHeaders option", () => {
  const sampleCSVWithHeaders = `Name,Age,City
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;

  const sampleCSVWithoutHeaders = `Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;

  it("should use first row as headers when hasHeaders=true (default)", () => {
    const result = parseCSV(sampleCSVWithHeaders);
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Name", "Age", "City"]
    );
    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[0].Name, "Alice");
  });

  it("should use first row as headers when hasHeaders=true explicitly", () => {
    const result = parseCSV(sampleCSVWithHeaders, { hasHeaders: true });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Name", "Age", "City"]
    );
    assert.equal(result.rowCount, 3);
  });

  it("should generate column names when hasHeaders=false", () => {
    const result = parseCSV(sampleCSVWithoutHeaders, { hasHeaders: false });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Column1", "Column2", "Column3"]
    );
    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[0].Column1, "Alice");
    assert.equal(result.rows[0].Column2, "30");
  });

  it("should treat first row as data when hasHeaders=false", () => {
    const result = parseCSV(sampleCSVWithHeaders, { hasHeaders: false });
    assert.equal(result.rowCount, 4); // All rows including header row
    assert.equal(result.rows[0].Column1, "Name"); // First row is treated as data
    assert.equal(result.rows[1].Column1, "Alice");
  });

  it("should work with hasHeaders=false and startRow", () => {
    const csvWithTitle = `Company Report
Alice,30,NYC
Bob,25,LA`;
    const result = parseCSV(csvWithTitle, {
      startRow: 2,
      hasHeaders: false,
    });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Column1", "Column2", "Column3"]
    );
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Column1, "Alice");
  });

  it("should work with hasHeaders=false and column range", () => {
    const result = parseCSV(sampleCSVWithoutHeaders, {
      hasHeaders: false,
      startColumn: 2,
      endColumn: 3,
    });
    assert.equal(result.columns.length, 2);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Column1", "Column2"]
    );
    assert.equal(result.rows[0].Column1, "30");
    assert.equal(result.rows[0].Column2, "NYC");
  });

  it("should work with hasHeaders=true and startRow (skip title rows)", () => {
    const csvWithTitle = `Company Report
Generated 2024-01-01
Name,Age,City
Alice,30,NYC
Bob,25,LA`;
    const result = parseCSV(csvWithTitle, {
      startRow: 3,
      hasHeaders: true,
    });
    assert.equal(result.columns.length, 3);
    assert.deepEqual(
      result.columns.map((c) => c.name),
      ["Name", "Age", "City"]
    );
    assert.equal(result.rowCount, 2);
  });
});

describe("CSV parser - edge cases with ranges", () => {
  it("should handle empty CSV with range options", () => {
    const emptyCSV = "";
    assert.throws(
      () => parseCSV(emptyCSV, { startRow: 1 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "EMPTY_FILE");
        return true;
      }
    );
  });

  it("should handle single cell CSV", () => {
    const singleCell = "Value";
    const result = parseCSV(singleCell, { hasHeaders: false });
    assert.equal(result.columns.length, 1);
    assert.equal(result.columns[0].name, "Column1");
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].Column1, "Value");
  });

  it("should handle CSV with only headers and no data", () => {
    const headersOnly = "Name,Age,City";
    const result = parseCSV(headersOnly);
    assert.equal(result.columns.length, 3);
    assert.equal(result.rowCount, 0);
  });

  it("should handle maxRows with row range", () => {
    const csv = `Name,Age
Alice,30
Bob,25
Charlie,35
David,28
Eve,32`;
    const result = parseCSV(csv, {
      startRow: 1, // Start from header row
      maxRows: 2,
    });
    assert.equal(result.rowCount, 2); // Alice, Bob (maxRows limits data rows)
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[1].Name, "Bob");
  });

  it("should preserve null values in range extraction", () => {
    const csv = `Name,Age,City
Alice,,NYC
,25,
Charlie,35,`;
    const result = parseCSV(csv, { startColumn: 1, endColumn: 3 });
    assert.equal(result.rows[0].Age, null);
    assert.equal(result.rows[1].Name, null);
    assert.equal(result.rows[2].City, null);
  });

  it("should handle quoted values in range extraction", () => {
    const csv = `Name,Description,City
Alice,"Software Engineer, Senior",NYC
Bob,"Data Analyst, Junior",LA`;
    const result = parseCSV(csv, { startColumn: 1, endColumn: 2 });
    assert.equal(result.columns.length, 2);
    assert.equal(result.rows[0].Description, "Software Engineer, Senior");
  });
});
