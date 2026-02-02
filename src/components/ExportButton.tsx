/**
 * Export Button Component
 * Allows users to download transformed data as CSV
 */

"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateCSV, sanitizeExportFilename } from "@/lib/export/csv";
import type { ParseResult } from "@/lib/parsers/types";

interface ExportButtonProps {
  data: ParseResult | null;
  originalFilename: string;
  disabled?: boolean;
}

export function ExportButton({ data, originalFilename, disabled }: ExportButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (!data) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "No data available to export.",
      });
      return;
    }

    try {
      // Generate CSV content
      const csvContent = generateCSV(data);

      // Create blob
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const sanitizedFilename = sanitizeExportFilename(originalFilename);
      const filename = `${sanitizedFilename}.csv`;

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      URL.revokeObjectURL(url);

      // Show success toast
      toast({
        title: "Export Successful",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || !data}
      variant="default"
      size="default"
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
