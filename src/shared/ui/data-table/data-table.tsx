"use client";

import * as React from "react";

import {
  alpha,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  useTheme,
} from "@mui/material";

import { PAGINATION, UI } from "@app/shared/config/config";

import { HeaderCellContent } from "./header-cell-content";
import type { DataTableColumn } from "./types";

interface DataTablePagination {
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface DataTableProps {
  columns: DataTableColumn[];
  children: React.ReactNode;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  pagination?: DataTablePagination;
  footer?: React.ReactNode;
  stickyHeader?: boolean;
  maxHeight?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function DataTable({
  columns,
  children,
  sortColumn,
  sortDirection = "asc",
  onSort,
  pagination,
  footer,
  stickyHeader,
  maxHeight,
  containerRef,
  onKeyDown,
}: DataTableProps) {
  const theme = useTheme();

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }} onKeyDown={onKeyDown}>
      <TableContainer
        ref={containerRef}
        tabIndex={onKeyDown ? 0 : undefined}
        sx={{
          maxHeight,
          outline: "none",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
          },
          "& .MuiTableHead-root": {
            bgcolor: alpha(theme.palette.primary.main, UI.ALPHA_HOVER),
          },
        }}
      >
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  sortDirection={sortColumn === col.id ? sortDirection : false}
                  sx={col.hideOnMobile ? { display: { xs: "none", md: "table-cell" } } : undefined}
                >
                  <HeaderCellContent
                    col={col}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={onSort}
                  />
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 600, width: UI.TABLE_ACTION_WIDTH }} />
            </TableRow>
          </TableHead>
          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
      {footer}
      {!footer && pagination && (
        <TablePagination
          component="div"
          count={pagination.totalCount}
          page={pagination.page}
          onPageChange={pagination.onPageChange}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
          rowsPerPageOptions={[...PAGINATION.PAGE_SIZE_OPTIONS]}
        />
      )}
    </Paper>
  );
}
