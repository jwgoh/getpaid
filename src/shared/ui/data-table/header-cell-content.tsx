"use client";

import { TableSortLabel } from "@mui/material";

import type { DataTableColumn } from "./types";

interface HeaderCellContentProps {
  col: DataTableColumn;
  sortColumn?: string;
  sortDirection: "asc" | "desc";
  onSort?: (column: string) => void;
}

export function HeaderCellContent({
  col,
  sortColumn,
  sortDirection,
  onSort,
}: HeaderCellContentProps) {
  if (col.renderHeader) {
    return <>{col.renderHeader()}</>;
  }

  if (col.sortable === false || !onSort) {
    return <span style={{ fontWeight: 600 }}>{col.label}</span>;
  }

  return (
    <TableSortLabel
      active={sortColumn === col.id}
      direction={sortColumn === col.id ? sortDirection : "asc"}
      onClick={() => onSort(col.id)}
      sx={{ fontWeight: 600 }}
    >
      {col.label}
    </TableSortLabel>
  );
}
