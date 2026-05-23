import type * as React from "react";

export interface DataTableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  align?: "left" | "right";
  renderHeader?: () => React.ReactNode;
}
