import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIntent } from "@/lib/assistant/intent";

describe("assistant intent parser", () => {
  it("parses simple sort by one column desc", () => {
    const p = parseIntent("sort by date desc");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.type, "sort");
    assert.equal(cfg.columns.length, 1);
    assert.deepEqual(cfg.columns[0], { name: "date", direction: "desc" });
  });

  it("parses multi-column sort with then by and nulls last", () => {
    const p = parseIntent("sort by department asc then by salary desc, nulls last");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.columns.length, 2);
    assert.deepEqual(cfg.columns[0], { name: "department", direction: "asc" });
    assert.deepEqual(cfg.columns[1], { name: "salary", direction: "desc" });
    assert.equal(cfg.nullsPosition, "last");
  });

  it("parses remove columns with commas and and", () => {
    const p = parseIntent("remove columns notes, internal id and temp");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.type, "remove_column");
    assert.deepEqual(cfg.columns, ["notes", "internal id", "temp"]);
  });

  it("parses rename column", () => {
    const p = parseIntent("rename amount to total_amount");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.type, "rename_column");
    assert.equal(cfg.oldName, "amount");
    assert.equal(cfg.newName, "total_amount");
  });

  it("parses deduplicate by specific columns", () => {
    const p = parseIntent("deduplicate by id, date");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.type, "deduplicate");
    assert.deepEqual(cfg.columns, ["id", "date"]);
  });

  it("parses keep rows where filter", () => {
    const p = parseIntent("keep rows where age > 21");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.type, "filter");
    assert.equal(cfg.column, "age");
    assert.equal(cfg.operator, "greater_than");
    assert.equal(cfg.value, 21);
  });

  it("parses remove rows where contains (inverted)", () => {
    const p = parseIntent("remove rows where status contains draft");
    assert.equal(p.kind, "add_step");
    if (p.kind !== "add_step") return;
    const cfg = p.step.config as any;
    assert.equal(cfg.type, "filter");
    assert.equal(cfg.operator, "not_contains");
  });

  it("parses reorder move step commands", () => {
    const p1 = parseIntent("move step 3 up");
    assert.equal(p1.kind, "reorder_steps");
    if (p1.kind === "reorder_steps") {
      assert.equal(p1.from, 2);
      assert.equal(p1.to, 1);
    }
    const p2 = parseIntent("move step 2 below 4");
    assert.equal(p2.kind, "reorder_steps");
    if (p2.kind === "reorder_steps") {
      assert.equal(p2.from, 1);
      assert.equal(p2.to, 4 - 1 + 1); // below 4 -> index 4 (0-based)
    }
  });

  it("parses parse-config updates", () => {
    const p1 = parseIntent("set sheet Transactions");
    assert.equal(p1.kind, "update_parse_config");
    if (p1.kind === "update_parse_config") {
      assert.equal(p1.changes.sheetName, "Transactions");
    }
    const p2 = parseIntent("rows 10-500");
    assert.equal(p2.kind, "update_parse_config");
    if (p2.kind === "update_parse_config") {
      assert.equal(p2.changes.startRow, 10);
      assert.equal(p2.changes.endRow, 500);
    }
    const p3 = parseIntent("columns 2-10");
    assert.equal(p3.kind, "update_parse_config");
    if (p3.kind === "update_parse_config") {
      assert.equal(p3.changes.startColumn, 2);
      assert.equal(p3.changes.endColumn, 10);
    }
    const p4 = parseIntent("has headers false");
    assert.equal(p4.kind, "update_parse_config");
    if (p4.kind === "update_parse_config") {
      assert.equal(p4.changes.hasHeaders, false);
    }
  });

  it("returns clarify for unrecognized input", () => {
    const p = parseIntent("do the thing");
    assert.equal(p.kind, "clarify");
  });
});
