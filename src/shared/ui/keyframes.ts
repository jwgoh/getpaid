import { keyframes } from "@mui/material";

import { UI } from "@app/shared/config/config";

export const fadeSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(${UI.PAGE_TRANSITION_OFFSET}px);
  }
  to {
    opacity: 1;
    transform: none;
  }
`;
