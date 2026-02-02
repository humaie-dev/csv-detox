"use client";

import type { TransformationStep } from "@/lib/pipeline/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, Trash2, Plus, Pencil } from "lucide-react";

interface PipelineStepsProps {
  steps: TransformationStep[];
  selectedStepIndex?: number;
  onSelectStep?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onRemove?: (index: number) => void;
  onEdit?: (index: number) => void;
  onAddStep?: () => void;
}

export function PipelineSteps({
  steps,
  selectedStepIndex,
  onSelectStep,
  onMoveUp,
  onMoveDown,
  onRemove,
  onEdit,
  onAddStep,
}: PipelineStepsProps) {
  // Format step config for display
  const formatConfig = (step: TransformationStep): string => {
    const { config } = step;
    
    switch (config.type) {
      case "trim":
      case "uppercase":
      case "lowercase":
        return `Columns: ${config.columns.join(", ")}`;
      
      case "deduplicate":
        return config.columns 
          ? `Columns: ${config.columns.join(", ")}` 
          : "All columns";
      
      case "filter":
        return `${config.column} ${config.operator} ${config.value}`;
      
      case "rename_column":
        return `${config.oldName} → ${config.newName}`;
      
      case "remove_column":
        return `Remove: ${config.columns.join(", ")}`;
      
      default:
        return "";
    }
  };

  // Get human-readable operation name
  const getOperationName = (type: string): string => {
    const names: Record<string, string> = {
      trim: "Trim Whitespace",
      uppercase: "Uppercase",
      lowercase: "Lowercase",
      deduplicate: "Remove Duplicates",
      filter: "Filter Rows",
      rename_column: "Rename Column",
      remove_column: "Remove Columns",
    };
    return names[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pipeline Steps</CardTitle>
            <CardDescription>
              {steps.length === 0 
                ? "No transformation steps yet" 
                : `${steps.length} step${steps.length === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
          <Button onClick={onAddStep} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Click "Add Step" to start building your pipeline</p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isSelected = selectedStepIndex === index;
              const isFirst = index === 0;
              const isLast = index === steps.length - 1;

              return (
                <div
                  key={step.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-accent cursor-pointer"}
                  `}
                  onClick={() => onSelectStep?.(index)}
                >
                  {/* Step number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{step.type}</Badge>
                      <span className="font-medium">{getOperationName(step.type)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatConfig(step)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(index);
                      }}
                      title="Edit step"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp?.(index);
                      }}
                      disabled={isFirst}
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown?.(index);
                      }}
                      disabled={isLast}
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(index);
                      }}
                      title="Remove step"
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
  );
}
