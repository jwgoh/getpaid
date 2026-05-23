"use client";

import { Box, Skeleton, Stack } from "@mui/material";

import { UI } from "@app/shared/config/config";

export function StatSkeleton() {
  return (
    <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Skeleton
          animation="wave"
          variant="circular"
          width={UI.SKELETON_AVATAR_SIZE}
          height={UI.SKELETON_AVATAR_SIZE}
        />
      </Stack>
      <Skeleton animation="wave" variant="text" width="50%" height={16} sx={{ mb: 1 }} />
      <Skeleton animation="wave" variant="text" width="70%" height={36} />
    </Box>
  );
}
