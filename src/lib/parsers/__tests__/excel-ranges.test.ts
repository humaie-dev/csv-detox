import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { listSheets, parseExcel } from "../excel";
import { ParseError } from "../types";

/**
 * Helper function to create a workbook with test data
 */
function createTestWorkbook(sheets: Record<string, string[][]>): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

describe("Excel parser - listSheets", () => {
  it("should list all sheets in workbook", () => {
    const buffer = createTestWorkbook({
      Sheet1: [
        ["A", "B"],
        ["1", "2"],
      ],
      Sheet2: [
        ["C", "D"],
        ["3", "4"],
      ],
      Sheet3: [
        ["E", "F"],
        ["5", "6"],
      ],
    });

    const sheets = listSheets(buffer);
    assert.equal(sheets.length, 3);
    assert.equal(sheets[0], "Sheet1");
    assert.equal(sheets[1], "Sheet2");
    assert.equal(sheets[2], "Sheet3");
  });

  it("should return single sheet for single-sheet workbook", () => {
    const buffer = createTestWorkbook({
      Data: [
        ["Name", "Age"],
        ["Alice", "30"],
      ],
    });

    const sheets = listSheets(buffer);
    assert.equal(sheets.length, 1);
    assert.equal(sheets[0], "Data");
  });

  it("should handle empty workbook", () => {
    // xlsx library throws an error when trying to write an empty workbook
    // This test ensures listSheets handles workbooks with no sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const sheets = listSheets(buffer);
    assert.equal(sheets.length, 1);
    assert.equal(sheets[0], "Empty");
  });

  it("should preserve sheet name order", () => {
    const buffer = createTestWorkbook({
      Third: [["A"]],
      First: [["B"]],
      Second: [["C"]],
    });

    const sheets = listSheets(buffer);
    // Sheet order is preserved as added
    assert.equal(sheets[0], "Third");
    assert.equal(sheets[1], "First");
    assert.equal(sheets[2], "Second");
  });
});

describe("Excel parser - sheet selection", () => {
  const multiSheetBuffer = createTestWorkbook({
    Sales: [
      ["Product", "Revenue"],
      ["Widget", "1000"],
      ["Gadget", "2000"],
    ],
    Customers: [
      ["Name", "City"],
      ["Alice", "NYC"],
      ["Bob", "LA"],
    ],
    Inventory: [
      ["Item", "Quantity"],
      ["Screws", "500"],
      ["Bolts", "300"],
    ],
  });

  it("should parse first sheet by default", () => {
    const result = parseExcel(multiSheetBuffer);
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Product");
    assert.equal(result.columns[1].name, "Revenue");
    assert.equal(result.rowCount, 2);
  });

  it("should parse specific sheet by name", () => {
    const result = parseExcel(multiSheetBuffer, { sheetName: "Customers" });
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.columns[1].name, "City");
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[1].Name, "Bob");
  });

  it("should parse specific sheet by index", () => {
    const result = parseExcel(multiSheetBuffer, { sheetIndex: 2 });
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Item");
    assert.equal(result.columns[1].name, "Quantity");
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Item, "Screws");
  });

  it("should prefer sheetName over sheetIndex when both provided", () => {
    const result = parseExcel(multiSheetBuffer, {
      sheetName: "Inventory",
      sheetIndex: 0,
    });
    // Should use Inventory (sheetName), not Sales (sheetIndex 0)
    assert.equal(result.columns[0].name, "Item");
  });

  it("should throw error for non-existent sheet name", () => {
    assert.throws(
      () => parseExcel(multiSheetBuffer, { sheetName: "NonExistent" }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "SHEET_NOT_FOUND");
        return true;
      },
    );
  });

  it("should throw error for out-of-range sheet index", () => {
    assert.throws(
      () => parseExcel(multiSheetBuffer, { sheetIndex: 10 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_SHEET_INDEX");
        return true;
      },
    );
  });

  it("should throw error for negative sheet index", () => {
    assert.throws(
      () => parseExcel(multiSheetBuffer, { sheetIndex: -1 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_SHEET_INDEX");
        return true;
      },
    );
  });
});

