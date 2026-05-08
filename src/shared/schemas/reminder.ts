import { z } from "zod";

import { REMINDER, REMINDER_MODE } from "@app/shared/config/config";

export const reminderDaysSchema = z.array(z.number());

export function parseReminderDays(value: unknown): number[] {
  const result = reminderDaysSchema.safeParse(value);

  return result.success && result.data.length > 0 ? result.data : [...REMINDER.DEFAULT_DAYS];
}

export const updateReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum([REMINDER_MODE.AFTER_SENT, REMINDER_MODE.AFTER_DUE]),
  delaysDays: z
    .array(z.number().min(REMINDER.MIN_DAYS).max(REMINDER.MAX_DAYS))
    .min(1)
    .max(REMINDER.MAX_REMINDER_COUNT),
});

export type UpdateReminderSettingsInput = z.infer<typeof updateReminderSettingsSchema>;

export type ReminderSettings = UpdateReminderSettingsInput;
