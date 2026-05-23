import { NextResponse } from "next/server";

import { z } from "zod";

import { asUserId } from "@app/shared/types/ids";

import { parseBody, withAuth } from "@app/server/api/route-helpers";
import { getTimeEntries } from "@app/server/time-tracking";
import { timeTrackingErrorHandlers } from "@app/server/time-tracking/api-errors";

const timeEntriesSchema = z.object({
  provider: z.string().min(1),
  workspaceId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectIds: z.array(z.string()).optional(),
  grouping: z.enum(["projects", "clients", "tasks", "descriptions"]),
  subGrouping: z.enum(["projects", "clients", "tasks", "descriptions"]),
  roundingMinutes: z.number().int().min(0).optional(),
  billableOnly: z.boolean().optional(),
});

export const POST = withAuth(async (user, request) => {
  const { data, error } = await parseBody(request, timeEntriesSchema);

  if (error) {
    return error;
  }

  const result = await getTimeEntries(asUserId(user.id), data.provider, {
    workspaceId: data.workspaceId,
    startDate: data.startDate,
    endDate: data.endDate,
    projectIds: data.projectIds,
    grouping: data.grouping,
    subGrouping: data.subGrouping,
    roundingMinutes: data.roundingMinutes,
    billableOnly: data.billableOnly,
  });

  return NextResponse.json(result);
}, timeTrackingErrorHandlers);
