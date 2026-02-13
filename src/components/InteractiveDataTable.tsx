"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParseResult } from "@/lib/parsers/types";

interface InteractiveDataTableProps {
  data: ParseResult;
  maxRows?: number;
  enableInteraction?: boolean;
}

type SortDirection = "asc" | "desc" | null;

interface ColumnState {
  visible: boolean;
  order: number;
}

export function InteractiveDataTable({
  data,
  maxRows = 100,
  enableInteraction = false,
}: InteractiveDataTableProps) {
  // Column visibility and order state
  const [columnStates, setColumnStates] = useState<Record<string, ColumnState>>(() => {
    const states: Record<string, ColumnState> = {};
    data.columns.forEach((col, index) => {
      states[col.name] = { visible: true, order: index };
    });
    return states;
  });

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filter state
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return data.columns
      .filter((col) => columnStates[col.name]?.visible !== false)
      .sort((a, b) => (columnStates[a.name]?.order ?? 0) - (columnStates[b.name]?.order ?? 0));
  }, [data.columns, columnStates]);

  // Apply sorting and filtering
  const processedRows = useMemo(() => {
    let rows = [...data.rows];

    // Apply filters
    if (Object.keys(columnFilters).length > 0) {
      rows = rows.filter((row) => {
        return Object.entries(columnFilters).every(([col, filterValue]) => {
          if (!filterValue) return true;
          const value = row[col];
          const stringValue = value === null || value === undefined ? "" : String(value);
          return stringValue.toLowerCase().includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      rows.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        // Handle null/undefined
        if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;

        // Compare values
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        const comparison = aStr.localeCompare(bStr);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return rows;
  }, [data.rows, columnFilters, sortColumn, sortDirection]);

  const displayRows = processedRows.slice(0, maxRows);
  const hasMoreRows = processedRows.length > maxRows;
  const totalFilteredRows = processedRows.length;

  // Toggle column visibility
  const toggleColumnVisibility = (columnName: string) => {
    setColumnStates((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        visible: !prev[columnName]?.visible,
      },
    }));
  };

  // Handle column header click for sorting
  const handleSort = (columnName: string) => {
    if (!enableInteraction) return;

    if (sortColumn === columnName) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnName);
      setSortDirection("asc");
    }
  };

  // Handle filter change
  const handleFilterChange = (columnName: string, value: string) => {
    setColumnFilters((prev) => {
      if (!value) {
        const { [columnName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnName]: value };
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setColumnFilters({});
  };

  // Get type badge color
  const getTypeBadgeVariant = (
    type: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
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

  const visibleColumnCount = visibleColumns.length;
  const hiddenColumnCount = data.columns.length - visibleColumnCount;
  const activeFilterCount = Object.keys(columnFilters).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              {totalFilteredRows !== data.rowCount && (
                <span className="font-medium text-foreground">
                  {totalFilteredRows.toLocaleString()} filtered /{" "}
                </span>
              )}
              {data.rowCount.toLocaleString()} rows × {visibleColumnCount} columns
              {hiddenColumnCount > 0 && ` (${hiddenColumnCount} hidden)`}
              {hasMoreRows && ` • showing first ${maxRows}`}
            </CardDescription>
          </div>
          {enableInteraction && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Search className="mr-2 h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {data.columns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.name}
                      checked={columnStates[col.name]?.visible !== false}
                      onCheckedChange={() => toggleColumnVisibility(col.name)}
                    >
                      {col.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(columnFilters).map(([col, value]) => (
                <Badge key={col} variant="secondary" className="gap-1 pr-1">
                  <span className="font-medium">{col}:</span> {value}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleFilterChange(col, "")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    {visibleColumns.map((col) => (
                      <TableHead key={col.name} className="min-w-[150px]">
                        <div className="space-y-1">
                          <div
                            className={`flex items-center gap-2 ${
                              enableInteraction ? "cursor-pointer select-none" : ""
                            }`}
                            onClick={() => handleSort(col.name)}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{col.name}</span>
                              <Badge
                                variant={getTypeBadgeVariant(col.type)}
                                className="w-fit text-xs"
                              >
                                {col.type}
                              </Badge>
                            </div>
                            {enableInteraction && (
                              <div className="ml-auto">
                                {sortColumn === col.name ? (
                                  sortDirection === "asc" ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                          {showFilters && enableInteraction && (
                            <Input
                              placeholder="Filter..."
                              value={columnFilters[col.name] || ""}
                              onChange={(e) => handleFilterChange(col.name, e.target.value)}
                              className="h-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-24 text-center">
                        {activeFilterCount > 0 ? "No results found" : "No data available"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayRows.map((row, rowIndex) => (
                      <TableRow key={`row-${rowIndex}-${JSON.stringify(row)}`}>
                        {visibleColumns.map((col) => {
                          const value = row[col.name];
                          const displayValue =
                            value === null || value === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : (
                              String(value)
                            );

                          return <TableCell key={col.name}>{displayValue}</TableCell>;
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        {data.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-yellow-600">Warnings:</p>
            {data.warnings.map((warning, i) => (
              <p key={`warning-${i}-${warning}`} className="text-sm text-yellow-600">
                • {warning}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
