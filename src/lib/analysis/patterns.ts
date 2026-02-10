/**
 * Pattern detection utilities for data analysis
 * Used to automatically detect common data issues and structural patterns
 */

export interface Column {
  name: string;
  type: string;
  sampleValues?: any[];
}

export interface DataAnalysis {
  headerRowIssues: HeaderRowIssue[];
  groupingColumns: GroupingColumnDetection[];
  sqlCompatibilityIssues: SQLIssue[];
  dataQualityIssues: DataQualityIssue[];
}

export interface HeaderRowIssue {
  suggestion: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  recommendedStartRow: number;
}

export interface GroupingColumnDetection {
  columnName: string;
  emptyRatio: number;
  confidence: "high" | "medium" | "low";
  reason: string;
  recommendation: string;
}

export interface SQLIssue {
  columnName: string;
  issue: string;
  severity: "error" | "warning";
  fix: string;
  example?: string;
}

export interface DataQualityIssue {
  columnName: string;
  issue: string;
  severity: "error" | "warning" | "info";
  recommendation: string;
}

/**
 * Detect if a column is a grouping/header column (sparse values)
 * Returns true if the column has 30-70% empty cells, suggesting grouped structure
 */
export function detectGroupingColumn(columnValues: any[]): {
  isGrouping: boolean;
  emptyRatio: number;
  confidence: "high" | "medium" | "low";
} {
  if (!columnValues || columnValues.length === 0) {
    return { isGrouping: false, emptyRatio: 0, confidence: "low" };
  }

  const emptyCount = columnValues.filter(
    (v) => v === null || v === undefined || v === "" || String(v).trim() === ""
  ).length;
  const totalCount = columnValues.length;
  const emptyRatio = emptyCount / totalCount;

  // High confidence: 40-60% empty (classic grouping pattern)
  if (emptyRatio >= 0.4 && emptyRatio <= 0.6) {
    return { isGrouping: true, emptyRatio, confidence: "high" };
  }

  // Medium confidence: 30-70% empty (likely grouping)
  if (emptyRatio >= 0.3 && emptyRatio <= 0.7) {
    return { isGrouping: true, emptyRatio, confidence: "medium" };
  }

  return { isGrouping: false, emptyRatio, confidence: "low" };
}

/**
 * Detect the likely header row by analyzing empty cells and data consistency
 * Returns 1-based row number
 */
export function detectHeaderRow(rows: any[][]): {
  likelyHeaderRow: number;
  confidence: "high" | "medium" | "low";
  reason: string;
} {
  if (!rows || rows.length === 0) {
    return { likelyHeaderRow: 1, confidence: "low", reason: "No data to analyze" };
  }

  // Check first 20 rows
  const maxRowsToCheck = Math.min(20, rows.length);

  for (let i = 0; i < maxRowsToCheck; i++) {
    const currentRow = rows[i];
    const nextRows = rows.slice(i + 1, Math.min(i + 6, rows.length));

    if (!currentRow || nextRows.length === 0) continue;

    // Count empty cells in current row
    const emptyInCurrent = currentRow.filter(
      (v) => v === null || v === undefined || v === "" || String(v).trim() === ""
    ).length;
    const emptyCurrent = emptyInCurrent / currentRow.length;

    // Count empty cells in next rows (average)
    const emptyInNext =
      nextRows.reduce((sum, row) => {
        const empty = row.filter(
          (v) => v === null || v === undefined || v === "" || String(v).trim() === ""
        ).length;
        return sum + empty / row.length;
      }, 0) / nextRows.length;

    // Header row should have fewer empty cells than previous rows
    // and subsequent rows should have consistent data
    const isLikelyHeader =
      emptyCurrent < 0.3 && // Current row mostly filled
      emptyInNext < 0.5 && // Next rows have some data
      i > 0; // Not the first row

    if (isLikelyHeader) {
      // Check if previous rows were mostly empty
      const previousRows = rows.slice(Math.max(0, i - 3), i);
      const emptyInPrevious =
        previousRows.reduce((sum, row) => {
          const empty = row.filter(
            (v) => v === null || v === undefined || v === "" || String(v).trim() === ""
          ).length;
          return sum + empty / row.length;
        }, 0) / (previousRows.length || 1);

      if (emptyInPrevious > 0.5) {
        return {
          likelyHeaderRow: i + 1, // 1-based
          confidence: "high",
          reason: `Row ${i + 1} appears to be headers - previous rows mostly empty, this row mostly filled, next rows have consistent data`,
        };
      }
    }
  }

  // Default: assume row 1 is header
  return {
    likelyHeaderRow: 1,
    confidence: "medium",
    reason: "No strong indicators found, assuming row 1 contains headers",
  };
}

/**
 * Detect if column names are generic/auto-generated (Column1, Column2, etc.)
 * This is a strong indicator that the wrong row is being used as headers
 */
export function hasGenericColumnNames(columns: Column[]): {
  hasGeneric: boolean;
  genericCount: number;
  totalCount: number;
  confidence: "high" | "medium" | "low";
} {
  const genericPatterns = [
    /^column\d+$/i,           // Column1, Column2, column3, COLUMN4
    /^col\d+$/i,              // Col1, col2, COL3
    /^field\d+$/i,            // Field1, field2
    /^f\d+$/i,                // F1, f2, F3
    /^unnamed:\s*\d+$/i,      // Unnamed: 0, unnamed: 1
    /^_\d+$/,                 // _1, _2, _3
  ];

  const genericCount = columns.filter((col) =>
    genericPatterns.some((pattern) => pattern.test(col.name))
  ).length;

  const totalCount = columns.length;
  const genericRatio = genericCount / totalCount;

  // High confidence: 80%+ columns are generic
  if (genericRatio >= 0.8) {
    return { hasGeneric: true, genericCount, totalCount, confidence: "high" };
  }

  // Medium confidence: 50-80% columns are generic
  if (genericRatio >= 0.5) {
    return { hasGeneric: true, genericCount, totalCount, confidence: "medium" };
  }

  // Any generic columns at all is somewhat suspicious
  if (genericCount > 0) {
    return { hasGeneric: true, genericCount, totalCount, confidence: "low" };
  }

  return { hasGeneric: false, genericCount: 0, totalCount, confidence: "low" };
}

