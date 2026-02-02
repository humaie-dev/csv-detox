"use client";

import { useState, useEffect } from "react";
import type { TransformationType, TransformationConfig, TransformationStep } from "@/lib/pipeline/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AddStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStep: (type: TransformationType, config: TransformationConfig) => void;
  onEditStep?: (type: TransformationType, config: TransformationConfig) => void;
  availableColumns: string[];
  editingStep?: TransformationStep | null;
}

export function AddStepDialog({
  open,
  onOpenChange,
  onAddStep,
  onEditStep,
  availableColumns,
  editingStep,
}: AddStepDialogProps) {
  const [selectedOperation, setSelectedOperation] = useState<TransformationType | "">("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

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
      }
    } else if (!open) {
      resetForm();
    }
  }, [editingStep, open]);

  const operations: { value: TransformationType; label: string; description: string }[] = [
    { value: "trim", label: "Trim Whitespace", description: "Remove leading and trailing whitespace" },
    { value: "uppercase", label: "Uppercase", description: "Convert text to uppercase" },
    { value: "lowercase", label: "Lowercase", description: "Convert text to lowercase" },
    { value: "deduplicate", label: "Remove Duplicates", description: "Remove duplicate rows" },
    { value: "filter", label: "Filter Rows", description: "Keep only rows matching a condition" },
    { value: "rename_column", label: "Rename Column", description: "Rename a column" },
    { value: "remove_column", label: "Remove Columns", description: "Remove one or more columns" },
  ];

  const filterOperators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Not Contains" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
  ];

  const resetForm = () => {
    setSelectedOperation("");
    setFormData({});
    setSelectedColumns([]);
    setError("");
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
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
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

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingStep ? "Edit Transformation Step" : "Add Transformation Step"}</DialogTitle>
          <DialogDescription>
            {editingStep ? "Modify the configuration for this transformation" : "Configure a new transformation to apply to your data"}
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
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingStep ? "Save Changes" : "Add Step"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
