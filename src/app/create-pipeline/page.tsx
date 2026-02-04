"use client";

import { useState, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Upload, ArrowLeft } from "lucide-react";

export default function CreatePipelinePage() {
  const router = useRouter();
  const [pipelineName, setPipelineName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "creating" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const uploadFile = useMutation(api.uploads.uploadFile);
  const createPipeline = useMutation(api.pipelines.create);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage("");
    
    // Auto-generate pipeline name from filename if empty
    if (!pipelineName) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setPipelineName(nameWithoutExt);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleCreate = async () => {
    if (!file || !pipelineName.trim()) {
      setErrorMessage("Please provide a pipeline name and select a file");
      return;
    }

    setUploadState("uploading");
    setErrorMessage("");

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await result.json();

      // Step 3: Save file metadata
      const uploadMetadata = await uploadFile({
        storageId,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      });

      // Step 4: Create pipeline
      setUploadState("creating");
      const pipelineId = await createPipeline({
        uploadId: uploadMetadata.fileId as Id<"uploads">,
        name: pipelineName.trim(),
        steps: [],
      });

      // Step 5: Navigate to the new pipeline
      router.push(`/pipeline/${pipelineId}`);
    } catch (error: unknown) {
      setUploadState("error");
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to create pipeline");
      }
      console.error("Create pipeline error:", error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isLoading = uploadState === "uploading" || uploadState === "creating";

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Pipeline</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file and give your pipeline a name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pipeline Name Input */}
          <div className="space-y-2">
            <Label htmlFor="pipeline-name">Pipeline Name</Label>
            <Input
              id="pipeline-name"
              placeholder="e.g., Sales Data Cleanup"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              disabled={isLoading}
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              {pipelineName.length}/50 characters
            </p>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Data File</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-border"}
                ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <input
                type="file"
                id="file-input"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInputChange}
                disabled={isLoading}
                className="hidden"
              />
              
              <label
                htmlFor="file-input"
                className={`block ${isLoading ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                
                {file ? (
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(file.size)} • {file.type || "Unknown type"}
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      disabled={isLoading}
                      className="mt-2"
                    >
                      Choose different file
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-base mb-2">
                      Drop file here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports CSV and Excel files up to 50MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className="p-4 border border-destructive bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={!file || !pipelineName.trim() || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {uploadState === "uploading" ? "Uploading..." : "Creating Pipeline..."}
              </>
            ) : (
              "Create Pipeline"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
