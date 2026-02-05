"use client";

import { useState, useEffect, use } from "react";
import { useQuery } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { TransformationType, TransformationConfig, TransformationStep } from "@/lib/pipeline/types";
import type { ParseResult } from "@/lib/parsers/types";
import { executeUntilStep } from "@/lib/pipeline/executor";
import { loadPreviewWithDuckDB } from "@/lib/duckdb/previewer";
import { downloadFile } from "@/lib/duckdb/loader";
import { listSheets as listSheetsFromExcel } from "@/lib/parsers/excel";
import { DataTable } from "@/components/DataTable";
import { PipelineSteps } from "@/components/PipelineSteps";
import { AddStepDialog } from "@/components/AddStepDialog";
import { ParseConfigPanel } from "@/components/ParseConfigPanel";
import { ExportButton } from "@/components/ExportButton";
import { PipelineSidebar } from "@/components/PipelineSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function PreviewPage({ params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId: uploadIdString } = use(params);
  const uploadId = uploadIdString as Id<"uploads">;
  
  // Convex queries and mutations
  const upload = useQuery(api.uploads.getUpload, { uploadId });
  const fileUrl = useQuery(
    api.uploads.getFileUrl,
    upload ? { storageId: upload.convexStorageId } : "skip"
  );
  // No longer use server-side parse for preview or sheet listing

  // Local state
  const [steps, setSteps] = useState<TransformationStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(-1);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [originalData, setOriginalData] = useState<ParseResult | null>(null);
  const [previewData, setPreviewData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);

  // Load original data and sheet names when upload and fileUrl are available
  useEffect(() => {
    if (upload && fileUrl && !originalData) {
      loadOriginalData();
      loadSheetNames();
    }
  }, [upload, fileUrl]);

  // Execute preview when steps, selected index, upload, or fileUrl change
  useEffect(() => {
    if (upload && fileUrl) {
      executePreview();
    }
  }, [steps, selectedStepIndex, upload, fileUrl]);

  const loadOriginalData = async () => {
    if (!upload || !fileUrl) return;

    setLoading(true);
    setError("");

    try {
      const result = await loadPreviewWithDuckDB({
        fileUrl,
        mimeType: upload.mimeType,
        fileName: upload.originalName,
        steps: [],
        parseConfig: upload.parseConfig || undefined,
        maxRows: 1000,
      });
      setOriginalData(result);
      setPreviewData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const loadSheetNames = async () => {
    if (!upload || !fileUrl) return;

    // Only load sheets for Excel files
    const isExcel =
      upload.mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      upload.mimeType === "application/vnd.ms-excel";

    if (!isExcel) return;

    try {
      const buf = await downloadFile(fileUrl);
      const sheets = listSheetsFromExcel(buf);
      setAvailableSheets(sheets);
    } catch (err) {
      console.error("Failed to load sheet names:", err);
      // Non-critical error, don't show to user
    }
  };

  const handleConfigSaved = async () => {
    // Reload data after configuration changes
    setOriginalData(null); // Clear to force reload
    await loadOriginalData();
  };

  const executePreview = async () => {
    if (!upload || !fileUrl) return;

    setLoading(true);
    setError("");

    try {
      const stopIndex = selectedStepIndex >= 0 ? selectedStepIndex : steps.length - 1;
      const result = await loadPreviewWithDuckDB({
        fileUrl,
        mimeType: upload.mimeType,
        fileName: upload.originalName,
        steps,
        stopAtStep: stopIndex,
        parseConfig: upload.parseConfig || undefined,
        maxRows: 1000,
      });
      setPreviewData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute pipeline");
      // Do not fall back to stale data here to preserve correctness
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPipeline = (loadedSteps: TransformationStep[]) => {
    setSteps(loadedSteps);
    setSelectedStepIndex(-1); // Reset to show all steps
  };

  const handleAddStep = (type: TransformationType, config: TransformationConfig) => {
    const newStep: TransformationStep = {
      id: `step-${Date.now()}`,
      type,
      config,
    };

    const newSteps = [...steps, newStep];
    setSteps(newSteps);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps);
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps);
  };

  const handleRemove = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);

    // Adjust selected index if needed
    if (selectedStepIndex >= newSteps.length) {
      setSelectedStepIndex(newSteps.length - 1);
    }
  };

  const handleEdit = (index: number) => {
    setEditingStepIndex(index);
    setAddStepDialogOpen(true);
  };

  const handleEditStep = (type: TransformationType, config: TransformationConfig) => {
    if (editingStepIndex === null) return;

    const newSteps = [...steps];
    newSteps[editingStepIndex] = {
      ...newSteps[editingStepIndex],
      type,
      config,
    };
    setSteps(newSteps);

    setEditingStepIndex(null);
  };

  if (!upload) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Spinner className="size-5" />
              <p className="text-muted-foreground">Loading upload...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableColumns = originalData?.columns.map((c) => c.name) || [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-8 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transform Data</h1>
            <p className="text-muted-foreground">
              File: {upload.originalName} ({(upload.size / 1024).toFixed(2)} KB)
            </p>
          </div>
          <ExportButton
            uploadId={uploadId}
            fileUrl={fileUrl || ""}
            mimeType={upload.mimeType}
            originalFilename={upload.originalName}
            steps={steps}
            parseConfig={upload.parseConfig}
            disabled={loading || !!error || !fileUrl}
          />
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive mt-4">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pipeline Sidebar - Needs pipeline context, show placeholder */}
        <Card className="w-80 border-r border-t-0 rounded-none h-full flex flex-col">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground text-sm">
              This view is deprecated. Please use /create-pipeline to create a pipeline.
            </p>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Config & Steps */}
              <div className="lg:col-span-1 space-y-6">
                {/* Data Source Configuration */}
                <ParseConfigPanel
                  uploadId={uploadId}
                  mimeType={upload.mimeType}
                  currentConfig={upload.parseConfig || undefined}
                  availableSheets={availableSheets}
                  onConfigChanged={handleConfigSaved}
                />

                {/* Pipeline Steps */}
                <PipelineSteps
                  steps={steps}
                  selectedStepIndex={selectedStepIndex}
                  onSelectStep={setSelectedStepIndex}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                  onEdit={handleEdit}
                  onAddStep={() => setAddStepDialogOpen(true)}
                />
              </div>

              {/* Right Column - Data Preview */}
              <div className="lg:col-span-2">
                {loading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="size-5" />
                        <p className="text-muted-foreground">Loading...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : previewData ? (
                  <DataTable data={previewData} maxRows={100} />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">No data available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Step Dialog */}
      <AddStepDialog
        open={addStepDialogOpen}
        onOpenChange={(open) => {
          setAddStepDialogOpen(open);
          if (!open) setEditingStepIndex(null);
        }}
        onAddStep={handleAddStep}
        onEditStep={handleEditStep}
        availableColumns={availableColumns}
        editingStep={editingStepIndex !== null ? steps[editingStepIndex] : null}
        uploadId={uploadId}
      />
    </div>
  );
}
