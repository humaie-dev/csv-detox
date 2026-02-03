/**
 * SQL translator - Converts pipeline transformation steps to DuckDB SQL
 */

import type {
  TransformationStep,
  TrimConfig,
  UppercaseConfig,
  LowercaseConfig,
  DeduplicateConfig,
  FilterConfig,
  RenameColumnConfig,
  RemoveColumnConfig,
  UnpivotConfig,
  PivotConfig,
  SplitColumnConfig,
  MergeColumnsConfig,
  CastColumnConfig,
  FillDownConfig,
  FillAcrossConfig,
  SortConfig,
} from "@/lib/pipeline/types";
import { SQLTranslationError } from "./types";

/**
 * Escape a column name for use in SQL
 * DuckDB uses double quotes for identifiers
 */
export function escapeIdentifier(name: string): string {
  // Double any existing double quotes
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Escape a string value for use in SQL
 * DuckDB uses single quotes for string literals
 */
export function escapeLiteral(value: string): string {
  // Double any existing single quotes
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Translate entire pipeline to SQL statements
 * Returns array of SQL statements to execute in sequence
 */
export function translatePipeline(steps: TransformationStep[]): string[] {
  const sqlStatements: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const statements = translateStep(steps[i], i);
    sqlStatements.push(...statements);
  }

  return sqlStatements;
}

/**
 * Translate a single transformation step to SQL
 * @param step - The transformation step
 * @param stepIndex - Index of the step in the pipeline (for unique table names)
 */
function translateStep(step: TransformationStep, stepIndex: number): string[] {
  switch (step.type) {
    case "trim":
      return translateTrim(step.config as TrimConfig);
    case "uppercase":
      return translateUppercase(step.config as UppercaseConfig);
    case "lowercase":
      return translateLowercase(step.config as LowercaseConfig);
    case "deduplicate":
      return translateDeduplicate(step.config as DeduplicateConfig, stepIndex);
    case "filter":
      return translateFilter(step.config as FilterConfig);
    case "rename_column":
      return translateRenameColumn(step.config as RenameColumnConfig);
    case "remove_column":
      return translateRemoveColumn(step.config as RemoveColumnConfig);
    case "unpivot":
      return translateUnpivot(step.config as UnpivotConfig, stepIndex);
    case "pivot":
      return translatePivot(step.config as PivotConfig, stepIndex);
    case "split_column":
      return translateSplitColumn(step.config as SplitColumnConfig);
    case "merge_columns":
      return translateMergeColumns(step.config as MergeColumnsConfig);
    case "cast_column":
      return translateCastColumn(step.config as CastColumnConfig);
    case "fill_down":
      return translateFillDown(step.config as FillDownConfig, stepIndex);
    case "fill_across":
      return translateFillAcross(step.config as FillAcrossConfig);
    case "sort":
      return translateSort(step.config as SortConfig, stepIndex);
    default:
      throw new SQLTranslationError(
        `Unknown transformation type: ${(step as TransformationStep).type}`,
        (step as TransformationStep).type,
        step.config
      );
  }
}

// === Individual operation translators ===

function translateTrim(config: TrimConfig): string[] {
  return config.columns.map(
    (col) => `UPDATE data SET ${escapeIdentifier(col)} = TRIM(${escapeIdentifier(col)})`
  );
}

function translateUppercase(config: UppercaseConfig): string[] {
  return config.columns.map(
    (col) => `UPDATE data SET ${escapeIdentifier(col)} = UPPER(${escapeIdentifier(col)})`
  );
}

function translateLowercase(config: LowercaseConfig): string[] {
  return config.columns.map(
    (col) => `UPDATE data SET ${escapeIdentifier(col)} = LOWER(${escapeIdentifier(col)})`
  );
}

function translateDeduplicate(config: DeduplicateConfig, stepIndex: number): string[] {
  const tempTable = `data_deduped_${stepIndex}`;
  
  if (!config.columns || config.columns.length === 0) {
    // Deduplicate all columns
    return [
      `CREATE TABLE ${tempTable} AS SELECT DISTINCT * FROM data`,
      "DROP TABLE data",
      `ALTER TABLE ${tempTable} RENAME TO data`,
    ];
  }

  // Deduplicate specific columns using ROW_NUMBER
  const partitionCols = config.columns.map(escapeIdentifier).join(", ");
  return [
    `CREATE TABLE ${tempTable} AS SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY ${partitionCols} ORDER BY ROWID) as rn FROM data) WHERE rn = 1`,
    `ALTER TABLE ${tempTable} DROP COLUMN rn`,
    "DROP TABLE data",
    `ALTER TABLE ${tempTable} RENAME TO data`,
  ];
}

function translateFilter(config: FilterConfig): string[] {
  const col = escapeIdentifier(config.column);
  const val = escapeLiteral(String(config.value));

  let condition: string;
  switch (config.operator) {
    case "equals":
      condition = `${col} = ${val}`;
      break;
    case "not_equals":
      condition = `${col} != ${val}`;
      break;
    case "contains":
      condition = `${col} LIKE '%' || ${val} || '%'`;
      break;
    case "not_contains":
      condition = `${col} NOT LIKE '%' || ${val} || '%'`;
      break;
    case "greater_than":
      // Use TRY_CAST to handle non-numeric values
      condition = `TRY_CAST(${col} AS DOUBLE) > TRY_CAST(${val} AS DOUBLE)`;
      break;
    case "less_than":
      condition = `TRY_CAST(${col} AS DOUBLE) < TRY_CAST(${val} AS DOUBLE)`;
      break;
    default:
      throw new SQLTranslationError(
        `Unknown filter operator: ${config.operator}`,
        "filter",
        config
      );
  }

  // DELETE rows that don't match (inverse logic)
  return [`DELETE FROM data WHERE NOT (${condition})`];
}

function translateRenameColumn(config: RenameColumnConfig): string[] {
  return [
    `ALTER TABLE data RENAME COLUMN ${escapeIdentifier(config.oldName)} TO ${escapeIdentifier(config.newName)}`,
  ];
}

function translateRemoveColumn(config: RemoveColumnConfig): string[] {
  return config.columns.map((col) => `ALTER TABLE data DROP COLUMN ${escapeIdentifier(col)}`);
}

function translateUnpivot(config: UnpivotConfig, stepIndex: number): string[] {
  const tempTable = `data_unpivoted_${stepIndex}`;
  const valueCols = config.valueColumns.map(escapeIdentifier).join(", ");
  const varName = escapeIdentifier(config.variableColumnName);
  const valName = escapeIdentifier(config.valueColumnName);

  return [
    `CREATE TABLE ${tempTable} AS UNPIVOT data ON (${valueCols}) INTO NAME ${varName} VALUE ${valName}`,
    "DROP TABLE data",
    `ALTER TABLE ${tempTable} RENAME TO data`,
  ];
}

function translatePivot(config: PivotConfig, stepIndex: number): string[] {
  const tempTable = `data_pivoted_${stepIndex}`;
  const indexCols = config.indexColumns.map(escapeIdentifier).join(", ");
  const colSource = escapeIdentifier(config.columnSource);
  const valSource = escapeIdentifier(config.valueSource);

  // Map aggregation type to SQL function
  let aggFunc: string;
  switch (config.aggregation) {
    case "sum":
      aggFunc = "SUM";
      break;
    case "mean":
      aggFunc = "AVG";
      break;
    case "count":
      aggFunc = "COUNT";
      break;
    case "first":
      aggFunc = "FIRST";
      break;
    case "last":
      aggFunc = "LAST";
      break;
    default:
      // Default to LAST if not specified
      aggFunc = "LAST";
  }

  // DuckDB pivot syntax
  return [
    `CREATE TABLE ${tempTable} AS PIVOT data ON ${colSource} USING ${aggFunc}(${valSource}) GROUP BY ${indexCols}`,
    "DROP TABLE data",
    `ALTER TABLE ${tempTable} RENAME TO data`,
  ];
}

function translateSplitColumn(config: SplitColumnConfig): string[] {
  const statements: string[] = [];
  const sourceCol = escapeIdentifier(config.column);

  // Add new columns
  const newCols = config.newColumns.map(escapeIdentifier).join(", ");
  statements.push(`ALTER TABLE data ADD COLUMN ${config.newColumns.map((name: string) => `${escapeIdentifier(name)} VARCHAR`).join(", ADD COLUMN ")}`);

  // Populate new columns based on split method
  if (config.method === "delimiter") {
    // Use STRING_SPLIT to split by delimiter
    const delimiter = escapeLiteral(config.delimiter || ",");
    for (let i = 0; i < config.newColumns.length; i++) {
      const newCol = escapeIdentifier(config.newColumns[i]);
      statements.push(
        `UPDATE data SET ${newCol} = (STRING_SPLIT(${sourceCol}, ${delimiter}))[${i + 1}]`
      );
    }
  } else if (config.method === "position") {
    // Split by character positions
    if (!config.positions || config.positions.length === 0) {
      throw new SQLTranslationError(
        "Position-based split requires positions array",
        "split_column",
        config
      );
    }

    const positions = [0, ...config.positions];
    for (let i = 0; i < config.newColumns.length; i++) {
      const newCol = escapeIdentifier(config.newColumns[i]);
      const start = positions[i] + 1; // DuckDB SUBSTR is 1-based
      const end = i < positions.length - 1 ? positions[i + 1] : undefined;

      if (end !== undefined) {
        const length = end - positions[i];
        statements.push(`UPDATE data SET ${newCol} = SUBSTR(${sourceCol}, ${start}, ${length})`);
      } else {
        statements.push(`UPDATE data SET ${newCol} = SUBSTR(${sourceCol}, ${start})`);
      }
    }
  } else if (config.method === "regex") {
    // Use REGEXP_EXTRACT for regex-based splitting
    if (!config.pattern) {
      throw new SQLTranslationError(
        "Regex-based split requires pattern",
        "split_column",
        config
      );
    }

    const pattern = escapeLiteral(config.pattern);
    for (let i = 0; i < config.newColumns.length; i++) {
      const newCol = escapeIdentifier(config.newColumns[i]);
      // REGEXP_EXTRACT uses 0-based group indexing, group 0 is full match
      statements.push(
        `UPDATE data SET ${newCol} = REGEXP_EXTRACT(${sourceCol}, ${pattern}, ${i + 1})`
      );
    }
  } else {
    throw new SQLTranslationError(
      `Unknown split method: ${config.method}`,
      "split_column",
      config
    );
  }

  // Drop original column if not keeping it
  if (!config.keepOriginal) {
    statements.push(`ALTER TABLE data DROP COLUMN ${sourceCol}`);
  }

  return statements;
}

function translateMergeColumns(config: MergeColumnsConfig): string[] {
  const statements: string[] = [];
  const newCol = escapeIdentifier(config.newColumn);
  const separator = escapeLiteral(config.separator || ",");

  // Add new column
  statements.push(`ALTER TABLE data ADD COLUMN ${newCol} VARCHAR`);

  // Build CONCAT_WS expression
  const cols = config.columns.map(escapeIdentifier).join(", ");
  statements.push(`UPDATE data SET ${newCol} = CONCAT_WS(${separator}, ${cols})`);

  // Drop original columns if not keeping them
  if (!config.keepOriginal) {
    for (const col of config.columns) {
      statements.push(`ALTER TABLE data DROP COLUMN ${escapeIdentifier(col)}`);
    }
  }

  return statements;
}

function translateCastColumn(config: CastColumnConfig): string[] {
  const col = escapeIdentifier(config.column);
  
  // Map target type to DuckDB type
  let duckdbType: string;
  switch (config.targetType) {
    case "string":
      duckdbType = "VARCHAR";
      break;
    case "number":
      duckdbType = "DOUBLE";
      break;
    case "boolean":
      duckdbType = "BOOLEAN";
      break;
    case "date":
      duckdbType = "DATE";
      break;
    default:
      throw new SQLTranslationError(
        `Unknown target type: ${config.targetType}`,
        "cast_column",
        config
      );
  }

  // Handle error modes
  if (config.onError === "fail") {
    // Use CAST which throws on error
    return [`UPDATE data SET ${col} = CAST(${col} AS ${duckdbType})`];
  } else if (config.onError === "null") {
    // Use TRY_CAST which returns NULL on error
    return [`UPDATE data SET ${col} = TRY_CAST(${col} AS ${duckdbType})`];
  } else if (config.onError === "skip") {
    // Delete rows where cast fails
    return [
      `DELETE FROM data WHERE TRY_CAST(${col} AS ${duckdbType}) IS NULL AND ${col} IS NOT NULL`,
    ];
  } else {
    throw new SQLTranslationError(
      `Unknown error mode: ${config.onError}`,
      "cast_column",
      config
    );
  }
}

function translateFillDown(config: FillDownConfig, stepIndex: number): string[] {
  const tempTable = `data_filled_${stepIndex}`;
  
  // DuckDB doesn't allow window functions in UPDATE statements
  // Use CREATE TABLE AS SELECT with window functions instead
  
  // Build SELECT list: filled columns + other columns
  const filledColumns = config.columns.map(col => {
    const colName = escapeIdentifier(col);
    // Use COALESCE with LAST_VALUE window function to fill nulls
    return `COALESCE(${colName}, LAST_VALUE(${colName} IGNORE NULLS) OVER (ORDER BY ROWID ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ${colName}`;
  });
  
  // For columns not being filled, just select them as-is
  // We'll use * EXCLUDE to exclude the filled columns, then add them back with filling
  const excludeCols = config.columns.map(escapeIdentifier).join(", ");
  
  return [
    `CREATE TABLE ${tempTable} AS SELECT * EXCLUDE (${excludeCols}), ${filledColumns.join(", ")} FROM data`,
    "DROP TABLE data",
    `ALTER TABLE ${tempTable} RENAME TO data`,
  ];
}

function translateFillAcross(config: FillAcrossConfig): string[] {
  const statements: string[] = [];

  // Fill across means: for each row, fill nulls from left to right
  // We need to process columns in order
  for (let i = 1; i < config.columns.length; i++) {
    const prevCol = escapeIdentifier(config.columns[i - 1]);
    const currentCol = escapeIdentifier(config.columns[i]);
    
    // Fill current column with previous column's value if current is null
    statements.push(
      `UPDATE data SET ${currentCol} = ${prevCol} WHERE ${currentCol} IS NULL`
    );
  }

  return statements;
}

function translateSort(config: SortConfig, stepIndex: number): string[] {
  const tempTable = `data_sorted_${stepIndex}`;
  const nullsPosition = config.nullsPosition || "last";
  
  // Build ORDER BY clause with all sort columns
  const orderByParts = config.columns.map(sortCol => {
    const col = escapeIdentifier(sortCol.name);
    const direction = sortCol.direction === "desc" ? "DESC" : "ASC";
    const nulls = nullsPosition === "first" ? "NULLS FIRST" : "NULLS LAST";
    
    return `${col} ${direction} ${nulls}`;
  });
  
  const orderByClause = orderByParts.join(", ");
  
  // Create new sorted table, drop old, rename
  return [
    `CREATE TABLE ${tempTable} AS SELECT * FROM data ORDER BY ${orderByClause}`,
    `DROP TABLE data`,
    `ALTER TABLE ${tempTable} RENAME TO data`,
  ];
}
