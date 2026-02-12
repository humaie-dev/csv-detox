"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  Trash2,
  Layers,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Pencil,
  Settings,
  Sparkles,
} from "lucide-react";
import { SavePipelineDialog } from "@/components/SavePipelineDialog";
import { AddStepDialog } from "@/components/AddStepDialog";
import { PipelineSettingsDialog } from "@/components/PipelineSettingsDialog";
import { ExportButton } from "@/components/ExportButton";
import { AssistantChat } from "@/components/AssistantChat";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/DataTable";
import { InteractiveDataTable } from "@/components/InteractiveDataTable";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { ColumnMetadata } from "@/lib/parsers/types";
import type { TransformationType, TransformationConfig, TransformationStep } from "@/lib/pipeline/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdString } = use(params);
  const projectId = projectIdString as Id<"projects">;
  const router = useRouter();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddStepDialogOpen, setIsAddStepDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<Id<"pipelines"> | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<{
    rows: Record<string, unknown>[];
    columns: ColumnMetadata[];
    rowCount: number;
    loading: boolean;
  }>({ rows: [], columns: [], rowCount: 0, loading: false });
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [loadingSheets, setLoadingSheets] = useState(false);

  // Queries
  const project = useQuery(api.projects.get, { id: projectId });
  const pipelines = useQuery(api.pipelines.list, { projectId });
  
  // Use "skip" to conditionally call query while maintaining hook order
  const selectedPipeline = useQuery(
    api.pipelines.get,
    selectedPipelineId ? { id: selectedPipelineId } : "skip"
  );

  // Mutations
  const createPipeline = useMutation(api.pipelines.create);
  const deletePipeline = useMutation(api.pipelines.remove);
  const deleteProject = useMutation(api.projects.remove);
  const updatePipeline = useMutation(api.pipelines.update);

  // Determine if file is Excel (needs to be before useEffect hooks)
  const isExcelFile = !!(project?.upload?.mimeType?.includes("spreadsheet") || 
                      project?.upload?.originalName?.match(/\.(xlsx?|xls)$/i));

  // Parse file on mount if needed
  useEffect(() => {
    if (project && !isParsingFile) {
      checkAndParseFile();
    }
  }, [project]);

  // Load sheets for Excel files
  useEffect(() => {
    if (project && isExcelFile && availableSheets.length === 0) {
      loadSheets();
    }
  }, [project, isExcelFile]);

  // Load preview data when selection changes
  useEffect(() => {
    if (project) {
      loadPreviewData();
    }
  }, [selectedPipelineId, selectedPipeline, selectedStepIndex, project, selectedSheet]);

  const checkAndParseFile = async () => {
    try {
      // Check if data is already parsed
      const statusResponse = await fetch(
        `/api/projects/${projectId}/parse`,
        { method: "GET" }
      );
      const status = await statusResponse.json();

      if (!status.initialized) {
        setIsParsingFile(true);
        // Parse the file
        const parseResponse = await fetch(
          `/api/projects/${projectId}/parse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        if (!parseResponse.ok) {
          const error = await parseResponse.json();
          throw new Error(error.error || "Failed to parse file");
        }

        toast({
          title: "File parsed",
          description: "Project data is now ready for preview.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const loadSheets = async () => {
    if (!isExcelFile) return;
    
    setLoadingSheets(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sheets`);
      if (!response.ok) {
        throw new Error("Failed to fetch sheets");
      }
      const data = await response.json();
      setAvailableSheets(data.sheets || []);
      
      // Set first sheet as default if none selected
      if (data.sheets && data.sheets.length > 0 && !selectedSheet) {
        setSelectedSheet(data.sheets[0]);
      }
    } catch (error) {
      console.error("Error loading sheets:", error);
      toast({
        title: "Warning",
        description: "Could not load sheet names",
        variant: "destructive",
      });
    } finally {
      setLoadingSheets(false);
    }
  };

  const loadPreviewData = async () => {
    setPreviewData((prev) => ({ ...prev, loading: true }));

    try {
      if (selectedPipelineId && selectedPipeline) {
        // Load pipeline preview
        const response = await fetch(
          `/api/projects/${projectId}/pipelines/${selectedPipelineId}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upToStep: selectedStepIndex,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to load pipeline preview");
        }

        const data = await response.json();
        setPreviewData({
          rows: data.data,
          columns: data.columns,
          rowCount: data.rowCount,
          loading: false,
        });
      } else {
        // Load raw data
        const response = await fetch(
          `/api/projects/${projectId}/data?limit=100&offset=0`
        );

        if (!response.ok) {
          const error = await response.json();
          // If data not initialized, don't show error
          if (error.error.includes("not initialized")) {
            setPreviewData({ rows: [], columns: [], rowCount: 0, loading: false });
            return;
          }
          throw new Error(error.error || "Failed to load data");
        }

        const data = await response.json();
        setPreviewData({
          rows: data.data,
          columns: data.columns,
          rowCount: data.pagination.total,
          loading: false,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load preview",
        variant: "destructive",
      });
      setPreviewData((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCreatePipeline = async (name: string) => {
    try {
      const pipelineId = await createPipeline({
        projectId,
        name,
        steps: [],
      });
      toast({
        title: "Pipeline created",
        description: `Pipeline "${name}" has been created.`,
      });
      setIsCreateDialogOpen(false);
      // Select the new pipeline
      setSelectedPipelineId(pipelineId);
      setSelectedStepIndex(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create pipeline",
        variant: "destructive",
      });
    }
  };

  const handleDeletePipeline = async (pipelineId: Id<"pipelines">, name: string) => {
    if (!confirm(`Are you sure you want to delete pipeline "${name}"?`)) {
      return;
    }

    try {
      await deletePipeline({ id: pipelineId });
      toast({
        title: "Pipeline deleted",
        description: `Pipeline "${name}" has been deleted.`,
      });
      // Clear selection if deleted pipeline was selected
      if (selectedPipelineId === pipelineId) {
        setSelectedPipelineId(null);
        setSelectedStepIndex(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete pipeline",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (
      !confirm(
        `Are you sure you want to delete project "${project.name}"? This will also delete all ${pipelines?.length || 0} pipeline(s).`
      )
    ) {
      return;
    }

    try {
      await deleteProject({ id: projectId });
      toast({
        title: "Project deleted",
        description: `Project "${project.name}" has been deleted.`,
      });
      router.push("/projects");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  // Step management functions
  const handleAddStep = async (type: TransformationType, config: TransformationConfig) => {
    if (!selectedPipelineId || !selectedPipeline) return;

    try {
      const newStep: TransformationStep = {
        id: crypto.randomUUID(),
        type,
        config,
      };

      await updatePipeline({
        id: selectedPipelineId,
        steps: [...selectedPipeline.steps, newStep],
      });

      toast({
        title: "Step added",
        description: "Transformation step has been added to the pipeline.",
      });

      setIsAddStepDialogOpen(false);
      // Reload preview
      loadPreviewData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add step",
        variant: "destructive",
      });
    }
  };

  const handleEditStep = async (type: TransformationType, config: TransformationConfig) => {
    if (!selectedPipelineId || !selectedPipeline || editingStepIndex === null) return;

    try {
      const updatedSteps = [...selectedPipeline.steps];
      updatedSteps[editingStepIndex] = {
        ...updatedSteps[editingStepIndex],
        type,
        config,
      };

      await updatePipeline({
        id: selectedPipelineId,
        steps: updatedSteps,
      });

      toast({
        title: "Step updated",
        description: "Transformation step has been updated.",
      });

      setIsAddStepDialogOpen(false);
      setEditingStepIndex(null);
      // Reload preview
      loadPreviewData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update step",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStep = async (stepIndex: number) => {
    if (!selectedPipelineId || !selectedPipeline) return;

    try {
      const updatedSteps = selectedPipeline.steps.filter((_, i) => i !== stepIndex);

      await updatePipeline({
        id: selectedPipelineId,
        steps: updatedSteps,
      });

      toast({
        title: "Step deleted",
        description: "Transformation step has been removed.",
      });

      // Adjust selected step index if needed
      if (selectedStepIndex !== null && selectedStepIndex >= stepIndex) {
        setSelectedStepIndex(selectedStepIndex > 0 ? selectedStepIndex - 1 : null);
      }

      // Reload preview
      loadPreviewData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete step",
        variant: "destructive",
      });
    }
  };

  const handleMoveStep = async (fromIndex: number, toIndex: number) => {
    if (!selectedPipelineId || !selectedPipeline) return;
    if (toIndex < 0 || toIndex >= selectedPipeline.steps.length) return;

    try {
      const updatedSteps = [...selectedPipeline.steps];
      const [movedStep] = updatedSteps.splice(fromIndex, 1);
      updatedSteps.splice(toIndex, 0, movedStep);

      await updatePipeline({
        id: selectedPipelineId,
        steps: updatedSteps,
      });

      // Adjust selected step index if needed
      if (selectedStepIndex === fromIndex) {
        setSelectedStepIndex(toIndex);
      } else if (selectedStepIndex !== null) {
        if (fromIndex < selectedStepIndex && toIndex >= selectedStepIndex) {
          setSelectedStepIndex(selectedStepIndex - 1);
        } else if (fromIndex > selectedStepIndex && toIndex <= selectedStepIndex) {
          setSelectedStepIndex(selectedStepIndex + 1);
        }
      }

      // Reload preview
      loadPreviewData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move step",
        variant: "destructive",
      });
    }
  };

  const openEditStepDialog = (stepIndex: number) => {
    setEditingStepIndex(stepIndex);
    setIsAddStepDialogOpen(true);
  };

  const openAddStepDialog = () => {
    setEditingStepIndex(null);
    setIsAddStepDialogOpen(true);
  };

  const handleSaveSettings = async (parseConfig: {
    sheetName?: string;
    sheetIndex?: number;
    startRow?: number;
    endRow?: number;
    startColumn?: number;
    endColumn?: number;
    hasHeaders: boolean;
  }) => {
    if (!selectedPipelineId) return;

    try {
      await updatePipeline({
        id: selectedPipelineId,
        parseConfig,
      });

      toast({
        title: "Settings saved",
        description: "Pipeline settings have been updated.",
      });

      setIsSettingsDialogOpen(false);
      // Reload preview with new settings
      loadPreviewData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    
    // Re-parse with the new sheet
    try {
      setIsParsingFile(true);
      const parseResponse = await fetch(
        `/api/projects/${projectId}/parse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parseOptions: { sheetName },
          }),
        }
      );

      if (!parseResponse.ok) {
        const error = await parseResponse.json();
        throw new Error(error.error || "Failed to parse file with new sheet");
      }

      toast({
        title: "Sheet changed",
        description: `Now showing data from "${sheetName}"`,
      });

      // Reload preview will happen automatically via useEffect
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change sheet",
        variant: "destructive",
      });
      // Revert sheet selection on error
      setSelectedSheet(availableSheets[0] || null);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Get available columns for step dialog
  const availableColumns = previewData.columns.map((col) => col.name);

  if (project === undefined || pipelines === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-semibold">Project not found</h2>
            <p className="mt-2 text-muted-foreground">
              The project you're looking for doesn't exist.
            </p>
            <Link href="/projects">
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={{ left: true, right: true }}>
      <div className="flex h-screen flex-col">
        {/* Header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/projects">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {project.upload?.originalName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 md:hidden">
                <SidebarTrigger side="left" variant="outline" size="sm">
                  <Layers className="mr-2 h-4 w-4" />
                  Pipelines
                </SidebarTrigger>
                <SidebarTrigger side="right" variant="outline" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Assistant
                </SidebarTrigger>
              </div>
              {!isParsingFile && (pipelines?.length ?? 0) > 0 && (
                <ExportButton
                  projectId={projectId}
                  exportAll={true}
                />
              )}
              <Button variant="destructive" onClick={handleDeleteProject}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
            </div>
          </div>
        </div>

        {/* 4-Panel Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Pipelines List */}
          <Sidebar side="left" className="bg-muted/10">
            <SidebarHeader className="border-b-0 pb-0">
              <h2 className="font-semibold">Pipelines</h2>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </SidebarHeader>

            <SidebarContent className="pt-2">

            {isParsingFile && (
              <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                <Spinner className="mr-2 inline h-4 w-4" />
                Parsing file...
              </div>
            )}

            {pipelines.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No pipelines</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create one
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedPipelineId(null);
                    setSelectedStepIndex(null);
                  }}
                  className={`w-full rounded-md p-3 text-left transition-colors ${
                    selectedPipelineId === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Raw Data</span>
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <p className="text-xs opacity-80">Original file data</p>
                </button>

                {pipelines.map((pipeline) => (
                  <button
                    key={pipeline._id}
                    onClick={() => {
                      setSelectedPipelineId(pipeline._id);
                      setSelectedStepIndex(null);
                    }}
                    className={`w-full rounded-md p-3 text-left transition-colors ${
                      selectedPipelineId === pipeline._id
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{pipeline.name}</span>
                      <Layers className="h-4 w-4 flex-shrink-0" />
                    </div>
                    <p className="text-xs opacity-80">
                      {pipeline.steps.length} step{pipeline.steps.length !== 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
            </SidebarContent>
          </Sidebar>

          {/* Middle Panel: Steps / Config */}
          <div className="w-80 overflow-y-auto border-r bg-background">
            {selectedPipelineId && selectedPipeline ? (
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Pipeline Steps</h2>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsSettingsDialogOpen(true)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={openAddStepDialog}
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Add Step
                      </Button>
                    </div>
                  </div>
                  {selectedPipeline.parseConfig && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedPipeline.parseConfig.sheetName && (
                        <Badge variant="secondary" className="text-xs">
                          Sheet: {selectedPipeline.parseConfig.sheetName}
                        </Badge>
                      )}
                      {selectedPipeline.parseConfig.startRow && (
                        <Badge variant="secondary" className="text-xs">
                          Row {selectedPipeline.parseConfig.startRow}+
                        </Badge>
                      )}
                      {selectedPipeline.parseConfig.endRow && (
                        <Badge variant="secondary" className="text-xs">
                          To {selectedPipeline.parseConfig.endRow}
                        </Badge>
                      )}
                      {!selectedPipeline.parseConfig.hasHeaders && (
                        <Badge variant="secondary" className="text-xs">
                          No headers
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {selectedPipeline.steps.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No transformation steps yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={openAddStepDialog}
                    >
                      Add your first step
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPipeline.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`rounded-md border p-3 transition-colors ${
                          selectedStepIndex === index
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => setSelectedStepIndex(index)}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="flex-1 font-medium capitalize">
                              {step.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {JSON.stringify(step.config).slice(0, 80)}
                          </p>
                        </div>
                        <div className="mt-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStep(index, index - 1);
                            }}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStep(index, index + 1);
                            }}
                            disabled={index === selectedPipeline.steps.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditStepDialog(index);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this step?")) {
                                handleDeleteStep(index);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <div className="text-center text-muted-foreground">
                  <ChevronRight className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-sm">Select a pipeline to view steps</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Data Preview */}
          <div className="flex-1 overflow-y-auto bg-background">
            {previewData.loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span>Loading preview...</span>
                </div>
              </div>
            ) : previewData.rows.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileSpreadsheet className="mx-auto mb-2 h-12 w-12" />
                  <p>No data available</p>
                  {isParsingFile && <p className="text-sm">File is being parsed...</p>}
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Sheet selector for raw data (Excel files only) */}
                {!selectedPipelineId && isExcelFile && availableSheets.length > 0 && (
                  <div className="mb-4 rounded-lg border bg-muted/10 p-3">
                    <Label htmlFor="sheet-select" className="text-sm font-medium">
                      Sheet:
                    </Label>
                    <Select
                      value={selectedSheet || undefined}
                      onValueChange={handleSheetChange}
                      disabled={loadingSheets || isParsingFile}
                    >
                      <SelectTrigger id="sheet-select" className="mt-1">
                        <SelectValue placeholder="Select a sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSheets.map((sheet) => (
                          <SelectItem key={sheet} value={sheet}>
                            {sheet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isParsingFile && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <Spinner className="mr-1 inline h-3 w-3" />
                        Loading sheet data...
                      </p>
                    )}
                  </div>
                )}

                {selectedPipelineId ? (
                  <DataTable
                    data={{
                      rows: previewData.rows,
                      columns: previewData.columns,
                      rowCount: previewData.rowCount,
                      warnings: [],
                    }}
                    maxRows={100}
                  />
                ) : (
                  <InteractiveDataTable
                    data={{
                      rows: previewData.rows,
                      columns: previewData.columns,
                      rowCount: previewData.rowCount,
                      warnings: [],
                    }}
                    maxRows={100}
                    enableInteraction={true}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right Panel: AI Assistant */}
          <Sidebar side="right" className="w-80">
            <SidebarContent className="p-0 overflow-hidden">
              <AssistantChat
                projectId={projectId}
                pipelineId={selectedPipelineId ?? undefined}
              />
            </SidebarContent>
          </Sidebar>
        </div>

      {/* Create Pipeline Dialog */}
      <SavePipelineDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreatePipeline}
      />

      {/* Add/Edit Step Dialog */}
      {selectedPipelineId && selectedPipeline && (
        <AddStepDialog
          open={isAddStepDialogOpen}
          onOpenChange={(open) => {
            setIsAddStepDialogOpen(open);
            if (!open) setEditingStepIndex(null);
          }}
          onAddStep={handleAddStep}
          onEditStep={handleEditStep}
          availableColumns={availableColumns}
          editingStep={
            editingStepIndex !== null
              ? (selectedPipeline.steps[editingStepIndex] as TransformationStep)
              : null
          }
          uploadId={project.uploadId}
        />
      )}

      {/* Pipeline Settings Dialog */}
      {selectedPipelineId && selectedPipeline && (
        <PipelineSettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
          onSave={handleSaveSettings}
          currentConfig={selectedPipeline.parseConfig}
          isExcelFile={isExcelFile}
          projectId={projectId}
        />
      )}

      </div>
    </SidebarProvider>
  );
}
