/**
 * Export Button Component
 * Uses server-side SQLite export for streaming CSV downloads
 */

"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  /** Project ID */
  projectId: string;
  /** Pipeline ID (optional for exportAll mode) */
  pipelineId?: string;
  /** Export raw data instead of pipeline results */
  exportRaw?: boolean;
  /** Export all pipelines as ZIP */
  exportAll?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function ExportButton({
  projectId,
  pipelineId,
  exportRaw = false,
  exportAll = false,
  disabled,
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    // Prevent concurrent exports
    if (isExporting) {
      toast({
        variant: "destructive",
        title: "Export Already in Progress",
        description: "Please wait for the current export to complete.",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Build export URL
      let url: string;
      if (exportAll) {
        url = `/api/projects/${projectId}/export-all`;
      } else if (!pipelineId) {
        throw new Error("pipelineId is required for single pipeline export");
      } else {
        url = `/api/projects/${projectId}/pipelines/${pipelineId}/export${exportRaw ? "?raw=true" : ""}`;
      }

      // Fetch from server
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || (exportAll ? "export.zip" : "export.csv");

      // Get blob
      const blob = await response.blob();

      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);

      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export file",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant="default"
      size="default"
      title={
        exportAll
          ? "Export all pipelines as ZIP"
          : exportRaw
            ? "Export raw data as CSV"
            : "Export pipeline results as CSV"
      }
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : exportAll ? "Export All (ZIP)" : "Export CSV"}
    </Button>
  );
}
