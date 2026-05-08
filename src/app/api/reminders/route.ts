import { NextResponse } from "next/server";

import { REMINDER, REMINDER_MODE } from "@app/shared/config/config";
import { updateReminderSettingsSchema } from "@app/shared/schemas";

import { parseBody, withAuth } from "@app/server/api/route-helpers";
import { createOrUpdateFollowUpRule, getFollowUpRule } from "@app/server/followups";

export const GET = withAuth(async (user) => {
  const rule = await getFollowUpRule(user.id);

  if (!rule) {
    return NextResponse.json({
      enabled: false,
      mode: REMINDER_MODE.AFTER_DUE,
      delaysDays: [...REMINDER.DEFAULT_DAYS],
    });
  }

  return NextResponse.json({
    enabled: rule.enabled,
    mode: rule.mode,
    delaysDays: rule.delaysDays,
  });
});

export const PUT = withAuth(async (user, request) => {
  const { data, error } = await parseBody(request, updateReminderSettingsSchema);

  if (error) {
    return error;
  }

  const rule = await createOrUpdateFollowUpRule(user.id, data);

  return NextResponse.json({
    enabled: rule.enabled,
    mode: rule.mode,
    delaysDays: rule.delaysDays,
  });
});
