"use client";

import * as React from "react";

import { alpha, TableRow, useTheme } from "@mui/material";

import { UI } from "@app/shared/config/config";

interface DataTableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  selected?: boolean;
  focused?: boolean;
  height?: number;
  dataIndex?: number;
  sx?: Record<string, unknown>;
}

export function DataTableRow({
  children,
  onClick,
  onMouseEnter,
  selected,
  focused,
  height,
  dataIndex,
  sx,
}: DataTableRowProps) {
  const theme = useTheme();

  return (
    <TableRow
      hover
      selected={selected}
      data-index={dataIndex}
      data-focused={focused || undefined}
      sx={{
        cursor: onClick ? "pointer" : undefined,
        height,
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, UI.ALPHA_HOVER),
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
        },
        ...(focused && {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
          bgcolor: alpha(theme.palette.primary.main, UI.ALPHA_HOVER),
        }),
        ...sx,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {children}
    </TableRow>
  );
}
