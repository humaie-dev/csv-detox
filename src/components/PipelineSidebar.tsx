"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { TransformationStep } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PipelineSidebarProps {
  currentPipelineId: Id<"pipelines">;
  onLoadPipeline: (steps: TransformationStep[]) => void;
}

export function PipelineSidebar({
  currentPipelineId,
  onLoadPipeline,
}: PipelineSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const pipelines = useQuery(api.pipelines.listAll);
  const deletePipeline = useMutation(api.pipelines.remove);
  
  const { toast } = useToast();
  const router = useRouter();

  const handleLoad = (id: Id<"pipelines">, steps: any[]) => {
    // Navigate to the pipeline route
    router.push(`/pipeline/${id}`);
  };

  const handleDelete = async (id: Id<"pipelines">, name: string) => {
    if (!confirm(`Delete pipeline "${name}"?`)) {
      return;
    }

    try {
      await deletePipeline({ id });
      
      toast({
        title: "Pipeline deleted",
        description: `"${name}" has been deleted.`,
      });
      
      // If we deleted the current pipeline, redirect to home
      if (currentPipelineId === id) {
        router.push("/");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete pipeline",
        variant: "destructive",
      });
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card className="w-80 border-r border-t-0 rounded-none h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Pipelines</CardTitle>
              <CardDescription>All saved pipelines</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => router.push("/create-pipeline")}
            size="sm"
            className="w-full mt-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Pipeline
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {!pipelines || pipelines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No pipelines yet</p>
              <p className="mt-2">Click "Create Pipeline" to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pipelines.map((pipeline) => {
                const isActive = currentPipelineId === pipeline._id;
                return (
                  <div
                    key={pipeline._id}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-colors
                      ${isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"}
                    `}
                    onClick={() => handleLoad(pipeline._id, pipeline.steps)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pipeline.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pipeline.steps.length} step{pipeline.steps.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(pipeline._id, pipeline.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