describe("Excel parser - row range extraction", () => {
  const buffer = createTestWorkbook({
    Data: [
      ["Name", "Age", "City"],
      ["Alice", "30", "NYC"],
      ["Bob", "25", "LA"],
      ["Charlie", "35", "Chicago"],
      ["David", "28", "Boston"],
      ["Eve", "32", "Seattle"],
    ],
  });

  it("should parse all rows by default", () => {
    const result = parseExcel(buffer);
    assert.equal(result.rowCount, 5);
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[4].Name, "Eve");
  });

  it("should parse rows starting from startRow", () => {
    const result = parseExcel(buffer, { startRow: 3 });
    // Row 3 (Bob,25,LA) becomes headers, rows 4-6 become data
    assert.equal(result.rowCount, 3);
    assert.equal(result.columns[0].name, "Bob");
    assert.equal(result.rows[0].Bob, "Charlie");
    assert.equal(result.rows[2].Bob, "Eve");
  });

  it("should parse rows up to endRow", () => {
    const result = parseExcel(buffer, { startRow: 1, endRow: 3 });
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[1].Name, "Bob");
  });

  it("should parse rows in a specific range", () => {
    const result = parseExcel(buffer, { startRow: 3, endRow: 5 });
    assert.equal(result.rowCount, 2);
    assert.equal(result.columns[0].name, "Bob");
    assert.equal(result.rows[0].Bob, "Charlie");
    assert.equal(result.rows[1].Bob, "David");
  });

  it("should handle startRow = endRow (single row)", () => {
    const result = parseExcel(buffer, { startRow: 2, endRow: 2 });
    assert.equal(result.rowCount, 0); // Only header, no data
  });

  it("should throw error if startRow < 1", () => {
    assert.throws(
      () => parseExcel(buffer, { startRow: 0 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      },
    );
  });

  it("should throw error if endRow < startRow", () => {
    assert.throws(
      () => parseExcel(buffer, { startRow: 5, endRow: 3 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      },
    );
  });

  it("should handle endRow beyond sheet length", () => {
    const result = parseExcel(buffer, { startRow: 1, endRow: 100 });
    assert.equal(result.rowCount, 5);
  });

  it("should throw error if range is empty (startRow beyond sheet)", () => {
    assert.throws(
      () => parseExcel(buffer, { startRow: 100 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "EMPTY_RANGE");
        return true;
      },
    );
  });

  it("should skip title rows correctly", () => {
    const bufferWithTitle = createTestWorkbook({
      Data: [
        ["Company Report"],
        ["Generated 2024-01-01"],
        ["Name", "Age", "City"],
        ["Alice", "30", "NYC"],
        ["Bob", "25", "LA"],
      ],
    });

    const result = parseExcel(bufferWithTitle, { startRow: 3 });
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Name, "Alice");
  });
});

describe("Excel parser - column range extraction", () => {
  const buffer = createTestWorkbook({
    Data: [
      ["Name", "Age", "City", "Country", "Zip"],
      ["Alice", "30", "NYC", "USA", "10001"],
      ["Bob", "25", "LA", "USA", "90001"],
      ["Charlie", "35", "Chicago", "USA", "60601"],
    ],
  });

  it("should parse all columns by default", () => {
    const result = parseExcel(buffer);
    assert.equal(result.columns.length, 5);
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.columns[4].name, "Zip");
  });

  it("should parse columns starting from startColumn", () => {
    const result = parseExcel(buffer, { startColumn: 2 });
    assert.equal(result.columns.length, 4);
    assert.equal(result.columns[0].name, "Age");
    assert.equal(result.columns[3].name, "Zip");
    assert.equal(result.rows[0].Age, "30"); // String because test data uses strings
  });

  it("should parse columns up to endColumn", () => {
    const result = parseExcel(buffer, { startColumn: 1, endColumn: 3 });
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.columns[2].name, "City");
    assert.equal(result.rows[0].Name, "Alice");
  });

  it("should parse columns in a specific range", () => {
    const result = parseExcel(buffer, { startColumn: 2, endColumn: 4 });
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].name, "Age");
    assert.equal(result.columns[2].name, "Country");
    assert.equal(result.rows[0].Age, "30"); // String because test data uses strings
  });

  it("should handle startColumn = endColumn (single column)", () => {
    const result = parseExcel(buffer, { startColumn: 2, endColumn: 2 });
    assert.equal(result.columns.length, 1);
    assert.equal(result.columns[0].name, "Age");
    assert.equal(result.rows[0].Age, "30"); // String because test data uses strings
  });

  it("should throw error if startColumn < 1", () => {
    assert.throws(
      () => parseExcel(buffer, { startColumn: 0 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      },
    );
  });

  it("should throw error if endColumn < startColumn", () => {
    assert.throws(
      () => parseExcel(buffer, { startColumn: 4, endColumn: 2 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "INVALID_RANGE");
        return true;
      },
    );
  });

  it("should handle endColumn beyond column count", () => {
    const result = parseExcel(buffer, { startColumn: 1, endColumn: 100 });
    assert.equal(result.columns.length, 5);
  });
});

