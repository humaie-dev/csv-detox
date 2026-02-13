import assert from "node:assert";
import { describe, it } from "node:test";
import {
  getMaxFileSize,
  sanitizeFilename,
  validateFileSize,
  validateFileType,
} from "../validation.js";

describe("sanitizeFilename", () => {
  it("should return normal filename unchanged", () => {
    const result = sanitizeFilename("test.csv");
    assert.strictEqual(result, "test.csv");
  });

  it("should remove path traversal attempts", () => {
    const result = sanitizeFilename("../../etc/passwd");
    // Should extract only the filename, stripping all path components
    assert.strictEqual(result, "passwd");
  });

  it("should remove null bytes", () => {
    const result = sanitizeFilename("test\x00.csv");
    assert.strictEqual(result, "test.csv");
  });

  it("should remove control characters", () => {
    const result = sanitizeFilename("test\x01\x02\x1f.csv");
    assert.strictEqual(result, "test.csv");
  });

  it("should replace special characters with underscores", () => {
    const result = sanitizeFilename("test file@#$.csv");
    assert.strictEqual(result, "test_file___.csv");
  });

  it("should generate default name for empty string", () => {
    const result = sanitizeFilename("");
    assert.match(result, /^upload_\d+$/);
  });

  it("should generate default name for dot files", () => {
    const result = sanitizeFilename(".hidden");
    assert.match(result, /^upload_\d+$/);
  });

  it("should handle Windows path separators", () => {
    const result = sanitizeFilename("C:\\Windows\\test.csv");
    assert.strictEqual(result, "test.csv");
  });

  it("should handle Unix path separators", () => {
    const result = sanitizeFilename("/etc/test.csv");
    assert.strictEqual(result, "test.csv");
  });

  it("should preserve hyphens and underscores", () => {
    const result = sanitizeFilename("test-file_name.csv");
    assert.strictEqual(result, "test-file_name.csv");
  });
});

describe("validateFileType", () => {
  it("should accept CSV with correct MIME type", () => {
    const result = validateFileType("test.csv", "text/csv");
    assert.strictEqual(result, true);
  });

  it("should accept XLSX with correct MIME type", () => {
    const result = validateFileType(
      "test.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.strictEqual(result, true);
  });

  it("should accept XLS with legacy Excel MIME type", () => {
    const result = validateFileType("test.xlsx", "application/vnd.ms-excel");
    assert.strictEqual(result, true);
  });

  it("should reject text file", () => {
    const result = validateFileType("test.txt", "text/plain");
    assert.strictEqual(result, false);
  });

  it("should reject CSV with wrong MIME type", () => {
    const result = validateFileType("test.csv", "application/pdf");
    assert.strictEqual(result, false);
  });

  it("should reject file with no extension", () => {
    const result = validateFileType("test", "text/csv");
    assert.strictEqual(result, false);
  });

  it("should reject file with wrong extension but correct MIME", () => {
    const result = validateFileType("test.pdf", "text/csv");
    assert.strictEqual(result, false);
  });

  it("should be case-insensitive for extensions", () => {
    const result = validateFileType("TEST.CSV", "text/csv");
    assert.strictEqual(result, true);
  });

  it("should reject empty filename", () => {
    const result = validateFileType("", "text/csv");
    assert.strictEqual(result, false);
  });
});

describe("validateFileSize", () => {
  it("should reject 0 bytes", () => {
    const result = validateFileSize(0);
    assert.strictEqual(result, false);
  });

  it("should reject negative size", () => {
    const result = validateFileSize(-1);
    assert.strictEqual(result, false);
  });

  it("should accept 1 byte", () => {
    const result = validateFileSize(1);
    assert.strictEqual(result, true);
  });

  it("should accept 50MB exactly", () => {
    const maxSize = getMaxFileSize();
    const result = validateFileSize(maxSize);
    assert.strictEqual(result, true);
  });

  it("should reject 50MB + 1 byte", () => {
    const maxSize = getMaxFileSize();
    const result = validateFileSize(maxSize + 1);
    assert.strictEqual(result, false);
  });

  it("should accept file in the middle of range", () => {
    const result = validateFileSize(10 * 1024 * 1024); // 10MB
    assert.strictEqual(result, true);
  });
});

describe("getMaxFileSize", () => {
  it("should return 50MB in bytes", () => {
    const result = getMaxFileSize();
    assert.strictEqual(result, 50 * 1024 * 1024);
  });
});
