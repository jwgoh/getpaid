"use client";

import { Box, Skeleton, Stack } from "@mui/material";

export function InvoiceItemSkeleton() {
  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: "center", py: 2 }}>
      <Skeleton animation="wave" variant="rounded" width={80} height={24} />
      <Box sx={{ flex: 1 }}>
        <Skeleton animation="wave" variant="text" width="40%" height={20} />
        <Skeleton animation="wave" variant="text" width="25%" height={16} />
      </Box>
      <Skeleton animation="wave" variant="text" width={80} height={20} />
      <Skeleton animation="wave" variant="text" width={100} height={20} />
      <Skeleton animation="wave" variant="rounded" width={70} height={24} />
    </Stack>
  );
}