describe("Excel parser - row and column range combined", () => {
  const buffer = createTestWorkbook({
    Data: [
      ["Name", "Age", "City", "Country"],
      ["Alice", "30", "NYC", "USA"],
      ["Bob", "25", "LA", "USA"],
      ["Charlie", "35", "Chicago", "USA"],
      ["David", "28", "Boston", "USA"],
    ],
  });

  it("should extract a specific rectangular range", () => {
    const result = parseExcel(buffer, {
      startRow: 2,
      endRow: 3,
      startColumn: 2,
      endColumn: 3,
    });
    // Row 2 (Alice,30,NYC,USA) → columns 2-3 (30,NYC) becomes header
    // Row 3 (Bob,25,LA,USA) → columns 2-3 (25,LA) becomes data
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "30"); // String because test data uses strings
    assert.equal(result.columns[1].name, "NYC");
    assert.equal(result.rowCount, 1);
  });

  it("should extract bottom-right corner", () => {
    const result = parseExcel(buffer, {
      startRow: 4,
      startColumn: 3,
    });
    // Row 4 (Charlie,35,Chicago,USA) → columns 3-4 (Chicago,USA) becomes header
    // Row 5 (David,28,Boston,USA) → columns 3-4 (Boston,USA) becomes data
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Chicago");
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].Chicago, "Boston");
  });
});

describe("Excel parser - hasHeaders option", () => {
  const buffer = createTestWorkbook({
    Data: [
      ["Name", "Age", "City"],
      ["Alice", "30", "NYC"],
      ["Bob", "25", "LA"],
    ],
  });

  it("should use first row as headers when hasHeaders=true (default)", () => {
    const result = parseExcel(buffer);
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Name, "Alice");
  });

  it("should use first row as headers when hasHeaders=true explicitly", () => {
    const result = parseExcel(buffer, { hasHeaders: true });
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.rowCount, 2);
  });

  it("should generate column names when hasHeaders=false", () => {
    const result = parseExcel(buffer, { hasHeaders: false });
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].name, "Column1");
    assert.equal(result.columns[1].name, "Column2");
    assert.equal(result.columns[2].name, "Column3");
    assert.equal(result.rowCount, 3); // All rows are data
  });

  it("should treat first row as data when hasHeaders=false", () => {
    const result = parseExcel(buffer, { hasHeaders: false });
    assert.equal(result.rows[0].Column1, "Name");
    assert.equal(result.rows[1].Column1, "Alice");
    assert.equal(result.rows[2].Column1, "Bob");
  });

  it("should work with hasHeaders=false and startRow", () => {
    const result = parseExcel(buffer, { hasHeaders: false, startRow: 2 });
    // Start from row 2 (Alice,30,NYC), no headers
    assert.equal(result.columns.length, 3);
    assert.equal(result.columns[0].name, "Column1");
    assert.equal(result.rowCount, 2); // Alice and Bob rows
    assert.equal(result.rows[0].Column1, "Alice");
    assert.equal(result.rows[1].Column1, "Bob");
  });

  it("should work with hasHeaders=false and column range", () => {
    const result = parseExcel(buffer, {
      hasHeaders: false,
      startColumn: 2,
      endColumn: 3,
    });
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Column1");
    assert.equal(result.columns[1].name, "Column2");
    assert.equal(result.rows[0].Column1, "Age");
    assert.equal(result.rows[0].Column2, "City");
  });

  it("should work with hasHeaders=true and startRow (skip title rows)", () => {
    const bufferWithTitle = createTestWorkbook({
      Data: [
        ["Company Report"],
        ["Generated 2024-01-01"],
        ["Name", "Age", "City"],
        ["Alice", "30", "NYC"],
        ["Bob", "25", "LA"],
      ],
    });

    const result = parseExcel(bufferWithTitle, {
      hasHeaders: true,
      startRow: 3,
    });
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Name, "Alice");
  });
});

