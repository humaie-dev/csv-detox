"use client";

import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ValidationResult } from "@/lib/pipeline/casting/validate";
import type {
  TransformationConfig,
  TransformationStep,
  TransformationType,
} from "@/lib/pipeline/types";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface AddStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStep: (type: TransformationType, config: TransformationConfig) => void;
  onEditStep?: (type: TransformationType, config: TransformationConfig) => void;
  availableColumns: string[];
  editingStep?: TransformationStep | null;
  uploadId?: Id<"uploads">; // For validation preview
}

export function AddStepDialog({
  open,
  onOpenChange,
  onAddStep,
  onEditStep,
  availableColumns,
  editingStep,
  uploadId,
}: AddStepDialogProps) {
  const [selectedOperation, setSelectedOperation] = useState<TransformationType | "">("");
  // TODO: Replace Record<string, any> with proper discriminated union based on TransformationType
  // This requires creating a FormData type that matches each transformation config shape
  // For now, `any` exception is allowed in biome.json for this file due to dynamic form complexity
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  // Validation preview state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const validateCastAction = useAction(api.parsers.validateCast);

  const resetForm = () => {
    setSelectedOperation("");
    setFormData({});
    setSelectedColumns([]);
    setError("");
    setValidationResult(null);
  };

  // Populate form when editing a step
  useEffect(() => {
    if (editingStep && open) {
      setSelectedOperation(editingStep.type);
      const config = editingStep.config;

      // Set form data based on operation type
      switch (config.type) {
        case "trim":
        case "uppercase":
        case "lowercase":
        case "remove_column":
          setSelectedColumns(config.columns);
          break;

        case "deduplicate":
          setSelectedColumns(config.columns || []);
          break;

        case "filter":
          setFormData({
            column: config.column,
            operator: config.operator,
            value: config.value,
          });
          break;

        case "rename_column":
          setFormData({
            oldName: config.oldName,
            newName: config.newName,
          });
          break;

        case "cast_column":
          setFormData({
            column: config.column,
            targetType: config.targetType,
            onError: config.onError,
            format: config.format,
          });
          break;

        case "unpivot":
          setSelectedColumns(config.idColumns);
          setFormData({
            valueColumns: config.valueColumns,
            variableColumnName: config.variableColumnName,
            valueColumnName: config.valueColumnName,
          });
          break;

        case "pivot":
          setSelectedColumns(config.indexColumns);
          setFormData({
            columnSource: config.columnSource,
            valueSource: config.valueSource,
            aggregation: config.aggregation || "last",
          });
          break;

        case "split_column":
          setFormData({
            column: config.column,
            method: config.method,
            delimiter: config.delimiter,
            positions: config.positions,
            pattern: config.pattern,
            newColumns: config.newColumns,
            trim: config.trim !== false, // Default true
            keepOriginal: config.keepOriginal || false,
            maxSplits: config.maxSplits,
          });
          break;

        case "merge_columns":
          setSelectedColumns(config.columns);
          setFormData({
            separator: config.separator,
            newColumn: config.newColumn,
            skipNull: config.skipNull !== false, // Default true
            keepOriginal: config.keepOriginal || false,
          });
          break;

        case "fill_down":
          setSelectedColumns(config.columns || []);
          setFormData({ treatWhitespaceAsEmpty: config.treatWhitespaceAsEmpty });
          break;

        case "fill_across":
          setSelectedColumns(config.columns || []);
          setFormData({ treatWhitespaceAsEmpty: config.treatWhitespaceAsEmpty });
          break;

        case "sort":
          setFormData({
            sortColumns: config.columns || [],
            nullsPosition: config.nullsPosition || "last",
          });
          break;
      }
    } else if (!open) {
      resetForm();
    }
  }, [editingStep, open, resetForm]);

  const operations: { value: TransformationType; label: string; description: string }[] = [
    {
      value: "trim",
      label: "Trim Whitespace",
      description: "Remove leading and trailing whitespace",
    },
    { value: "uppercase", label: "Uppercase", description: "Convert text to uppercase" },
    { value: "lowercase", label: "Lowercase", description: "Convert text to lowercase" },
    { value: "deduplicate", label: "Remove Duplicates", description: "Remove duplicate rows" },
    { value: "filter", label: "Filter Rows", description: "Keep only rows matching a condition" },
    { value: "rename_column", label: "Rename Column", description: "Rename a column" },
    { value: "remove_column", label: "Remove Columns", description: "Remove one or more columns" },
    {
      value: "cast_column",
      label: "Cast Column Type",
      description: "Convert column values to a different data type",
    },
    {
      value: "unpivot",
      label: "Unpivot (Wide → Long)",
      description: "Convert columns into rows (normalize data)",
    },
    {
      value: "pivot",
      label: "Pivot (Long → Wide)",
      description: "Convert rows into columns (create crosstab)",
    },
    {
      value: "split_column",
      label: "Split Column",
      description: "Split one column into multiple columns",
    },
    {
      value: "merge_columns",
      label: "Merge Columns",
      description: "Combine multiple columns into one",
    },
    {
      value: "fill_down",
      label: "Fill Down",
      description: "Fill empty cells with value from above",
    },
    {
      value: "fill_across",
      label: "Fill Across",
      description: "Fill empty cells with value from left",
    },
    { value: "sort", label: "Sort", description: "Sort rows by one or more columns" },
  ];

  const filterOperators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Not Contains" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
  ];

  // Handle validation preview for cast_column
  const handleValidate = async () => {
    if (!uploadId) {
      setError("Upload ID is required for validation");
      return;
    }

    if (!formData.column) {
      setError("Please select a column to cast");
      return;
    }

    if (!formData.targetType) {
      setError("Please select a target type");
      return;
    }

    setValidationLoading(true);
    setError("");

    try {
      const result = await validateCastAction({
        uploadId,
        column: formData.column,
        targetType: formData.targetType as "string" | "number" | "boolean" | "date",
        format: formData.format,
      });
      setValidationResult(result);
    } catch (err) {
      setError(`Validation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleSubmit = () => {
    setError("");

    if (!selectedOperation) {
      setError("Please select an operation");
      return;
    }

    try {
      let config: TransformationConfig;

      switch (selectedOperation) {
        case "trim":
        case "uppercase":
        case "lowercase":
          if (selectedColumns.length === 0) {
            setError("Please select at least one column");
            return;
          }
          config = { type: selectedOperation, columns: selectedColumns };
          break;

        case "deduplicate":
          config = {
            type: "deduplicate",
            columns: selectedColumns.length > 0 ? selectedColumns : undefined,
          };
          break;

        case "filter":
          if (!formData.column) {
            setError("Please select a column");
            return;
          }
          if (!formData.operator) {
            setError("Please select an operator");
            return;
          }
          if (formData.value === undefined || formData.value === "") {
            setError("Please enter a value");
            return;
          }
          config = {
            type: "filter",
            column: formData.column,
            operator: formData.operator,
            value: formData.value,
          };
          break;

        case "rename_column":
          if (!formData.oldName) {
            setError("Please enter the current column name");
            return;
          }
          if (!formData.newName) {
            setError("Please enter the new column name");
            return;
          }
          config = {
            type: "rename_column",
            oldName: formData.oldName,
            newName: formData.newName,
          };
          break;

        case "remove_column":
          if (selectedColumns.length === 0) {
            setError("Please select at least one column");
            return;
          }
          config = { type: "remove_column", columns: selectedColumns };
          break;

        case "cast_column":
          if (!formData.column) {
            setError("Please select a column");
            return;
          }
          if (!formData.targetType) {
            setError("Please select a target type");
            return;
          }
          if (!formData.onError) {
            setError("Please select an error handling mode");
            return;
          }
          config = {
            type: "cast_column",
            column: formData.column,
            targetType: formData.targetType,
            onError: formData.onError,
            format: formData.format || undefined,
          };
          break;

        case "unpivot":
          if (selectedColumns.length === 0) {
            setError("Please select at least one ID column");
            return;
          }
          if (!formData.valueColumns || formData.valueColumns.length === 0) {
            setError("Please select at least one value column");
            return;
          }
          if (!formData.variableColumnName) {
            setError("Please enter a variable column name");
            return;
          }
          if (!formData.valueColumnName) {
            setError("Please enter a value column name");
            return;
          }
          config = {
            type: "unpivot",
            idColumns: selectedColumns,
            valueColumns: formData.valueColumns,
            variableColumnName: formData.variableColumnName,
            valueColumnName: formData.valueColumnName,
          };
          break;

        case "pivot":
          if (selectedColumns.length === 0) {
            setError("Please select at least one index column");
            return;
          }
          if (!formData.columnSource) {
            setError("Please select a column source");
            return;
          }
          if (!formData.valueSource) {
            setError("Please select a value source");
            return;
          }
          config = {
            type: "pivot",
            indexColumns: selectedColumns,
            columnSource: formData.columnSource,
            valueSource: formData.valueSource,
            aggregation: formData.aggregation,
          };
          break;

        case "split_column": {
          if (!formData.column) {
            setError("Please select a column to split");
            return;
          }
          if (!formData.method) {
            setError("Please select a split method");
            return;
          }
          if (formData.method === "delimiter" && !formData.delimiter) {
            setError("Please enter a delimiter");
            return;
          }

          // Parse positions if it's a string
          let positions: number[] | undefined;
          if (formData.method === "position") {
            positions =
              typeof formData.positions === "string"
                ? formData.positions
                    .split(",")
                    .map((p) => parseInt(p.trim(), 10))
                    .filter((p) => !Number.isNaN(p))
                : formData.positions;

            if (!positions || positions.length === 0) {
              setError("Please enter positions");
              return;
            }
          }

          if (formData.method === "regex" && !formData.pattern) {
            setError("Please enter a regex pattern");
            return;
          }

          // Parse newColumns if it's a string
          const newColumns =
            typeof formData.newColumns === "string"
              ? formData.newColumns
                  .split(",")
                  .map((c) => c.trim())
                  .filter((c) => c)
              : formData.newColumns || [];

          if (newColumns.length === 0) {
            setError("Please specify at least one new column name");
            return;
          }
          config = {
            type: "split_column",
            column: formData.column,
            method: formData.method,
            delimiter: formData.delimiter,
            positions: positions,
            pattern: formData.pattern,
            newColumns: newColumns,
            trim: formData.trim,
            keepOriginal: formData.keepOriginal,
            maxSplits: formData.maxSplits,
          };
          break;
        }

        case "merge_columns":
          if (selectedColumns.length === 0) {
            setError("Please select at least one column to merge");
            return;
          }
          if (!formData.separator && formData.separator !== "") {
            setError("Please enter a separator");
            return;
          }
          if (!formData.newColumn) {
            setError("Please enter a new column name");
            return;
          }
          config = {
            type: "merge_columns",
            columns: selectedColumns,
            separator: formData.separator,
            newColumn: formData.newColumn,
            skipNull: formData.skipNull,
            keepOriginal: formData.keepOriginal,
          };
          break;

        case "fill_down":
          if (selectedColumns.length === 0) {
            setError("Please select at least one column");
            return;
          }
          config = {
            type: "fill_down",
            columns: selectedColumns,
            treatWhitespaceAsEmpty: formData.treatWhitespaceAsEmpty || false,
          };
          break;

        case "fill_across":
          if (selectedColumns.length === 0) {
            setError("Please select at least one column");
            return;
          }
          config = {
            type: "fill_across",
            columns: selectedColumns,
            treatWhitespaceAsEmpty: formData.treatWhitespaceAsEmpty || false,
          };
          break;

        case "sort":
          if (!formData.sortColumns || formData.sortColumns.length === 0) {
            setError("Please add at least one sort column");
            return;
          }
          config = {
            type: "sort",
            columns: formData.sortColumns,
            nullsPosition: formData.nullsPosition || "last",
          };
          break;

        default:
          setError("Invalid operation");
          return;
      }

      // Call appropriate handler based on mode
      if (editingStep && onEditStep) {
        onEditStep(selectedOperation, config);
      } else {
        onAddStep(selectedOperation, config);
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column],
    );
  };

  const renderOperationForm = () => {
    if (!selectedOperation) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Select an operation to configure</p>
        </div>
      );
    }

    switch (selectedOperation) {
      case "trim":
      case "uppercase":
      case "lowercase":
        return (
          <div className="space-y-4">
            {selectedOperation === "trim" && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
                <div className="font-semibold mb-1 text-foreground">Example:</div>
                <div className="text-muted-foreground">
                  <div>Input: " hello " → Output: "hello"</div>
                </div>
              </div>
            )}
            {selectedOperation === "uppercase" && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
                <div className="font-semibold mb-1 text-foreground">Example:</div>
                <div className="text-muted-foreground">
                  <div>Input: "hello" → Output: "HELLO"</div>
                </div>
              </div>
            )}
            {selectedOperation === "lowercase" && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
                <div className="font-semibold mb-1 text-foreground">Example:</div>
                <div className="text-muted-foreground">
                  <div>Input: "HELLO" → Output: "hello"</div>
                </div>
              </div>
            )}
            <div>
              <Label>Select Columns</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which columns to apply this transformation to
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "deduplicate":
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div>Removes duplicate rows, keeping only the first occurrence</div>
              </div>
            </div>
            <div>
              <Label>Select Columns (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Leave empty to check all columns, or select specific columns to identify duplicates
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "filter":
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div>Keep only rows where Age &gt; 18</div>
                <div>or City contains "New York"</div>
              </div>
            </div>
            <div>
              <Label htmlFor="filter-column">Column</Label>
              <Select
                value={formData.column || ""}
                onValueChange={(value) => setFormData({ ...formData, column: value })}
              >
                <SelectTrigger id="filter-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-operator">Operator</Label>
              <Select
                value={formData.operator || ""}
                onValueChange={(value) => setFormData({ ...formData, operator: value })}
              >
                <SelectTrigger id="filter-operator">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {filterOperators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-value">Value</Label>
              <Input
                id="filter-value"
                placeholder="Enter value"
                value={formData.value || ""}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
          </div>
        );

      case "rename_column":
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div>Rename "email_address" → "Email"</div>
              </div>
            </div>
            <div>
              <Label htmlFor="old-name">Current Column Name</Label>
              <Select
                value={formData.oldName || ""}
                onValueChange={(value) => setFormData({ ...formData, oldName: value })}
              >
                <SelectTrigger id="old-name">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-name">New Column Name</Label>
              <Input
                id="new-name"
                placeholder="Enter new name"
                value={formData.newName || ""}
                onChange={(e) => setFormData({ ...formData, newName: e.target.value })}
              />
            </div>
          </div>
        );

      case "remove_column":
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div>Remove unwanted columns from your dataset</div>
              </div>
            </div>
            <div>
              <Label>Select Columns to Remove</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which columns to remove from the dataset
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "cast_column":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div>Convert "age" from text → number</div>
                <div>Convert "active" from text → boolean</div>
                <div>Convert "created_at" from text → date</div>
              </div>
            </div>

            <div>
              <Label htmlFor="cast-column">Column to Cast</Label>
              <Select
                value={formData.column || ""}
                onValueChange={(value) => setFormData({ ...formData, column: value })}
              >
                <SelectTrigger id="cast-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target-type">Target Type</Label>
              <Select
                value={formData.targetType || ""}
                onValueChange={(value) => setFormData({ ...formData, targetType: value })}
              >
                <SelectTrigger id="target-type">
                  <SelectValue placeholder="Select target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String (Text)</SelectItem>
                  <SelectItem value="number">Number (Integer or Decimal)</SelectItem>
                  <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="on-error">Error Handling</Label>
              <Select
                value={formData.onError || ""}
                onValueChange={(value) => setFormData({ ...formData, onError: value })}
              >
                <SelectTrigger id="on-error">
                  <SelectValue placeholder="Select error handling mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fail">
                    <div>
                      <div className="font-medium">Fail</div>
                      <div className="text-xs text-muted-foreground">
                        Stop immediately on first error
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="null">
                    <div>
                      <div className="font-medium">Set to Null</div>
                      <div className="text-xs text-muted-foreground">
                        Replace invalid values with null
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="skip">
                    <div>
                      <div className="font-medium">Skip Row</div>
                      <div className="text-xs text-muted-foreground">
                        Remove rows with invalid values
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                How to handle values that cannot be converted to the target type
              </p>
            </div>

            {formData.targetType === "date" && (
              <div>
                <Label htmlFor="format">Date Format (Optional)</Label>
                <Input
                  id="format"
                  placeholder="e.g., YYYY-MM-DD or MM/DD/YYYY"
                  value={formData.format || ""}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for automatic detection of common formats
                </p>
              </div>
            )}

            {/* Validation Preview */}
            {uploadId && formData.column && formData.targetType && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleValidate}
                    disabled={validationLoading}
                  >
                    {validationLoading ? (
                      <>
                        <Spinner className="size-3 mr-2" />
                        Validating...
                      </>
                    ) : (
                      "Preview Cast Validation"
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">Validates first 500 rows</span>
                </div>

                {validationResult && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Validation Results</span>
                      <span className="text-xs text-muted-foreground">
                        Sampled {validationResult.total} rows
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded bg-green-50 dark:bg-green-950 p-2">
                        <div className="text-xs text-muted-foreground">Valid</div>
                        <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                          {validationResult.valid}
                        </div>
                      </div>
                      <div className="rounded bg-red-50 dark:bg-red-950 p-2">
                        <div className="text-xs text-muted-foreground">Invalid</div>
                        <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                          {validationResult.invalid}
                        </div>
                      </div>
                    </div>

                    {validationResult.invalid > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          Failure rate: {validationResult.failureRate.toFixed(1)}%
                        </div>

                        {validationResult.recommendedMode && (
                          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2 text-sm">
                            <span className="font-medium">Recommended mode:</span>{" "}
                            <span className="font-mono">{validationResult.recommendedMode}</span>
                          </div>
                        )}

                        {validationResult.invalidSamples &&
                          validationResult.invalidSamples.length > 0 && (
                            <div className="text-xs">
                              <div className="font-medium mb-1">Sample invalid values:</div>
                              <div className="rounded bg-muted p-2 space-y-1 font-mono max-h-32 overflow-y-auto">
                                {validationResult.invalidSamples.map((sample: any, idx: number) => (
                                  <div key={idx} className="text-xs">
                                    <span className="text-red-600 dark:text-red-400">
                                      {JSON.stringify(sample.value)}
                                    </span>
                                    {" → "}
                                    <span className="text-muted-foreground">{sample.error}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}

                    {validationResult.invalid === 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        ✓ All values can be successfully cast to {formData.targetType}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "unpivot":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Input: Name: "Alice", Jan: 100, Feb: 200</div>
                <div>Output: Name: "Alice", Month: "Jan", Sales: 100</div>
                <div className="ml-16">Name: "Alice", Month: "Feb", Sales: 200</div>
              </div>
            </div>

            <div>
              <Label>ID Columns (keep as-is)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select columns to preserve (e.g., Name, ID, Region)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Value Columns (unpivot)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select columns to convert into rows (e.g., Jan, Feb, Mar)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns
                  .filter((col) => !selectedColumns.includes(col))
                  .map((col) => (
                    <Badge
                      key={col}
                      variant={(formData.valueColumns || []).includes(col) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = formData.valueColumns || [];
                        setFormData({
                          ...formData,
                          valueColumns: current.includes(col)
                            ? current.filter((c: string) => c !== col)
                            : [...current, col],
                        });
                      }}
                    >
                      {col}
                    </Badge>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variable-column-name">Variable Column Name</Label>
                <Input
                  id="variable-column-name"
                  placeholder="e.g., Month"
                  value={formData.variableColumnName || ""}
                  onChange={(e) => setFormData({ ...formData, variableColumnName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Name for column containing original column names
                </p>
              </div>
              <div>
                <Label htmlFor="value-column-name">Value Column Name</Label>
                <Input
                  id="value-column-name"
                  placeholder="e.g., Sales"
                  value={formData.valueColumnName || ""}
                  onChange={(e) => setFormData({ ...formData, valueColumnName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Name for column containing values
                </p>
              </div>
            </div>
          </div>
        );

      case "pivot":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Input: Name: "Alice", Month: "Jan", Sales: 100</div>
                <div className="ml-16">Name: "Alice", Month: "Feb", Sales: 200</div>
                <div>Output: Name: "Alice", Jan: 100, Feb: 200</div>
              </div>
            </div>

            <div>
              <Label>Index Columns (group by)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select columns to group rows by (e.g., Name, Region)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="column-source">Column Source</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Column containing values that will become new column names
              </p>
              <Select
                value={formData.columnSource || ""}
                onValueChange={(value) => setFormData({ ...formData, columnSource: value })}
              >
                <SelectTrigger id="column-source">
                  <SelectValue placeholder="Select column (e.g., Month)" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns
                    .filter((col) => !selectedColumns.includes(col))
                    .map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value-source">Value Source</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Column containing values to fill the new columns
              </p>
              <Select
                value={formData.valueSource || ""}
                onValueChange={(value) => setFormData({ ...formData, valueSource: value })}
              >
                <SelectTrigger id="value-source">
                  <SelectValue placeholder="Select column (e.g., Sales)" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns
                    .filter(
                      (col) => !selectedColumns.includes(col) && col !== formData.columnSource,
                    )
                    .map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aggregation">Aggregation (for duplicates)</Label>
              <Select
                value={formData.aggregation || "last"}
                onValueChange={(value) => setFormData({ ...formData, aggregation: value })}
              >
                <SelectTrigger id="aggregation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First</SelectItem>
                  <SelectItem value="last">Last (default)</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="mean">Mean</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "split_column":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example (delimiter):</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Input: Name: "John Doe"</div>
                <div>Output: FirstName: "John", LastName: "Doe"</div>
              </div>
            </div>

            <div>
              <Label htmlFor="split-column">Column to Split</Label>
              <Select
                value={formData.column || ""}
                onValueChange={(value) => setFormData({ ...formData, column: value })}
              >
                <SelectTrigger id="split-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="split-method">Split Method</Label>
              <Select
                value={formData.method || ""}
                onValueChange={(value) => setFormData({ ...formData, method: value })}
              >
                <SelectTrigger id="split-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delimiter">Delimiter</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.method === "delimiter" && (
              <div>
                <Label htmlFor="delimiter">Delimiter</Label>
                <Input
                  id="delimiter"
                  placeholder='e.g., " " (space), "," (comma)'
                  value={formData.delimiter || ""}
                  onChange={(e) => setFormData({ ...formData, delimiter: e.target.value })}
                />
              </div>
            )}

            {formData.method === "position" && (
              <div>
                <Label htmlFor="positions">Positions (comma-separated)</Label>
                <Input
                  id="positions"
                  placeholder="e.g., 0,3,6"
                  value={
                    typeof formData.positions === "string"
                      ? formData.positions
                      : (formData.positions || []).join(",")
                  }
                  onChange={(e) => {
                    setFormData({ ...formData, positions: e.target.value });
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Character positions to split at
                </p>
              </div>
            )}

            {formData.method === "regex" && (
              <div>
                <Label htmlFor="pattern">Regex Pattern</Label>
                <Input
                  id="pattern"
                  placeholder='e.g., "[,;]" (comma or semicolon)'
                  value={formData.pattern || ""}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="new-columns">New Column Names (comma-separated)</Label>
              <Input
                id="new-columns"
                placeholder="e.g., FirstName,LastName"
                value={
                  typeof formData.newColumns === "string"
                    ? formData.newColumns
                    : (formData.newColumns || []).join(",")
                }
                onChange={(e) => {
                  setFormData({ ...formData, newColumns: e.target.value });
                }}
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.trim !== false}
                  onChange={(e) => setFormData({ ...formData, trim: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Trim whitespace</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.keepOriginal || false}
                  onChange={(e) => setFormData({ ...formData, keepOriginal: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Keep original column</span>
              </label>
            </div>
          </div>
        );

      case "merge_columns":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Input: FirstName: "John", LastName: "Doe"</div>
                <div>Output: FullName: "John Doe"</div>
              </div>
            </div>

            <div>
              <Label>Columns to Merge</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select columns to combine (in order)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="separator">Separator</Label>
              <Input
                id="separator"
                placeholder='e.g., " " (space), "-", ", "'
                value={formData.separator || ""}
                onChange={(e) => setFormData({ ...formData, separator: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="new-column">New Column Name</Label>
              <Input
                id="new-column"
                placeholder="e.g., FullName"
                value={formData.newColumn || ""}
                onChange={(e) => setFormData({ ...formData, newColumn: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.skipNull !== false}
                  onChange={(e) => setFormData({ ...formData, skipNull: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Skip null values</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.keepOriginal || false}
                  onChange={(e) => setFormData({ ...formData, keepOriginal: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Keep original columns</span>
              </label>
            </div>
          </div>
        );

      case "fill_down":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Input: Product: "Apple", Measure: "Sales"</div>
                <div className="ml-16">Product: "", Measure: "Cost"</div>
                <div>Output: Product: "Apple", Measure: "Sales"</div>
                <div className="ml-16">Product: "Apple", Measure: "Cost"</div>
              </div>
            </div>

            <div>
              <Label>Columns to Fill Down</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Fill empty cells with the last non-empty value from above (vertical)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="treatWhitespace-down"
                checked={formData.treatWhitespaceAsEmpty || false}
                onChange={(e) =>
                  setFormData({ ...formData, treatWhitespaceAsEmpty: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="treatWhitespace-down" className="cursor-pointer">
                Treat whitespace-only cells as empty
              </Label>
            </div>
          </div>
        );

      case "fill_across":
        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Input: Q1: "100", Q2: "", Q3: "300"</div>
                <div>Output: Q1: "100", Q2: "100", Q3: "300"</div>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-xs">
              <div className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                ⚠️ Order Matters
              </div>
              <div className="text-yellow-700 dark:text-yellow-400">
                Columns are filled left to right in the order you select them
              </div>
            </div>

            <div>
              <Label>Columns to Fill Across</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Fill empty cells with the last non-empty value from left (horizontal)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <Badge
                    key={col}
                    variant={selectedColumns.includes(col) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                    {selectedColumns.includes(col) && (
                      <span className="ml-1 text-xs">({selectedColumns.indexOf(col) + 1})</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="treatWhitespace-across"
                checked={formData.treatWhitespaceAsEmpty || false}
                onChange={(e) =>
                  setFormData({ ...formData, treatWhitespaceAsEmpty: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="treatWhitespace-across" className="cursor-pointer">
                Treat whitespace-only cells as empty
              </Label>
            </div>
          </div>
        );

      case "sort": {
        const sortColumns = formData.sortColumns || [];

        const addSortColumn = () => {
          const newCol = { name: availableColumns[0] || "", direction: "asc" as "asc" | "desc" };
          setFormData({ ...formData, sortColumns: [...sortColumns, newCol] });
        };

        const removeSortColumn = (index: number) => {
          const updated = sortColumns.filter((_: any, i: number) => i !== index);
          setFormData({ ...formData, sortColumns: updated });
        };

        const updateSortColumn = (index: number, field: string, value: any) => {
          const updated = [...sortColumns];
          updated[index] = { ...updated[index], [field]: value };
          setFormData({ ...formData, sortColumns: updated });
        };

        const moveSortColumn = (index: number, direction: "up" | "down") => {
          if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === sortColumns.length - 1)
          ) {
            return;
          }
          const updated = [...sortColumns];
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
          setFormData({ ...formData, sortColumns: updated });
        };

        return (
          <div className="space-y-4">
            {/* Example */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono">
              <div className="font-semibold mb-1 text-foreground">Example:</div>
              <div className="text-muted-foreground">
                <div className="mb-1">Sort by Department (A→Z), then by Salary (high→low)</div>
                <div>First column is primary sort key</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sort By</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSortColumn}
                  disabled={!availableColumns.length}
                >
                  + Add Column
                </Button>
              </div>

              {sortColumns.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border-2 border-dashed rounded-lg text-center">
                  Click "Add Column" to add sort criteria
                </div>
              ) : (
                <div className="space-y-2">
                  {sortColumns.map((sortCol: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <span className="text-xs text-muted-foreground w-6">[{index + 1}]</span>

                      <select
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={sortCol.name}
                        onChange={(e) => updateSortColumn(index, "name", e.target.value)}
                      >
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>

                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={sortCol.direction}
                        onChange={(e) => updateSortColumn(index, "direction", e.target.value)}
                      >
                        <option value="asc">Ascending (A→Z, 1→9)</option>
                        <option value="desc">Descending (Z→A, 9→1)</option>
                      </select>

                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSortColumn(index, "up")}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSortColumn(index, "down")}
                          disabled={index === sortColumns.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSortColumn(index)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Null Values</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nullsPosition"
                    value="last"
                    checked={(formData.nullsPosition || "last") === "last"}
                    onChange={(e) => setFormData({ ...formData, nullsPosition: e.target.value })}
                    className="rounded-full"
                  />
                  <span className="text-sm">Place nulls last (default)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nullsPosition"
                    value="first"
                    checked={formData.nullsPosition === "first"}
                    onChange={(e) => setFormData({ ...formData, nullsPosition: e.target.value })}
                    className="rounded-full"
                  />
                  <span className="text-sm">Place nulls first</span>
                </label>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingStep ? "Edit Transformation Step" : "Add Transformation Step"}
          </DialogTitle>
          <DialogDescription>
            {editingStep
              ? "Modify the configuration for this transformation"
              : "Configure a new transformation to apply to your data"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Operation Selector */}
          <div>
            <Label htmlFor="operation">Operation Type</Label>
            <Select
              value={selectedOperation}
              onValueChange={(value) => {
                setSelectedOperation(value as TransformationType);
                setFormData({});
                setSelectedColumns([]);
                setError("");
              }}
              disabled={!!editingStep}
            >
              <SelectTrigger id="operation">
                <SelectValue placeholder="Select an operation" />
              </SelectTrigger>
              <SelectContent>
                {operations.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    <div>
                      <div className="font-medium">{op.label}</div>
                      <div className="text-xs text-muted-foreground">{op.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Form */}
          {renderOperationForm()}

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingStep ? "Save Changes" : "Add Step"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
