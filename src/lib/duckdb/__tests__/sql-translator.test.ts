/**
 * Tests for SQL Translator
 * Validates that all 14 transformation operations translate correctly to DuckDB SQL
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  translatePipeline,
  escapeIdentifier,
  escapeLiteral,
} from "../sql-translator";
import type { TransformationStep } from "@/lib/pipeline/types";

describe("SQL Escaping", () => {
  it("escapeIdentifier should wrap column names in double quotes", () => {
    assert.strictEqual(escapeIdentifier("name"), '"name"');
    assert.strictEqual(escapeIdentifier("user_id"), '"user_id"');
  });

  it("escapeIdentifier should escape double quotes by doubling them", () => {
    assert.strictEqual(escapeIdentifier('col"name'), '"col""name"');
    assert.strictEqual(escapeIdentifier('col""name'), '"col""""name"');
  });

  it("escapeLiteral should wrap values in single quotes", () => {
    assert.strictEqual(escapeLiteral("value"), "'value'");
    assert.strictEqual(escapeLiteral("test"), "'test'");
  });

  it("escapeLiteral should escape single quotes by doubling them", () => {
    assert.strictEqual(escapeLiteral("val'ue"), "'val''ue'");
    assert.strictEqual(escapeLiteral("val''ue"), "'val''''ue'");
  });
});

describe("Trim Operation", () => {
  it("should generate UPDATE statement for single column", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql.length, 1);
    assert.strictEqual(sql[0], 'UPDATE data SET "name" = TRIM("name")');
  });

  it("should generate multiple UPDATE statements for multiple columns", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name", "address"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql.length, 2);
    assert.strictEqual(sql[0], 'UPDATE data SET "name" = TRIM("name")');
    assert.strictEqual(sql[1], 'UPDATE data SET "address" = TRIM("address")');
  });

  it("should handle columns with special characters", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "trim",
        config: {
          type: "trim",
          columns: ['col"name'],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'UPDATE data SET "col""name" = TRIM("col""name")');
  });
});

describe("Uppercase/Lowercase Operations", () => {
  it("should generate UPPER for uppercase operation", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["name"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'UPDATE data SET "name" = UPPER("name")');
  });

  it("should generate LOWER for lowercase operation", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "lowercase",
        config: {
          type: "lowercase",
          columns: ["name"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'UPDATE data SET "name" = LOWER("name")');
  });
});

describe("Deduplicate Operation", () => {
  it("should use SELECT DISTINCT for all columns", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "deduplicate",
        config: {
          type: "deduplicate",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql.length, 3);
    assert.strictEqual(sql[0], "CREATE TABLE data_deduped_0 AS SELECT DISTINCT * FROM data");
    assert.strictEqual(sql[1], "DROP TABLE data");
    assert.strictEqual(sql[2], "ALTER TABLE data_deduped_0 RENAME TO data");
  });

  it("should use ROW_NUMBER for specific columns", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "deduplicate",
        config: {
          type: "deduplicate",
          columns: ["email", "phone"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql.length, 4);
    assert.ok(sql[0].includes('PARTITION BY "email", "phone"'));
    assert.ok(sql[0].includes("ROW_NUMBER()"));
    assert.ok(sql[0].includes("WHERE rn = 1"));
  });
});

describe("Filter Operation", () => {
  it("should generate equals filter", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "filter",
        config: {
          type: "filter",
          column: "status",
          operator: "equals",
          value: "active",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'DELETE FROM data WHERE NOT ("status" = \'active\')');
  });

  it("should generate contains filter", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "filter",
        config: {
          type: "filter",
          column: "name",
          operator: "contains",
          value: "test",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].includes("LIKE '%' || 'test' || '%'"));
  });

  it("should generate greater_than filter with TRY_CAST", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "filter",
        config: {
          type: "filter",
          column: "age",
          operator: "greater_than",
          value: "18",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].includes("TRY_CAST"));
    assert.ok(sql[0].includes("> TRY_CAST"));
  });

  it("should escape single quotes in filter values", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "filter",
        config: {
          type: "filter",
          column: "name",
          operator: "equals",
          value: "O'Brien",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].includes("'O''Brien'"));
  });
});

describe("Rename Column Operation", () => {
  it("should generate ALTER TABLE RENAME COLUMN", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "rename_column",
        config: {
          type: "rename_column",
          oldName: "old_name",
          newName: "new_name",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(
      sql[0],
      'ALTER TABLE data RENAME COLUMN "old_name" TO "new_name"'
    );
  });
});

describe("Remove Column Operation", () => {
  it("should generate DROP COLUMN for single column", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "remove_column",
        config: {
          type: "remove_column",
          columns: ["temp_col"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'ALTER TABLE data DROP COLUMN "temp_col"');
  });

  it("should generate multiple DROP COLUMN for multiple columns", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "remove_column",
        config: {
          type: "remove_column",
          columns: ["col1", "col2"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql.length, 2);
    assert.strictEqual(sql[0], 'ALTER TABLE data DROP COLUMN "col1"');
    assert.strictEqual(sql[1], 'ALTER TABLE data DROP COLUMN "col2"');
  });
});

describe("Cast Column Operation", () => {
  it("should use CAST for fail mode", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "cast_column",
        config: {
          type: "cast_column",
          column: "age",
          targetType: "number",
          onError: "fail",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'UPDATE data SET "age" = CAST("age" AS DOUBLE)');
  });

  it("should use TRY_CAST for null mode", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "cast_column",
        config: {
          type: "cast_column",
          column: "age",
          targetType: "number",
          onError: "null",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.strictEqual(sql[0], 'UPDATE data SET "age" = TRY_CAST("age" AS DOUBLE)');
  });

  it("should use DELETE for skip mode", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "cast_column",
        config: {
          type: "cast_column",
          column: "age",
          targetType: "number",
          onError: "skip",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].startsWith("DELETE FROM data"));
    assert.ok(sql[0].includes("TRY_CAST"));
    assert.ok(sql[0].includes("IS NULL"));
  });

  it("should map date type to DATE", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "cast_column",
        config: {
          type: "cast_column",
          column: "created_at",
          targetType: "date",
          onError: "null",
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].includes("AS DATE"));
  });
});

describe("Fill Down Operation", () => {
  it("should generate window function for fill down", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "fill_down",
        config: {
          type: "fill_down",
          columns: ["category"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].includes("COALESCE"));
    assert.ok(sql[0].includes("LAST_VALUE"));
    assert.ok(sql[0].includes("IGNORE NULLS"));
    assert.ok(sql[0].includes("ORDER BY ROWID"));
  });

  it("should generate statement for each column", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "fill_down",
        config: {
          type: "fill_down",
          columns: ["col1", "col2"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    // Should generate: CREATE TABLE data_filled_0 AS SELECT ..., DROP TABLE data, ALTER TABLE data_filled_0 RENAME TO data
    assert.strictEqual(sql.length, 3);
    assert.ok(sql[0].includes("CREATE TABLE data_filled_0"));
    assert.ok(sql[0].includes('"col1"'));
    assert.ok(sql[0].includes('"col2"'));
    assert.ok(sql[1].includes("DROP TABLE data"));
    assert.ok(sql[2].includes("ALTER TABLE data_filled_0 RENAME TO data"));
  });
});

describe("Fill Across Operation", () => {
  it("should generate UPDATE with previous column for fill across", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "fill_across",
        config: {
          type: "fill_across",
          columns: ["Q1", "Q2", "Q3"],
        },
      },
    ];

    const sql = translatePipeline(steps);
    // Should generate 2 statements (n-1 for n columns)
    assert.strictEqual(sql.length, 2);
    // Q2 filled from Q1
    assert.ok(sql[0].includes('"Q2"'));
    assert.ok(sql[0].includes('"Q1"'));
    // Q3 filled from Q2
    assert.ok(sql[1].includes('"Q3"'));
    assert.ok(sql[1].includes('"Q2"'));
  });
});

describe("Merge Columns Operation", () => {
  it("should use CONCAT_WS with separator", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "merge_columns",
        config: {
          type: "merge_columns",
          columns: ["first", "last"],
          separator: " ",
          newColumn: "full_name",
          keepOriginal: false,
        },
      },
    ];

    const sql = translatePipeline(steps);
    // Should have: ADD COLUMN, UPDATE with CONCAT_WS, DROP originals
    assert.ok(sql[0].includes("ADD COLUMN"));
    assert.ok(sql[0].includes('"full_name"'));
    assert.ok(sql[1].includes("CONCAT_WS"));
    assert.ok(sql[1].includes("' '"));
    assert.ok(sql[2].includes('DROP COLUMN "first"'));
    assert.ok(sql[3].includes('DROP COLUMN "last"'));
  });

  it("should not drop originals when keepOriginal is true", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "merge_columns",
        config: {
          type: "merge_columns",
          columns: ["first", "last"],
          separator: " ",
          newColumn: "full_name",
          keepOriginal: true,
        },
      },
    ];

    const sql = translatePipeline(steps);
    // Should have only: ADD COLUMN, UPDATE with CONCAT_WS (no DROP)
    assert.strictEqual(sql.length, 2);
    assert.ok(!sql.some((s) => s.includes("DROP COLUMN")));
  });
});

describe("Split Column Operation", () => {
  it("should use STRING_SPLIT for delimiter method", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "split_column",
        config: {
          type: "split_column",
          column: "full_name",
          method: "delimiter",
          delimiter: " ",
          newColumns: ["first", "last"],
          keepOriginal: false,
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql[0].includes("ADD COLUMN"));
    assert.ok(sql[1].includes("STRING_SPLIT"));
    assert.ok(sql[1].includes("' '"));
    assert.ok(sql[3].includes("DROP COLUMN"));
  });

  it("should use SUBSTR for position method", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "split_column",
        config: {
          type: "split_column",
          column: "code",
          method: "position",
          positions: [3, 6],
          newColumns: ["part1", "part2", "part3"],
          keepOriginal: true,
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql.some((s) => s.includes("SUBSTR")));
    // Should not drop original
    assert.ok(!sql.some((s) => s.includes("DROP COLUMN")));
  });

  it("should use REGEXP_EXTRACT for regex method", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "split_column",
        config: {
          type: "split_column",
          column: "email",
          method: "regex",
          pattern: "([^@]+)@(.+)",
          newColumns: ["username", "domain"],
          keepOriginal: false,
        },
      },
    ];

    const sql = translatePipeline(steps);
    assert.ok(sql.some((s) => s.includes("REGEXP_EXTRACT")));
    assert.ok(sql.some((s) => s.includes("'([^@]+)@(.+)'")));
  });
});

describe("Sort Operation", () => {
  it("should generate ORDER BY for single column ascending", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "sort",
        config: {
          type: "sort",
          columns: [{ name: "age", direction: "asc" }],
        },
      },
    ];

    const sql = translatePipeline(steps);
    
    assert.strictEqual(sql.length, 3);
    assert.strictEqual(
      sql[0],
      'CREATE TABLE data_sorted_0 AS SELECT * FROM data ORDER BY "age" ASC NULLS LAST'
    );
    assert.strictEqual(sql[1], "DROP TABLE data");
    assert.strictEqual(sql[2], "ALTER TABLE data_sorted_0 RENAME TO data");
  });

  it("should generate ORDER BY for single column descending", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "sort",
        config: {
          type: "sort",
          columns: [{ name: "salary", direction: "desc" }],
        },
      },
    ];

    const sql = translatePipeline(steps);
    
    assert.ok(sql[0].includes('"salary" DESC NULLS LAST'));
  });

  it("should generate ORDER BY for multiple columns", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "sort",
        config: {
          type: "sort",
          columns: [
            { name: "department", direction: "asc" },
            { name: "salary", direction: "desc" },
            { name: "name", direction: "asc" },
          ],
        },
      },
    ];

    const sql = translatePipeline(steps);
    
    assert.ok(
      sql[0].includes(
        '"department" ASC NULLS LAST, "salary" DESC NULLS LAST, "name" ASC NULLS LAST'
      )
    );
  });

  it("should handle nullsPosition first", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "sort",
        config: {
          type: "sort",
          columns: [{ name: "age", direction: "asc" }],
          nullsPosition: "first",
        },
      },
    ];

    const sql = translatePipeline(steps);
    
    assert.ok(sql[0].includes('"age" ASC NULLS FIRST'));
  });

  it("should escape column names with special characters", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "sort",
        config: {
          type: "sort",
          columns: [{ name: 'col"name', direction: "asc" }],
        },
      },
    ];

    const sql = translatePipeline(steps);
    
    assert.ok(sql[0].includes('"col""name" ASC NULLS LAST'));
  });

  it("should default direction to asc", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "sort",
        config: {
          type: "sort",
          columns: [{ name: "age", direction: "asc" }],
        },
      },
    ];

    const sql = translatePipeline(steps);
    
    assert.ok(sql[0].includes('"age" ASC'));
  });
});

describe("Multi-Step Pipelines", () => {
  it("should handle empty pipeline", () => {
    const sql = translatePipeline([]);
    assert.strictEqual(sql.length, 0);
  });

  it("should combine multiple operations in sequence", () => {
    const steps: TransformationStep[] = [
      {
        id: "1",
        type: "trim",
        config: { type: "trim", columns: ["name"] },
      },
      {
        id: "2",
        type: "uppercase",
        config: { type: "uppercase", columns: ["name"] },
      },
      {
        id: "3",
        type: "deduplicate",
        config: { type: "deduplicate" },
      },
    ];

    const sql = translatePipeline(steps);
    // 1 trim + 1 uppercase + 3 deduplicate = 5 statements
    assert.strictEqual(sql.length, 5);
    assert.ok(sql[0].includes("TRIM"));
    assert.ok(sql[1].includes("UPPER"));
    assert.ok(sql[2].includes("DISTINCT"));
  });
});
