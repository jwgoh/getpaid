"use client";

import { Paper, Skeleton, Stack } from "@mui/material";

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, width: "100%" }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            animation="wave"
            variant="text"
            width={`${100 / columns}%`}
            height={24}
          />
        ))}
      </Stack>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Stack key={rowIndex} direction="row" spacing={2} sx={{ py: 1.5 }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              animation="wave"
              variant="text"
              width={`${100 / columns}%`}
              height={20}
            />
          ))}
        </Stack>
      ))}
    </Paper>
  );
}
