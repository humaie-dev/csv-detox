/**
 * Export Progress Modal
 * Shows progress during DuckDB-WASM export with download button when ready
 */

"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportProgress, ExportStage } from "@/lib/duckdb/types";

interface ExportProgressModalProps {
  isOpen: boolean;
  progress: ExportProgress;
  onDownload?: () => void;
  onCancel?: () => void;
}

export function ExportProgressModal({
  isOpen,
  progress,
  onDownload,
  onCancel,
}: ExportProgressModalProps) {
  const { stage, message, bytesDownloaded, totalBytes, currentStep, totalSteps, error } = progress;

  // Calculate progress percentage based on stage
  const progressPercentage = getProgressPercentage(stage, bytesDownloaded, totalBytes, currentStep, totalSteps);

  // Determine if we can close the dialog
  const canClose = stage === "ready" || stage === "error";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && canClose && onCancel?.()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {stage === "error" ? "Export Failed" : stage === "ready" ? "Export Complete!" : "Exporting Data..."}
          </DialogTitle>
          <DialogDescription>
            {stage === "error"
              ? "An error occurred during export"
              : stage === "ready"
              ? "Your file is ready to download"
              : "Processing your file in the browser using DuckDB"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress bar */}
          {stage !== "error" && stage !== "ready" && (
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progressPercentage)}%
              </p>
            </div>
          )}

          {/* Stage message */}
          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {getStageTitle(stage)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {message}
                </p>

                {/* Additional stage-specific info */}
                {stage === "downloading" && totalBytes && totalBytes > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatBytes(bytesDownloaded || 0)} / {formatBytes(totalBytes)}
                  </p>
                )}

                {stage === "transforming" && totalSteps && totalSteps > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Step {(currentStep || 0) + 1} of {totalSteps}
                  </p>
                )}

                {stage === "error" && error && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                    {error.includes("out of memory") && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Tip: Try exporting a smaller file or applying filters to reduce the data size.
                      </p>
                    )}
                  </div>
                )}

                {stage === "ready" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Click the download button below to save your file.
                  </p>
                )}
              </div>

              {/* Spinner for active stages */}
              {!canClose && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              )}
            </div>
          </div>

          {/* Warning about cancellation */}
          {!canClose && stage !== "initializing" && (
            <p className="text-xs text-muted-foreground text-center">
              Export is processing in your browser. Closing this window may interrupt the export.
            </p>
          )}
        </div>

        <DialogFooter>
          {stage === "ready" && (
            <Button onClick={onDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download File
            </Button>
          )}

          {stage === "error" && (
            <Button onClick={onCancel} variant="outline" className="w-full">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          )}

          {!canClose && (
            <Button onClick={onCancel} variant="outline" className="w-full" disabled>
              Cancel (not available)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get progress percentage based on current stage
 */
function getProgressPercentage(
  stage: ExportStage,
  bytesDownloaded?: number,
  totalBytes?: number,
  currentStep?: number,
  totalSteps?: number
): number {
  switch (stage) {
    case "initializing":
      return 10;
    case "downloading":
      if (totalBytes && totalBytes > 0) {
        return 10 + (bytesDownloaded || 0) / totalBytes * 30; // 10-40%
      }
      return 25;
    case "loading":
      return 40;
    case "transforming":
      if (totalSteps && totalSteps > 0) {
        return 50 + ((currentStep || 0) / totalSteps) * 40; // 50-90%
      }
      return 70;
    case "generating":
      return 95;
    case "ready":
      return 100;
    case "error":
      return 0;
    default:
      return 0;
  }
}

/**
 * Get user-friendly title for each stage
 */
function getStageTitle(stage: ExportStage): string {
  switch (stage) {
    case "initializing":
      return "Initializing DuckDB...";
    case "downloading":
      return "Downloading File...";
    case "loading":
      return "Loading Data...";
    case "transforming":
      return "Applying Transformations...";
    case "generating":
      return "Generating CSV...";
    case "ready":
      return "Ready!";
    case "error":
      return "Error";
    default:
      return "Processing...";
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
