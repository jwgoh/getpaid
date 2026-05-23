"use client";

import * as React from "react";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, TableCell, Tooltip } from "@mui/material";

interface DataTableActionsProps {
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  ariaLabel?: string;
}

export function DataTableActions({ onMenuOpen, ariaLabel = "Actions" }: DataTableActionsProps) {
  return (
    <TableCell>
      <Tooltip title="Actions">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen(e);
          }}
          sx={{ color: "text.secondary" }}
          aria-label={ariaLabel}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </TableCell>
  );
}
