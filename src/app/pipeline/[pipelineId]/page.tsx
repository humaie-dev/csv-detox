"use client";

import { useState, useEffect, use } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { TransformationType, TransformationConfig, TransformationStep, ColumnMetadata } from "@/lib/pipeline/types";
import type { ParseResult } from "@/lib/parsers/types";
import { executeUntilStep } from "@/lib/pipeline/executor";
import { DataTable } from "@/components/DataTable";
import { PipelineSteps } from "@/components/PipelineSteps";
import { AddStepDialog } from "@/components/AddStepDialog";
import { ParseConfigPanel } from "@/components/ParseConfigPanel";
import { ExportButton } from "@/components/ExportButton";
import { PipelineSidebar } from "@/components/PipelineSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AssistantPanel } from "@/components/AssistantPanel";
import type { Proposal, AddStepProposal, RemoveStepProposal, EditStepProposal, ReorderStepsProposal, UpdateParseConfigProposal } from "@/lib/assistant/intent";

export default function PipelinePage({ params }: { params: Promise<{ pipelineId: string }> }) {
  const { pipelineId: pipelineIdString } = use(params);
  const pipelineId = pipelineIdString as Id<"pipelines">;
  
  // Convex queries and mutations
  const pipeline = useQuery(api.pipelines.get, { id: pipelineId });
  const upload = useQuery(
    api.uploads.getUpload,
    pipeline ? { uploadId: pipeline.uploadId } : "skip"
  );
  const fileUrl = useQuery(
    api.uploads.getFileUrl,
    upload ? { storageId: upload.convexStorageId } : "skip"
  );
  const updatePipeline = useMutation(api.pipelines.update);
  const updateParseConfigMutation = useMutation(api.uploads.updateParseConfig);
  const parseFile = useAction(api.parsers.parseFile);
  const listSheets = useAction(api.parsers.listSheets);

  // Local state
  const [steps, setSteps] = useState<TransformationStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(-1);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [originalData, setOriginalData] = useState<ParseResult | null>(null);
  const [previewData, setPreviewData] = useState<ParseResult | null>(null);
  const [typeEvolution, setTypeEvolution] = useState<ColumnMetadata[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<TransformationStep[][]>([]);

  // Load steps from pipeline
  useEffect(() => {
    if (pipeline && pipeline.steps) {
      setSteps(pipeline.steps as TransformationStep[]);
    }
  }, [pipeline]);

  // Load original data when upload is available
  useEffect(() => {
    if (upload && !originalData) {
      loadOriginalData();
      loadSheetNames();
    }
  }, [upload]);

  // Execute preview when steps or selected index changes
  useEffect(() => {
    if (originalData) {
      executePreview();
    }
  }, [steps, selectedStepIndex, originalData]);

  // Save steps to pipeline when they change
  useEffect(() => {
    if (pipeline && steps.length > 0 && JSON.stringify(steps) !== JSON.stringify(pipeline.steps)) {
      savePipeline();
    }
  }, [steps]);

  const savePipeline = async () => {
    try {
      await updatePipeline({ id: pipelineId, steps });
    } catch (err) {
      console.error("Failed to save pipeline:", err);
    }
  };

  const loadOriginalData = async () => {
    if (!upload) return;

    setLoading(true);
    setError("");

    try {
      const result = await parseFile({
        uploadId: upload._id,
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
    if (!upload) return;

    // Only load sheets for Excel files
    const isExcel =
      upload.mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      upload.mimeType === "application/vnd.ms-excel";

    if (!isExcel) {
      return;
    }

    try {
      const sheets = await listSheets({ uploadId: upload._id });
      setAvailableSheets(sheets);
    } catch (err) {
      console.error("[Pipeline] Failed to load sheet names:", err);
    }
  };

  const handleConfigSaved = async () => {
    // Reload data after configuration changes
    setOriginalData(null); // Clear to force reload
    await loadOriginalData();
  };

  const executePreview = () => {
    if (!originalData) return;

    setLoading(true);
    setError("");

    try {
      // Execute pipeline client-side
      const stopIndex = selectedStepIndex >= 0 ? selectedStepIndex : steps.length - 1;
      
      if (steps.length === 0 || stopIndex < 0) {
        setPreviewData(originalData);
        setTypeEvolution([originalData.columns]);
      } else {
        const result = executeUntilStep(originalData, steps, stopIndex);
        setPreviewData(result.table);
        setTypeEvolution(result.typeEvolution);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute pipeline");
      setPreviewData(originalData); // Fallback to original
      setTypeEvolution([originalData.columns]);
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

  const handleApplyProposal = async (proposal: Proposal) => {
    // Save current state for undo
    setUndoStack((prev) => [...prev, steps]);

    switch (proposal.kind) {
      case "add_step": {
        const p = proposal as AddStepProposal;
        const newStep: TransformationStep = {
          id: `step-${Date.now()}`,
          type: p.step.config.type,
          config: p.step.config,
        };

        if (p.step.position === "end" || p.step.position === undefined) {
          setSteps([...steps, newStep]);
        } else {
          const newSteps = [...steps];
          newSteps.splice(p.step.position, 0, newStep);
          setSteps(newSteps);
        }
        break;
      }

      case "remove_step": {
        const p = proposal as RemoveStepProposal;
        const newSteps = steps.filter((_, i) => i !== p.stepIndex);
        setSteps(newSteps);
        
        // Adjust selected index if needed
        if (selectedStepIndex >= newSteps.length) {
          setSelectedStepIndex(newSteps.length - 1);
        }
        break;
      }

      case "edit_step": {
        const p = proposal as EditStepProposal;
        const newSteps = [...steps];
        newSteps[p.stepIndex] = {
          ...newSteps[p.stepIndex],
          type: p.newConfig.type,
          config: p.newConfig,
        };
        setSteps(newSteps);
        break;
      }

      case "reorder_steps": {
        const p = proposal as ReorderStepsProposal;
        const newSteps = [...steps];
        const [movedStep] = newSteps.splice(p.from, 1);
        newSteps.splice(p.to, 0, movedStep);
        setSteps(newSteps);
        break;
      }

      case "update_parse_config": {
        const p = proposal as UpdateParseConfigProposal;
        
        try {
          await updateParseConfigMutation({
            uploadId: upload!._id,
            parseConfig: p.changes as any,
          });
          
          // Reload data with new config
          await handleConfigSaved();
        } catch (err) {
          console.error("Failed to update parse config:", err);
          setError("Failed to update parse configuration");
        }
        break;
      }
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const previousSteps = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setSteps(previousSteps);
  };

  if (!pipeline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Spinner className="size-5" />
          <p className="text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Spinner className="size-5" />
          <p className="text-muted-foreground">Loading upload...</p>
        </div>
      </div>
    );
  }

  // Compute available columns based on context
  // - When adding a new step: use columns from final preview (after all steps)
  // - When editing step N: use columns from step N-1 (before that step)
  const getAvailableColumnsForDialog = (): string[] => {
    if (!originalData) return [];
    
    // If editing a step, compute columns available before that step
    if (editingStepIndex !== null && editingStepIndex > 0) {
      // Execute pipeline up to the step before the one being edited
      const result = executeUntilStep(originalData, steps, editingStepIndex - 1);
      return result.table.columns.map((c) => c.name);
    } else if (editingStepIndex === 0) {
      // Editing first step, use original columns
      return originalData.columns.map((c) => c.name);
    }
    
    // Adding a new step at the end: use current preview columns
    return previewData?.columns.map((c) => c.name) || originalData.columns.map((c) => c.name);
  };
  
  const availableColumnsForDialog = getAvailableColumnsForDialog();
  
  // For assistant panel, always use final preview columns
  const availableColumnsForAssistant = previewData?.columns.map((c) => c.name) || originalData?.columns.map((c) => c.name) || [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-8 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{pipeline.name}</h1>
            <p className="text-muted-foreground">
              File: {upload.originalName} ({(upload.size / 1024).toFixed(2)} KB)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || loading}
            >
              ↺ Undo
            </Button>
            <ExportButton
              uploadId={upload._id}
              fileUrl={fileUrl || ""}
              mimeType={upload.mimeType}
              originalFilename={upload.originalName}
              steps={steps}
              parseConfig={upload.parseConfig}
              disabled={loading || !!error || !fileUrl}
            />
          </div>
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
        {/* Pipeline Sidebar */}
        <PipelineSidebar
          currentPipelineId={pipelineId}
          onLoadPipeline={handleLoadPipeline}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Config & Steps */}
              <div className="lg:col-span-1 space-y-6">
                {/* Data Source Configuration */}
                <ParseConfigPanel
                  uploadId={upload._id}
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

        {/* Assistant Panel - Fixed position on right side */}
        <div className="w-96 border-l flex-shrink-0 flex flex-col">
          <AssistantPanel
            availableColumns={availableColumnsForAssistant}
            currentSteps={steps}
            parseConfig={upload.parseConfig || undefined}
            previewData={previewData}
            originalData={originalData}
            typeEvolution={typeEvolution}
            availableSheets={availableSheets}
            onApplyProposal={handleApplyProposal}
            disabled={loading}
          />
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
        availableColumns={availableColumnsForDialog}
        editingStep={editingStepIndex !== null ? steps[editingStepIndex] : null}
        uploadId={upload._id}
      />
    </div>
  );
}
