"use client";

import { useState, type DragEvent, type ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UploadResult {
  fileId: string;
  originalName: string;
  sanitizedName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export default function HomePage() {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const uploadFile = useMutation(api.uploads.uploadFile);

  const handleFileUpload = async (file: File) => {
    setUploadState("uploading");
    setErrorMessage("");
    setUploadResult(null);

    try {
      // Step 1: Get a short-lived upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload the file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await result.json();

      // Step 3: Save the file metadata in the database
      const uploadMetadata = await uploadFile({
        storageId,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      });

      setUploadState("success");
      setUploadResult(uploadMetadata);
    } catch (error: unknown) {
      setUploadState("error");
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Upload failed");
      }
      console.error("Upload error:", error);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
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
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <main>
      <h1>CSV Detox</h1>
      <p>Upload your CSV or Excel file to get started.</p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? "#0070f3" : "#ccc"}`,
          borderRadius: 8,
          padding: 40,
          marginTop: 24,
          textAlign: "center",
          backgroundColor: isDragging ? "#f0f8ff" : "#fafafa",
          transition: "all 0.2s ease",
        }}
      >
        <input
          type="file"
          id="file-input"
          accept=".csv,.xlsx"
          onChange={handleFileSelect}
          disabled={uploadState === "uploading"}
          style={{ display: "none" }}
        />
        
        <label
          htmlFor="file-input"
          style={{
            cursor: uploadState === "uploading" ? "not-allowed" : "pointer",
            display: "inline-block",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>
            {uploadState === "uploading" ? "Uploading..." : "Drop file here or click to browse"}
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            Supports CSV and XLSX files up to 50MB
          </div>
        </label>
      </div>

      {uploadState === "error" && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: 4,
            color: "#c00",
          }}
        >
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {uploadState === "success" && uploadResult && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: "#efe",
            border: "1px solid #cfc",
            borderRadius: 4,
            color: "#060",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Upload Successful!</h3>
          <div style={{ fontSize: 14 }}>
            <div><strong>File ID:</strong> {uploadResult.fileId}</div>
            <div><strong>Original Name:</strong> {uploadResult.originalName}</div>
            <div><strong>Size:</strong> {formatFileSize(uploadResult.size)}</div>
            <div><strong>Type:</strong> {uploadResult.mimeType}</div>
            <div><strong>Uploaded:</strong> {new Date(uploadResult.uploadedAt).toLocaleString()}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <a
              href={`/preview/${uploadResult.fileId}`}
              style={{
                display: "inline-block",
                padding: "8px 16px",
                backgroundColor: "#060",
                color: "white",
                textDecoration: "none",
                borderRadius: 4,
                fontWeight: "bold",
              }}
            >
              Transform Data →
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