/**
 * Check column names for SQL compatibility issues
 */
export function checkSQLCompatibility(columns: Column[]): SQLIssue[] {
  const issues: SQLIssue[] = [];

  for (const col of columns) {
    const name = col.name;

    // Check for spaces
    if (/\s/.test(name)) {
      issues.push({
        columnName: name,
        issue: "Column name contains spaces",
        severity: "error",
        fix: "Rename to use underscores",
        example: name.toLowerCase().replace(/\s+/g, "_"),
      });
    }

    // Check for special characters (except underscore)
    if (/[^a-zA-Z0-9_]/.test(name)) {
      issues.push({
        columnName: name,
        issue: "Column name contains special characters",
        severity: "error",
        fix: "Rename to use only alphanumeric and underscores",
        example: name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
      });
    }

    // Check if starts with number
    if (/^[0-9]/.test(name)) {
      issues.push({
        columnName: name,
        issue: "Column name starts with a number",
        severity: "error",
        fix: "Rename with a letter prefix",
        example: `col_${name}`,
      });
    }

    // Check for uppercase (warning, not error)
    if (name !== name.toLowerCase()) {
      issues.push({
        columnName: name,
        issue: "Column name not lowercase",
        severity: "warning",
        fix: "Convert to lowercase for SQL convention",
        example: name.toLowerCase(),
      });
    }

    // Check for generic names
    if (/^column\d+$/i.test(name)) {
      issues.push({
        columnName: name,
        issue: "Generic column name",
        severity: "warning",
        fix: "Rename to be descriptive",
        example: "descriptive_name",
      });
    }
  }

  return issues;
}

/**
 * Detect data quality issues in columns
 */
export function detectDataQualityIssues(
  columns: Column[],
  sampleRows: any[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  for (const col of columns) {
    // Check for type inconsistencies
    if (col.type === "string") {
      // Check if column contains mostly numbers but is typed as string
      const values = sampleRows.map((row) => row[col.name]).filter((v) => v != null && v !== "");

      if (values.length > 0) {
        const numericCount = values.filter((v) => !isNaN(Number(v))).length;
        const numericRatio = numericCount / values.length;

        if (numericRatio > 0.8) {
          issues.push({
            columnName: col.name,
            issue: "Column contains mostly numbers but typed as string",
            severity: "warning",
            recommendation: "Cast to number type for proper SQL data type",
          });
        }

        // Check for excessive whitespace
        const whitespaceCount = values.filter((v) => {
          const str = String(v);
          return str !== str.trim() || str.includes("  ");
        }).length;

        if (whitespaceCount > 0) {
          issues.push({
            columnName: col.name,
            issue: "Column contains excessive whitespace",
            severity: "info",
            recommendation: "Apply trim transformation to clean whitespace",
          });
        }

        // Check for mixed case (if categorical data)
        const uniqueValues = new Set(values.map((v) => String(v).toLowerCase()));
        const actualUnique = new Set(values.map((v) => String(v)));

        if (uniqueValues.size < actualUnique.size && uniqueValues.size < 20) {
          issues.push({
            columnName: col.name,
            issue: "Column has mixed case for same values",
            severity: "info",
            recommendation: "Convert to consistent case (uppercase or lowercase)",
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Analyze all patterns in the dataset
 */
export function analyzeDataPatterns(
  columns: Column[],
  sampleRows: any[],
  currentStartRow: number = 1
): DataAnalysis {
  const headerRowIssues: HeaderRowIssue[] = [];
  const groupingColumns: GroupingColumnDetection[] = [];
  const sqlCompatibilityIssues = checkSQLCompatibility(columns);
  const dataQualityIssues = detectDataQualityIssues(columns, sampleRows);

  // Detect grouping columns
  for (const col of columns) {
    const values = sampleRows.map((row) => row[col.name]);
    const detection = detectGroupingColumn(values);

    if (detection.isGrouping) {
      groupingColumns.push({
        columnName: col.name,
        emptyRatio: detection.emptyRatio,
        confidence: detection.confidence,
        reason: `Column has ${Math.round(detection.emptyRatio * 100)}% empty cells, suggesting grouped/hierarchical structure`,
        recommendation: `Apply fill_down to normalize the ${col.name} column`,
      });
    }
  }

  // Check if headers might be at wrong row
  if (currentStartRow === 1) {
    // Convert sample rows to 2D array for header detection
    const rowsArray = sampleRows.map((row) => columns.map((col) => row[col.name]));
    const headerDetection = detectHeaderRow(rowsArray);

    if (headerDetection.likelyHeaderRow > 1) {
      headerRowIssues.push({
        suggestion: `Update startRow to ${headerDetection.likelyHeaderRow}`,
        confidence: headerDetection.confidence,
        reason: headerDetection.reason,
        recommendedStartRow: headerDetection.likelyHeaderRow,
      });
    }
  }

  return {
    headerRowIssues,
    groupingColumns,
    sqlCompatibilityIssues,
    dataQualityIssues,
  };
}
