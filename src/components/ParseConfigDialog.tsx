"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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
import { Checkbox } from "@/components/ui/checkbox";

type ParseConfig = {
  sheetName?: string;
  sheetIndex?: number;
  startRow?: number;
  endRow?: number;
  startColumn?: number;
  endColumn?: number;
  hasHeaders: boolean; // Required field
};

interface ParseConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadId: Id<"uploads">;
  mimeType: string;
  currentConfig?: ParseConfig;
  availableSheets?: string[];
  onConfigSaved: () => void;
}

export function ParseConfigDialog({
  open,
  onOpenChange,
  uploadId,
  mimeType,
  currentConfig,
  availableSheets = [],
  onConfigSaved,
}: ParseConfigDialogProps) {
  const updateParseConfig = useMutation(api.uploads.updateParseConfig);
  
  // Form state
  const [sheetName, setSheetName] = useState<string>("");
  const [startRow, setStartRow] = useState<string>("");
  const [endRow, setEndRow] = useState<string>("");
  const [startColumn, setStartColumn] = useState<string>("");
  const [endColumn, setEndColumn] = useState<string>("");
  const [hasHeaders, setHasHeaders] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const isExcel = mimeType.includes("spreadsheet") || mimeType.includes("excel");

  // Initialize form with current config
  useEffect(() => {
    if (open && currentConfig) {
      setSheetName(currentConfig.sheetName || (availableSheets[0] || ""));
      setStartRow(currentConfig.startRow?.toString() || "");
      setEndRow(currentConfig.endRow?.toString() || "");
      setStartColumn(currentConfig.startColumn?.toString() || "");
      setEndColumn(currentConfig.endColumn?.toString() || "");
      setHasHeaders(currentConfig.hasHeaders);
    } else if (open) {
      // Set defaults for new config
      setSheetName(availableSheets[0] || "");
      setStartRow("");
      setEndRow("");
      setStartColumn("");
      setEndColumn("");
      setHasHeaders(true);
    }
  }, [open, currentConfig, availableSheets]);

  const handleReset = () => {
    setSheetName(availableSheets[0] || "");
    setStartRow("");
    setEndRow("");
    setStartColumn("");
    setEndColumn("");
    setHasHeaders(true);
    setError("");
  };

  const validateAndSave = async () => {
    setError("");

    // Build config object
    const config: ParseConfig = {
      hasHeaders,
    };

    // Add sheet info for Excel
    if (isExcel && sheetName) {
      config.sheetName = sheetName;
      config.sheetIndex = availableSheets.indexOf(sheetName);
    }

    // Validate and add row range
    if (startRow) {
      const start = parseInt(startRow);
      if (isNaN(start) || start < 1) {
        setError("Start row must be a number >= 1");
        return;
      }
      config.startRow = start;
    }

    if (endRow) {
      const end = parseInt(endRow);
      if (isNaN(end) || end < 1) {
        setError("End row must be a number >= 1");
        return;
      }
      config.endRow = end;

      if (config.startRow && end < config.startRow) {
        setError("End row must be >= start row");
        return;
      }
    }

    // Validate and add column range
    if (startColumn) {
      const start = parseInt(startColumn);
      if (isNaN(start) || start < 1) {
        setError("Start column must be a number >= 1");
        return;
      }
      config.startColumn = start;
    }

    if (endColumn) {
      const end = parseInt(endColumn);
      if (isNaN(end) || end < 1) {
        setError("End column must be a number >= 1");
        return;
      }
      config.endColumn = end;

      if (config.startColumn && end < config.startColumn) {
        setError("End column must be >= start column");
        return;
      }
    }

    // Save to database
    setSaving(true);
    try {
      await updateParseConfig({
        uploadId,
        parseConfig: {
          sheetName: config.sheetName,
          sheetIndex: config.sheetIndex,
          startRow: config.startRow ?? null,
          endRow: config.endRow ?? null,
          startColumn: config.startColumn ?? null,
          endColumn: config.endColumn ?? null,
          hasHeaders: config.hasHeaders,
        },
      });
      onConfigSaved();
      onOpenChange(false);
    } catch (err) {
      setError(`Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Data Source</DialogTitle>
          <DialogDescription>
            Choose which parts of your file to parse. All fields are optional - leave empty to use defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Excel Sheet Selection */}
          {isExcel && availableSheets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sheet-select">Excel Sheet</Label>
              <Select value={sheetName} onValueChange={setSheetName}>
                <SelectTrigger id="sheet-select">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Which sheet to parse (default: first sheet)
              </p>
            </div>
          )}

          {/* Row Range */}
          <div className="space-y-3">
            <Label>Row Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-row" className="text-xs text-muted-foreground">
                  Start Row (optional)
                </Label>
                <Input
                  id="start-row"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={startRow}
                  onChange={(e) => setStartRow(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-row" className="text-xs text-muted-foreground">
                  End Row (optional)
                </Label>
                <Input
                  id="end-row"
                  type="number"
                  min="1"
                  placeholder="All"
                  value={endRow}
                  onChange={(e) => setEndRow(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to parse all rows. Use start row to skip title rows.
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <div className="font-medium mb-1">Examples:</div>
              <div className="space-y-1 text-muted-foreground">
                <div>• Skip first 3 rows: Start Row = 4</div>
                <div>• Parse rows 10-100: Start = 10, End = 100</div>
              </div>
            </div>
          </div>

          {/* Column Range */}
          <div className="space-y-3">
            <Label>Column Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-column" className="text-xs text-muted-foreground">
                  Start Column (optional)
                </Label>
                <Input
                  id="start-column"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={startColumn}
                  onChange={(e) => setStartColumn(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-column" className="text-xs text-muted-foreground">
                  End Column (optional)
                </Label>
                <Input
                  id="end-column"
                  type="number"
                  min="1"
                  placeholder="All"
                  value={endColumn}
                  onChange={(e) => setEndColumn(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use numbers (1=A, 2=B, etc.). Leave empty to parse all columns.
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <div className="font-medium mb-1">Examples:</div>
              <div className="space-y-1 text-muted-foreground">
                <div>• Columns A-F: Start = 1, End = 6</div>
                <div>• Columns B-H: Start = 2, End = 8</div>
              </div>
            </div>
          </div>

          {/* Headers Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-headers"
                checked={hasHeaders}
                onCheckedChange={(checked) => setHasHeaders(checked === true)}
              />
              <Label htmlFor="has-headers" className="cursor-pointer">
                First row contains column headers
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              If unchecked, columns will be named "Column1", "Column2", etc.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Reset to Defaults
          </Button>
          <Button onClick={validateAndSave} disabled={saving}>
            {saving ? "Saving..." : "Apply Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
