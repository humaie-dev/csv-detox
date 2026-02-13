"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface ParseConfig {
  sheetName?: string;
  sheetIndex?: number;
  startRow?: number;
  endRow?: number;
  startColumn?: number;
  endColumn?: number;
  hasHeaders: boolean;
}

interface PipelineSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ParseConfig) => void;
  currentConfig?: ParseConfig | null;
  isExcelFile?: boolean;
  projectId: string;
}

export function PipelineSettingsDialog({
  open,
  onOpenChange,
  onSave,
  currentConfig,
  isExcelFile = false,
  projectId,
}: PipelineSettingsDialogProps) {
  const [config, setConfig] = useState<ParseConfig>({
    hasHeaders: true,
  });
  const [sheets, setSheets] = useState<string[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);

  const fetchSheetNames = useCallback(async () => {
    setLoadingSheets(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sheets`);
      if (response.ok) {
        const data = await response.json();
        setSheets(data.sheets || []);
      }
    } catch (error) {
      console.error("Failed to fetch sheet names:", error);
    } finally {
      setLoadingSheets(false);
    }
  }, [projectId]);

  // Fetch sheet names when dialog opens for Excel files
  useEffect(() => {
    if (open && isExcelFile) {
      fetchSheetNames();
    }
  }, [open, isExcelFile, fetchSheetNames]);

  useEffect(() => {
    if (open) {
      if (currentConfig) {
        setConfig(currentConfig);
      } else {
        // Reset to defaults
        setConfig({
          hasHeaders: true,
        });
      }
    }
  }, [open, currentConfig]);

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  const handleClear = (field: keyof ParseConfig) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      delete newConfig[field];
      return newConfig;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pipeline Settings</DialogTitle>
          <DialogDescription>
            Configure how this pipeline reads data from the file. Leave blank to use default
            settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Headers */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasHeaders"
              checked={config.hasHeaders}
              onCheckedChange={(checked) => setConfig({ ...config, hasHeaders: checked === true })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="hasHeaders"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                First row contains headers
              </Label>
              <p className="text-xs text-muted-foreground">Use first row as column names</p>
            </div>
          </div>

          {/* Excel Sheet Selection */}
          {isExcelFile && (
            <div className="space-y-2">
              <Label htmlFor="sheetName">Select Sheet</Label>
              {loadingSheets ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Spinner className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Loading sheets...</span>
                </div>
              ) : sheets.length > 0 ? (
                <Select
                  value={config.sheetName || sheets[0]}
                  onValueChange={(value) =>
                    setConfig({ ...config, sheetName: value, sheetIndex: undefined })
                  }
                >
                  <SelectTrigger id="sheetName">
                    <SelectValue placeholder="Select a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet, index) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet} {index === 0 && "(default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="sheetName"
                  placeholder="e.g., Sheet1"
                  value={config.sheetName || ""}
                  onChange={(e) => setConfig({ ...config, sheetName: e.target.value || undefined })}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {sheets.length > 0
                  ? `${sheets.length} sheet${sheets.length > 1 ? "s" : ""} available`
                  : "Select which sheet to read from this Excel file"}
              </p>
            </div>
          )}

          {/* Row Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startRow">Start Row</Label>
              <div className="flex gap-2">
                <Input
                  id="startRow"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={config.startRow ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      startRow: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
                {config.startRow && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleClear("startRow")}
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">First row to read</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endRow">End Row</Label>
              <div className="flex gap-2">
                <Input
                  id="endRow"
                  type="number"
                  min="1"
                  placeholder="All"
                  value={config.endRow ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      endRow: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
                {config.endRow && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleClear("endRow")}
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Last row to read</p>
            </div>
          </div>

          {/* Column Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startColumn">Start Column</Label>
              <div className="flex gap-2">
                <Input
                  id="startColumn"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={config.startColumn ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      startColumn: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
                {config.startColumn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleClear("startColumn")}
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">First column (1 = A)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endColumn">End Column</Label>
              <div className="flex gap-2">
                <Input
                  id="endColumn"
                  type="number"
                  min="1"
                  placeholder="All"
                  value={config.endColumn ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      endColumn: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
                {config.endColumn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleClear("endColumn")}
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Last column</p>
            </div>
          </div>

          {/* Active Settings Summary */}
          {(config.startRow ||
            config.endRow ||
            config.startColumn ||
            config.endColumn ||
            config.sheetName ||
            config.sheetIndex !== undefined) && (
            <div className="rounded-md bg-muted p-3">
              <p className="mb-2 text-sm font-medium">Active Settings:</p>
              <div className="flex flex-wrap gap-2">
                {config.sheetName && <Badge variant="secondary">Sheet: {config.sheetName}</Badge>}
                {config.sheetIndex !== undefined && (
                  <Badge variant="secondary">Sheet Index: {config.sheetIndex}</Badge>
                )}
                {config.startRow && <Badge variant="secondary">From Row: {config.startRow}</Badge>}
                {config.endRow && <Badge variant="secondary">To Row: {config.endRow}</Badge>}
                {config.startColumn && (
                  <Badge variant="secondary">From Col: {config.startColumn}</Badge>
                )}
                {config.endColumn && <Badge variant="secondary">To Col: {config.endColumn}</Badge>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
