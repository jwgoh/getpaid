"use client";

import TimerIcon from "@mui/icons-material/Timer";
import { Button, Stack } from "@mui/material";

import type { InvoiceFormInput } from "@app/shared/schemas";
import type { Cents } from "@app/shared/types/money";

import type { ImportedGroup } from "../api";
import { useTimeTrackingConnections, useTimeTrackingProviders } from "../hooks";
import { useImportDrawer } from "../hooks/use-import-drawer";
import { mapImportedGroups } from "../lib/import-utils";
import { ImportDrawer } from "./import-drawer";

interface TimeTrackingImportSectionProps {
  onImport: (groups: NonNullable<InvoiceFormInput["itemGroups"]>) => void;
  getpaidRateCents: Cents;
}

export function TimeTrackingImportSection({
  onImport,
  getpaidRateCents,
}: TimeTrackingImportSectionProps) {
  const { data: providers } = useTimeTrackingProviders();
  const { data: connections } = useTimeTrackingConnections();
  const importDrawer = useImportDrawer(connections, providers);

  const handleImport = (groups: ImportedGroup[]) => {
    onImport(mapImportedGroups(groups));
  };

  if (!importDrawer.hasConnection) {
    return null;
  }

  return (
    <>
      <Stack direction="row" sx={{ mb: 3, mt: -2 }}>
        <Button
          variant="outlined"
          startIcon={<TimerIcon />}
          onClick={() => importDrawer.setOpen(true)}
          size="small"
        >
          Import time
        </Button>
      </Stack>

      {importDrawer.provider && (
        <ImportDrawer
          open={importDrawer.open}
          onClose={() => importDrawer.setOpen(false)}
          providerId={importDrawer.providerId}
          provider={importDrawer.provider}
          getpaidRateCents={getpaidRateCents}
          onImport={handleImport}
        />
      )}
    </>
  );
}
