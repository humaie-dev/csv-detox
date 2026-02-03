/**
 * Export Button Component
 * Uses DuckDB-WASM for client-side export of full files (not limited to preview)
 */

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportWithDuckDB } from "@/lib/duckdb";
import { ExportProgressModal } from "@/components/export/ExportProgressModal";
import type { ExportProgress } from "@/lib/duckdb/types";
import type { TransformationStep } from "@/lib/pipeline/types";
import type { ParseOptions } from "@/lib/parsers/types";

interface ExportButtonProps {
  /** Upload ID from database */
  uploadId: string;
  /** URL to download file from Convex storage */
  fileUrl: string;
  /** MIME type of the file */
  mimeType: string;
  /** Original filename */
  originalFilename: string;
  /** Pipeline transformation steps */
  steps: TransformationStep[];
  /** Parse configuration (row/column ranges, sheet selection) */
  parseConfig?: ParseOptions;
  /** Disabled state */
  disabled?: boolean;
}

export function ExportButton({
  uploadId,
  fileUrl,
  mimeType,
  originalFilename,
  steps,
  parseConfig,
  disabled,
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    stage: "initializing",
    message: "Starting export...",
  });
  const [exportResult, setExportResult] = useState<{ blob: Blob; fileName: string } | null>(null);

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
    setExportResult(null);

    try {
      const result = await exportWithDuckDB({
        uploadId,
        fileUrl,
        mimeType,
        fileName: originalFilename,
        steps,
        parseConfig,
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      // Store result for download
      setExportResult({
        blob: result.blob,
        fileName: result.fileName,
      });

      toast({
        title: "Export Complete",
        description: `Processed ${result.rowCount.toLocaleString()} rows`,
      });
    } catch (error) {
      console.error("Export error:", error);

      // Error already shown in progress modal
      // Just log to console for debugging
    }
  };

  const handleDownload = () => {
    if (!exportResult) {
      return;
    }

    try {
      // Create blob URL
      const url = URL.createObjectURL(exportResult.blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = exportResult.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      URL.revokeObjectURL(url);

      // Close modal
      setIsExporting(false);
      setExportResult(null);

      toast({
        title: "Download Started",
        description: `Saving ${exportResult.fileName}`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download file",
      });
    }
  };

  const handleCancel = () => {
    setIsExporting(false);
    setExportResult(null);
  };

  return (
    <>
      <Button
        onClick={handleExport}
        disabled={disabled || isExporting}
        variant="default"
        size="default"
        title="Export full file using DuckDB in your browser"
      >
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? "Exporting..." : "Export CSV"}
      </Button>

      <ExportProgressModal
        isOpen={isExporting}
        progress={progress}
        onDownload={handleDownload}
        onCancel={handleCancel}
      />
    </>
  );
}
