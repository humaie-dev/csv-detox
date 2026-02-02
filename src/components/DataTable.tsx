import type { ParseResult } from "@/lib/parsers/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataTableProps {
  data: ParseResult;
  maxRows?: number;
}

export function DataTable({ data, maxRows = 100 }: DataTableProps) {
  const displayRows = data.rows.slice(0, maxRows);
  const hasMoreRows = data.rows.length > maxRows;

  // Get type badge color
  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "number":
        return "default";
      case "string":
        return "secondary";
      case "boolean":
        return "outline";
      case "date":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Preview</CardTitle>
        <CardDescription>
          {data.rowCount.toLocaleString()} rows × {data.columns.length} columns
          {hasMoreRows && ` (showing first ${maxRows})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {data.columns.map((col) => (
                  <TableHead key={col.name}>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{col.name}</span>
                      <Badge variant={getTypeBadgeVariant(col.type)} className="w-fit text-xs">
                        {col.type}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={data.columns.length} className="h-24 text-center">
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {data.columns.map((col) => {
                      const value = row[col.name];
                      const displayValue = value === null || value === undefined 
                        ? <span className="text-muted-foreground italic">null</span>
                        : String(value);
                      
                      return (
                        <TableCell key={col.name}>
                          {displayValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-yellow-600">Warnings:</p>
            {data.warnings.map((warning, i) => (
              <p key={i} className="text-sm text-yellow-600">
                • {warning}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
