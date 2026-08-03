// Policy for overdue-aging + dunning reminders.
// reminderOffsetDays: days-past-due at which reminder stages 1..N fire.
// maxReminders: stop after this many reminders per invoice.
// overdueInclusive: whether an invoice due exactly "now" counts as overdue.
export const DUNNING_POLICY = {
  reminderOffsetDays: [0, 7, 14],
  maxReminders: 3,
  overdueInclusive: false,
} as const;

export type DunningPolicy = typeof DUNNING_POLICY;
