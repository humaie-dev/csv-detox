"use client";

import { useState, useEffect, use } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { TransformationType, TransformationConfig, TransformationStep } from "@/lib/pipeline/types";
import type { ParseResult } from "@/lib/parsers/types";
import { DataTable } from "@/components/DataTable";
import { PipelineSteps } from "@/components/PipelineSteps";
import { AddStepDialog } from "@/components/AddStepDialog";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PreviewPage({ params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId: uploadIdString } = use(params);
  const uploadId = uploadIdString as Id<"uploads">;
  
  // Convex queries and mutations
  const upload = useQuery(api.uploads.getUpload, { uploadId });
  const pipelines = useQuery(api.pipelines.getPipelinesByUpload, { uploadId });
  const createPipeline = useMutation(api.pipelines.createPipeline);
  const updatePipeline = useMutation(api.pipelines.updatePipeline);
  const parseFile = useAction(api.parsers.parseFile);
  const executePipelineAction = useAction(api.pipelines.executePipelineAction);

  // Local state
  const [steps, setSteps] = useState<TransformationStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(-1);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [originalData, setOriginalData] = useState<ParseResult | null>(null);
  const [previewData, setPreviewData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [pipelineId, setPipelineId] = useState<Id<"pipelines"> | null>(null);

  // Load original data when upload is available
  useEffect(() => {
    if (upload && !originalData) {
      loadOriginalData();
    }
  }, [upload]);

  // Load pipeline if it exists
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !pipelineId) {
      const pipeline = pipelines[0]; // Use first pipeline
      setPipelineId(pipeline._id);
      setSteps(pipeline.steps as TransformationStep[]);
    }
  }, [pipelines]);

  // Execute preview when steps or selected index changes
  useEffect(() => {
    if (originalData && pipelineId) {
      executePreview();
    }
  }, [steps, selectedStepIndex, pipelineId]);

  const loadOriginalData = async () => {
    if (!upload) return;

    setLoading(true);
    setError("");

    try {
      const result = await parseFile({
        storageId: upload.convexStorageId,
        fileType: upload.mimeType,
      });
      setOriginalData(result);
      setPreviewData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const executePreview = async () => {
    if (!pipelineId || !originalData) return;

    setLoading(true);
    setError("");

    try {
      const result = await executePipelineAction({
        pipelineId,
        stopAtStep: selectedStepIndex >= 0 ? selectedStepIndex : undefined,
      });

      setPreviewData(result.table);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute pipeline");
      setPreviewData(originalData); // Fallback to original
    } finally {
      setLoading(false);
    }
  };

  const handleAddStep = async (type: TransformationType, config: TransformationConfig) => {
    const newStep: TransformationStep = {
      id: `step-${Date.now()}`,
      type,
      config,
    };

    const newSteps = [...steps, newStep];
    setSteps(newSteps);

    try {
      if (pipelineId) {
        // Update existing pipeline
        await updatePipeline({
          pipelineId,
          steps: newSteps,
        });
      } else {
        // Create new pipeline
        const id = await createPipeline({
          uploadId,
          steps: newSteps,
        });
        setPipelineId(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pipeline");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps);

    if (pipelineId) {
      await updatePipeline({ pipelineId, steps: newSteps });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === steps.length - 1) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps);

    if (pipelineId) {
      await updatePipeline({ pipelineId, steps: newSteps });
    }
  };

  const handleRemove = async (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);

    // Adjust selected index if needed
    if (selectedStepIndex >= newSteps.length) {
      setSelectedStepIndex(newSteps.length - 1);
    }

    if (pipelineId) {
      await updatePipeline({ pipelineId, steps: newSteps });
    }
  };

  const handleEdit = (index: number) => {
    setEditingStepIndex(index);
    setAddStepDialogOpen(true);
  };

  const handleEditStep = async (type: TransformationType, config: TransformationConfig) => {
    if (editingStepIndex === null) return;

    const newSteps = [...steps];
    newSteps[editingStepIndex] = {
      ...newSteps[editingStepIndex],
      type,
      config,
    };
    setSteps(newSteps);

    if (pipelineId) {
      await updatePipeline({ pipelineId, steps: newSteps });
    }

    setEditingStepIndex(null);
  };

  if (!upload) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading upload...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableColumns = originalData?.columns.map((c) => c.name) || [];

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transform Data</h1>
          <p className="text-muted-foreground">
            File: {upload.originalName} ({(upload.size / 1024).toFixed(2)} KB)
          </p>
        </div>
        <ExportButton
          data={previewData}
          originalFilename={upload.originalName}
          disabled={loading || !!error}
        />
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Steps (Left Sidebar) */}
        <div className="lg:col-span-1">
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

        {/* Data Preview (Main Content) */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Loading...</p>
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
      />
    </div>
  );
}