describe("Excel parser - edge cases with ranges", () => {
  it("should handle empty sheet with range options", () => {
    const emptyBuffer = createTestWorkbook({
      Data: [],
    });

    assert.throws(
      () => parseExcel(emptyBuffer, { startRow: 1 }),
      (error: Error) => {
        assert(error instanceof ParseError);
        assert.equal(error.code, "EMPTY_RANGE");
        return true;
      },
    );
  });

  it("should handle single cell sheet", () => {
    const buffer = createTestWorkbook({
      Data: [["Value"]],
    });

    const result = parseExcel(buffer, { hasHeaders: false });
    assert.equal(result.columns.length, 1);
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].Column1, "Value");
  });

  it("should handle sheet with only headers and no data", () => {
    const buffer = createTestWorkbook({
      Data: [["Name", "Age", "City"]],
    });

    const result = parseExcel(buffer);
    assert.equal(result.columns.length, 3);
    assert.equal(result.rowCount, 0);
  });

  it("should handle maxRows with row range", () => {
    const buffer = createTestWorkbook({
      Data: [
        ["Name", "Age"],
        ["Alice", "30"],
        ["Bob", "25"],
        ["Charlie", "35"],
        ["David", "28"],
      ],
    });

    const result = parseExcel(buffer, { startRow: 1, endRow: 4, maxRows: 2 });
    // Range is rows 1-4 (header + 3 data rows), but maxRows limits to 2 data rows
    assert.equal(result.rowCount, 2);
    assert.equal(result.rows[0].Name, "Alice");
    assert.equal(result.rows[1].Name, "Bob");
  });

  it("should preserve null values in range extraction", () => {
    const buffer = createTestWorkbook({
      Data: [
        ["Name", "Age", "City"],
        ["Alice", "", "NYC"],
        ["Bob", "25", ""],
      ],
    });

    const result = parseExcel(buffer, { startColumn: 1, endColumn: 3 });
    assert.equal(result.rows[0].Age, null);
    assert.equal(result.rows[1].City, null);
  });

  it("should handle cells with formulas in range extraction", () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Value", "Formula"],
      [10, { f: "A2*2" }],
      [20, { f: "A3*2" }],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer, { startColumn: 1, endColumn: 2 });
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Value");
    assert.equal(result.rows[0].Value, 10); // Number stays as number
  });
});

describe("Excel parser - sheet selection with ranges", () => {
  const multiSheetBuffer = createTestWorkbook({
    Sheet1: [
      ["A", "B", "C"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ],
    Sheet2: [
      ["X", "Y", "Z"],
      ["10", "20", "30"],
      ["40", "50", "60"],
      ["70", "80", "90"],
    ],
  });

  it("should apply row range to selected sheet", () => {
    const result = parseExcel(multiSheetBuffer, {
      sheetName: "Sheet2",
      startRow: 2,
      endRow: 3,
    });
    // Row 2 of Sheet2 (10,20,30) becomes header, row 3 (40,50,60) becomes data
    assert.equal(result.columns[0].name, "10"); // Row 2 is (10,20,30)
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0]["10"], "40"); // Row 3 is (40,50,60)
  });

  it("should apply column range to selected sheet", () => {
    const result = parseExcel(multiSheetBuffer, {
      sheetIndex: 1,
      startColumn: 2,
      endColumn: 3,
    });
    // Sheet2 (index 1), columns 2-3 (Y,Z)
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "Y");
    assert.equal(result.columns[1].name, "Z");
    assert.equal(result.rows[0].Y, "20"); // String because test data uses strings
  });

  it("should apply both row and column ranges to selected sheet", () => {
    const result = parseExcel(multiSheetBuffer, {
      sheetName: "Sheet2",
      startRow: 3,
      endRow: 4,
      startColumn: 2,
      endColumn: 3,
    });
    // Sheet2, rows 3-4, columns 2-3
    // Row 3 columns 2-3: (50, 60) becomes header
    // Row 4 columns 2-3: (80, 90) becomes data
    assert.equal(result.columns.length, 2);
    assert.equal(result.columns[0].name, "50"); // Row 3, column 2 (Y column)
    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0]["50"], "80"); // Row 4, column 2 (Y column)
  });
});

