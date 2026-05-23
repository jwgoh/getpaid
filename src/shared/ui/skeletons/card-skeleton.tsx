"use client";

import { Box, Skeleton } from "@mui/material";

export function CardSkeleton() {
  return (
    <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 3 }}>
      <Skeleton animation="wave" variant="text" width="60%" height={28} sx={{ mb: 2 }} />
      <Skeleton animation="wave" variant="text" width="100%" height={20} />
      <Skeleton animation="wave" variant="text" width="80%" height={20} />
      <Skeleton animation="wave" variant="text" width="40%" height={20} sx={{ mt: 2 }} />
    </Box>
  );
}
