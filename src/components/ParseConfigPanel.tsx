"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

type ParseConfig = {
  sheetName?: string;
  sheetIndex?: number;
  startRow?: number;
  endRow?: number;
  startColumn?: number;
  endColumn?: number;
  hasHeaders: boolean; // Required field
};

interface ParseConfigPanelProps {
  uploadId: Id<"uploads">;
  mimeType: string;
  currentConfig?: ParseConfig;
  availableSheets?: string[];
  onConfigChanged: () => void;
}

export function ParseConfigPanel({
  uploadId,
  mimeType,
  currentConfig,
  availableSheets = [],
  onConfigChanged,
}: ParseConfigPanelProps) {
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
  const [isOpen, setIsOpen] = useState<boolean>(true); // Collapsible state

  const isExcel = mimeType.includes("spreadsheet") || mimeType.includes("excel");

  // Initialize form with current config
  useEffect(() => {
    if (currentConfig) {
      setSheetName(currentConfig.sheetName || (availableSheets[0] || ""));
      setStartRow(currentConfig.startRow?.toString() || "");
      setEndRow(currentConfig.endRow?.toString() || "");
      setStartColumn(currentConfig.startColumn?.toString() || "");
      setEndColumn(currentConfig.endColumn?.toString() || "");
      setHasHeaders(currentConfig.hasHeaders);
    } else {
      // Set defaults for new config
      setSheetName(availableSheets[0] || "");
      setStartRow("");
      setEndRow("");
      setStartColumn("");
      setEndColumn("");
      setHasHeaders(true);
    }
  }, [currentConfig, availableSheets]);

  const handleReset = async () => {
    setSheetName(availableSheets[0] || "");
    setStartRow("");
    setEndRow("");
    setStartColumn("");
    setEndColumn("");
    setHasHeaders(true);
    setError("");

    // Save the reset config
    await saveConfig({
      hasHeaders: true,
    });
  };

  const saveConfig = async (configOverride?: ParseConfig) => {
    setError("");

    // Build config object
    const config: ParseConfig = configOverride || {
      hasHeaders,
    };

    // If not using override, build from form state
    if (!configOverride) {
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
    }

    // Save to database
    setSaving(true);
    try {
      await updateParseConfig({
        uploadId,
        parseConfig: config,
      });
      onConfigChanged();
    } catch (err) {
      setError(`Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Handler for sheet change
  const handleSheetChange = async (value: string) => {
    setSheetName(value);
    // Auto-save on sheet change
    const config: ParseConfig = {
      hasHeaders,
      sheetName: value,
      sheetIndex: availableSheets.indexOf(value),
    };
    // Include existing row/column ranges if set
    if (startRow) config.startRow = parseInt(startRow);
    if (endRow) config.endRow = parseInt(endRow);
    if (startColumn) config.startColumn = parseInt(startColumn);
    if (endColumn) config.endColumn = parseInt(endColumn);
    await saveConfig(config);
  };

  // Handler for hasHeaders change
  const handleHasHeadersChange = async (checked: boolean) => {
    setHasHeaders(checked);
    // Auto-save on checkbox change - build full config
    const config: ParseConfig = {
      hasHeaders: checked,
    };
    // Include sheet info for Excel
    if (isExcel && sheetName) {
      config.sheetName = sheetName;
      config.sheetIndex = availableSheets.indexOf(sheetName);
    }
    // Include existing row/column ranges if set
    if (startRow) config.startRow = parseInt(startRow);
    if (endRow) config.endRow = parseInt(endRow);
    if (startColumn) config.startColumn = parseInt(startColumn);
    if (endColumn) config.endColumn = parseInt(endColumn);
    await saveConfig(config);
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Source Configuration</CardTitle>
              <CardDescription>
                Configure which parts of your file to parse. Changes apply automatically.
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Excel Sheet Selection */}
            {isExcel && availableSheets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sheet-select">Excel Sheet</Label>
                <Select value={sheetName} onValueChange={handleSheetChange}>
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
                    onBlur={() => saveConfig()}
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
                    onBlur={() => saveConfig()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to parse all rows. Use start row to skip title rows.
              </p>
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
                    onBlur={() => saveConfig()}
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
                    onBlur={() => saveConfig()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use numbers (1=A, 2=B, etc.). Leave empty to parse all columns.
              </p>
            </div>

            {/* Headers Checkbox */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-headers"
                  checked={hasHeaders}
                  onCheckedChange={(checked) => handleHasHeadersChange(checked === true)}
                />
                <Label htmlFor="has-headers" className="cursor-pointer">
                  First row contains column headers
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                If unchecked, columns will be named "Column1", "Column2", etc.
              </p>
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <Button variant="outline" onClick={handleReset} disabled={saving} size="sm">
                Reset to Defaults
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Saving Indicator */}
            {saving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                <span>Saving configuration...</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
