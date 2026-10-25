# Per-Client Payment Allocation Policy — Questionnaire

Answer based ONLY on the policy demonstrated by the fixtures in `/app/fixtures/allocation/visible/`. Do not impose what you think the policy *should* be.

---

## Q1. When a payment is recorded against a client with multiple open invoices, what is the primary ordering by which invoices receive funds?

A. Smallest `total` first (clear small invoices first)
B. Earliest `dueAt` first; within the same `dueAt`, earliest `issuedAt` first
C. Earliest `issuedAt` first (FIFO by creation)
D. Largest outstanding balance first (most exposure first)

## Q2. Are invoices with status `DRAFT` eligible to receive any allocation?

A. Yes, drafts are treated identically to SENT invoices
B. Yes, but only if explicitly named in `targetInvoiceIds`
C. No — drafts are never allocated against, even when named in `targetInvoiceIds`
D. Only if the draft has a non-zero `paidAmount`

## Q3. When an invoice is `PARTIALLY_PAID` and another is `SENT`, and both have the same `dueAt`, which receives allocation first?

A. The `PARTIALLY_PAID` invoice — finish what was started
B. The `SENT` invoice — let new invoices clear first
C. Whichever has the lower `id` lexicographically
D. They are tied; allocation splits proportionally between them

## Q4. The payment amount exceeds the sum of all eligible open balances. What does the allocator do?

A. Throw an error — overpayment is rejected
B. Allocate up to each invoice's `total − paidAmount`, return the excess as `unappliedCents`
C. Allocate the full payment amount to the last-eligible invoice, ignoring its `total`
D. Split the excess proportionally across all eligible invoices

## Q5. The payment amount is $0.30 less than the sum of eligible open balances. After allocating to all-but-one fully, the remaining $0.30 lands on the last eligible invoice. How is rounding handled?

A. The cent amount is split proportionally across all touched invoices with banker's rounding
B. There is no rounding — allocations are always integer cents, and the last eligible invoice in policy order absorbs any integer remainder
C. The cent is rounded up and applied to the first invoice
D. The cent is dropped (returned as `unappliedCents`)

## Q6. Two `SENT` invoices have identical `dueAt` AND identical `issuedAt`. How is the tie broken?

A. By `total` ascending (smaller invoice first)
B. By `total` descending (larger invoice first)
C. By `id` ascending (sorted lexicographically)
D. By `id` descending (sorted lexicographically)

## Q7. A payment is recorded with `targetInvoiceIds: [i1, i2]`, where `i1` is a DRAFT and `i2` is SENT. What happens?

A. Both `i1` and `i2` receive allocation in the order listed
B. Only `i2` receives allocation; `i1` is silently dropped from the candidate set
C. The override is ignored and the policy runs against all of the client's open invoices
D. `PaymentAllocationError` is thrown because one of the target invoices is ineligible

## Q8. What does an explicitly supplied empty `targetInvoiceIds: []` mean, and how are duplicate IDs in `targetInvoiceIds` handled?

A. Empty list means no eligible invoices — returns empty allocations and full amount as `unappliedCents`; duplicate IDs cause double allocation
B. Empty list is equivalent to omitting `targetInvoiceIds` — allocate against all eligible open invoices; duplicate IDs in the list are ignored (deduplicated)
C. Empty list throws `PaymentAllocationError`
D. Duplicate IDs cause `PaymentAllocationError`
