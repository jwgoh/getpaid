# Incident response template

Use this checklist when production breaks. Fork it per incident — keep one copy per incident under `docs/runbooks/incidents/<YYYY-MM-DD>-<short-slug>.md` (or wherever the operator chooses).

## Detect

- [ ] Time of detection (UTC):
- [ ] Detection source: customer report / monitoring alert / self-discovered / other
- [ ] Initial symptom in plain English:

## Triage (first 15 minutes)

- [ ] Confirm the symptom is real (reproduce in incognito; not just one user / browser cache).
- [ ] Estimate scope: how many users / accounts / endpoints affected?
- [ ] Check Vercel runtime logs for the relevant time window — copy the most representative error stack here.
- [ ] Check the `EmailOutbox` table for stuck rows (see `oncall.md`).
- [ ] Check Resend dashboard if email-related.
- [ ] Decide: hotfix in place vs roll-back vs throttle (e.g. disable the affected feature flag).

## Communicate

- [ ] Update affected users via the same channel they reported through (email, GitHub issue, Twitter).
- [ ] If `pro` instance and >5 users affected: post a brief incident note on the public status page (placeholder — none today).

## Mitigate

- [ ] Apply the chosen mitigation (rollback, hotfix, env-var change). Reference the `deployment.md` runbook for the exact steps.
- [ ] If a backup restore was required: note the backup file path and the data-loss window (time between last backup and incident start).
- [ ] Verify the mitigation worked (smoke-test the affected flow).

## Resolve

- [ ] Time of resolution (UTC):
- [ ] Mean time to resolution (MTTR):
- [ ] Confirm with original reporter if applicable.

## Post-incident review

Within 48 hours of resolution, fill in:

### What happened

A factual narrative of the incident — start to end, in chronological order.

### Root cause

The actual underlying issue (not the symptom). If multiple contributing causes, list each with its weight.

### What went well

- Detection time
- Tooling that helped
- Decisions that worked

### What went poorly

- Detection delay
- Tooling gaps (e.g. "no request IDs in logs forced manual grep")
- Decisions that worsened the situation

### Action items

| Action | Owner | Due | Tracking |
| ------ | ----- | --- | -------- |
|        |       |     |          |

Each action item should map to either:

- A new GitHub issue (link here), or
- An ADR if it's a one-way-door change to architecture.

### Timeline

Use UTC timestamps + bullet points:

- 03:00 — symptom first appears (Vercel logs)
- 03:14 — customer email
- 03:18 — operator paged / starts triage
- 03:25 — root cause hypothesised
- 03:31 — rollback initiated
- 03:35 — service restored
- 03:38 — verified with reporter

## Don't do

- Don't blame individuals. The incident is a property of the system, not a property of the person who pressed the button.
- Don't skip the post-incident review. The action items are the primary value of the incident itself.
- Don't bypass `deployment.md`'s backup-before-migration step under time pressure. The backup is what saves the next incident.
