/**
 * React hooks for accessing SQLite-backed API routes
 */

import { useState, useEffect } from "react";
import type { ColumnMetadata } from "@/lib/parsers/types";

/**
 * Fetch raw project data from SQLite
 */
export function useProjectData(projectId: string | null, options?: { limit?: number; offset?: number }) {
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{ offset: number; limit: number; total: number } | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData([]);
      setColumns([]);
      setPagination(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(options?.limit ?? 100),
          offset: String(options?.offset ?? 0),
        });

        const response = await fetch(`/api/projects/${projectId}/data?${params}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch project data");
        }

        const result = await response.json();
        setData(result.data);
        setColumns(result.columns);
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setData([]);
        setColumns([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, options?.limit, options?.offset]);

  return { data, columns, loading, error, pagination };
}

/**
 * Fetch column metadata for a project
 */
export function useColumns(projectId: string | null) {
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setColumns([]);
      return;
    }

    const fetchColumns = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/columns`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch columns");
        }

        const result = await response.json();
        setColumns(result.columns);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch columns");
        setColumns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchColumns();
  }, [projectId]);

  return { columns, loading, error };
}

interface UsePipelinePreviewOptions {
  projectId: string | null;
  pipelineId: string | null;
  upToStep?: number | null; // -1 for raw data, null/undefined for all steps
  enabled?: boolean;
}

/**
 * Execute pipeline preview and fetch results
 */
export function usePipelinePreview({
  projectId,
  pipelineId,
  upToStep,
  enabled = true,
}: UsePipelinePreviewOptions) {
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);

  useEffect(() => {
    if (!projectId || !pipelineId || !enabled) {
      return;
    }

    const executePreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/pipelines/${pipelineId}/preview`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ upToStep }),
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to execute pipeline preview");
        }

        const result = await response.json();
        setData(result.data);
        setColumns(result.columns);
        setRowCount(result.rowCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to execute preview");
        setData([]);
        setColumns([]);
        setRowCount(0);
      } finally {
        setLoading(false);
      }
    };

    executePreview();
  }, [projectId, pipelineId, upToStep, enabled]);

  const refetch = async () => {
    if (!projectId || !pipelineId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/pipelines/${pipelineId}/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ upToStep }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to execute pipeline preview");
      }

      const result = await response.json();
      setData(result.data);
      setColumns(result.columns);
      setRowCount(result.rowCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute preview");
      setData([]);
      setColumns([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { data, columns, loading, error, rowCount, refetch };
}