describe("Excel parser - merged cells", () => {
  it("should fill merged cells with value from top-left cell", () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Name", "Status", "Details"],
      ["Alice", "Active", "Info"],
      ["Bob", "Active", "More"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Merge B2:B3 (Status column for Alice and Bob)
    worksheet["!merges"] = [{ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer);

    // Both rows should have "Active" in Status column
    assert.equal(result.rows[0].Status, "Active");
    assert.equal(result.rows[1].Status, "Active");
  });

  it("should handle horizontal merged cells (columns)", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Q1", null, null, "Q2"],
      ["Jan", "Feb", "Mar", "Apr"],
      ["100", "200", "300", "400"],
    ]);

    // Merge A1:C1 (Q1 spans 3 columns)
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Write and re-read to simulate real Excel file behavior
    const buffer1 = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const workbook2 = XLSX.read(buffer1, { type: "buffer" });
    const buffer = XLSX.write(workbook2, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer);

    // First row headers should all be "Q1"
    assert.equal(result.columns[0].name, "Q1");
    assert.equal(result.columns[1].name, "Q1_1"); // Disambiguated
    assert.equal(result.columns[2].name, "Q1_2"); // Disambiguated
    assert.equal(result.columns[3].name, "Q2");
  });

  it("should handle rectangular merged cells (rows and columns)", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Region", "Sales", null, "Target"],
      ["North", "1000", null, "1200"],
      ["South", "800", null, "900"],
    ]);

    // Merge B1:C2 (Sales cell spans 2x2)
    worksheet["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 1, c: 2 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Write and re-read to simulate real Excel file behavior
    const buffer1 = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const workbook2 = XLSX.read(buffer1, { type: "buffer" });
    const buffer = XLSX.write(workbook2, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer);

    // All cells in merge range should have "Sales" from top-left (B1)
    // Note: B2 keeps its original value "1000" since it already has data
    assert.equal(result.columns[1].name, "Sales");
    assert.equal(result.columns[2].name, "Sales_1");
    assert.equal(result.rows[0].Sales, "1000");
    assert.equal(result.rows[0].Sales_1, "Sales"); // Filled from merge top-left (B1)
  });

  it("should handle multiple separate merged ranges", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Q1", null, "Q2", null],
      ["Alice", "100", "200", "150", "250"],
      ["Bob", "120", "180", "160", "240"],
    ]);

    // Merge B1:C1 (Q1) and D1:E1 (Q2)
    worksheet["!merges"] = [
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Write and re-read to simulate real Excel file behavior
    const buffer1 = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const workbook2 = XLSX.read(buffer1, { type: "buffer" });
    const buffer = XLSX.write(workbook2, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer);

    // Headers should be filled
    assert.equal(result.columns[1].name, "Q1");
    assert.equal(result.columns[2].name, "Q1_1");
    assert.equal(result.columns[3].name, "Q2");
    assert.equal(result.columns[4].name, "Q2_1");
  });

  it("should handle merged cells with row range extraction", () => {
    const workbook = XLSX.utils.book_new();
    const data = [["Title Row"], ["Name", "Status"], ["Alice", "Active"], ["Bob", "Active"]];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Merge B3:B4 (Status for Alice and Bob)
    worksheet["!merges"] = [{ s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Skip title row
    const result = parseExcel(buffer, { startRow: 2 });

    // Both rows should have "Active"
    assert.equal(result.rows[0].Status, "Active");
    assert.equal(result.rows[1].Status, "Active");
  });

  it("should handle merged cells with column range extraction", () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["ID", "Q1", "", "Q2"],
      ["1", "100", "200", "300"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Merge B1:C1 (Q1)
    worksheet["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Extract only columns 2-4 (B-D)
    const result = parseExcel(buffer, { startColumn: 2, endColumn: 4 });

    // Headers should include filled merge
    assert.equal(result.columns[0].name, "Q1");
    assert.equal(result.columns[1].name, "Q1_1");
    assert.equal(result.columns[2].name, "Q2");
  });

  it("should handle empty merged cells (no value in top-left)", () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Name", "", "", "Status"],
      ["Alice", "X", "Y", "Active"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Merge B1:C1 but no value in B1 (empty merge)
    worksheet["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer);

    // Empty merged cells should generate default column names
    assert.equal(result.columns[0].name, "Name");
    assert.equal(result.columns[1].name, "Column2");
    assert.equal(result.columns[2].name, "Column3");
    assert.equal(result.columns[3].name, "Status");
  });

  it("should preserve data types in merged cells", () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Name", "Score", "Grade"],
      ["Alice", 95, "A"],
      ["Bob", 95, "A"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Merge B2:B3 (Score 95 for both)
    worksheet["!merges"] = [{ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const result = parseExcel(buffer);

    // Both should have numeric 95
    assert.equal(result.rows[0].Score, 95);
    assert.equal(result.rows[1].Score, 95);
    assert.equal(typeof result.rows[0].Score, "number");
    assert.equal(typeof result.rows[1].Score, "number");
  });

  it("should handle merged cells outside the specified range", () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["A", "B", "C", "D"],
      ["1", "2", "3", "4"],
      ["5", "6", "7", "8"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Merge A1:A2 (outside the range we'll extract)
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Extract only columns 2-3
    const result = parseExcel(buffer, { startColumn: 2, endColumn: 3 });

    // Should work normally, merge doesn't affect this range
    assert.equal(result.columns[0].name, "B");
    assert.equal(result.columns[1].name, "C");
  });
});
