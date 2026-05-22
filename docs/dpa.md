# Data Processing Agreement

This document is a placeholder DPA template for `pro` operators serving EU data subjects under GDPR Article 28. It is not legal advice — operators must consult counsel before signing or relying on this template.

## When you need a DPA

If your `pro` instance has any of the following, you need a written DPA with each sub-processor and you should publish a customer-facing DPA:

- EU or UK customers (or customers whose end-recipients are EU/UK).
- Customers whose internal compliance requires Article 28 attestation.
- Any plan to position the service for B2B / SaaS contract terms.

If your instance is `community`-only and the operator and the data subjects are in the same jurisdiction with no Article 28 cross-border processor, a DPA is typically not required.

## Sub-processors used by GetPaid

GetPaid invokes these sub-processors at runtime; operators carrying EU data must reflect them in their customer-facing DPA:

| Sub-processor                                        | Purpose                      | Data transferred                                                                             | Region                                  | Notes                                                                        |
| ---------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| Resend                                               | Transactional email delivery | Recipient email, sender name, invoice contents, public viewer URL                            | US (default) or EU (opt-in via API key) | Operator should sign Resend's DPA + opt into the EU region for EU recipients |
| Postgres host (Neon / Supabase / Vercel / self-host) | Database                     | All persisted user data                                                                      | Operator's choice                       | Sign the host's DPA + select an EU region for EU data                        |
| Hosting provider (Vercel / Docker host)              | Application runtime          | Same as Postgres                                                                             | Operator's choice                       | Same                                                                         |
| Toggl Track                                          | Time-tracking integration    | Per-user opt-in only; only the user's own Toggl token is stored on GetPaid's side, encrypted | Estonia / EU                            | Per-user; user holds their own Toggl account                                 |

When you change sub-processors (e.g. migrate Postgres host), notify your customers per the DPA's sub-processor change clause.

## Template clauses

Use this as a starting point and have counsel review it. Replace `[Operator]` with the legal entity operating the `pro` instance and `[Customer]` with the contracting customer.

### 1. Subject matter and scope

This DPA forms part of the agreement between [Operator] (Processor) and [Customer] (Controller) for the processing of Personal Data via the GetPaid software-as-a-service. This DPA reflects the parties' agreement with regard to the processing of Personal Data in accordance with the GDPR.

### 2. Roles and responsibilities

[Customer] is the Controller of the Personal Data processed via the service. [Operator] is the Processor and processes Personal Data only on documented instructions from [Customer], including with regard to transfers of Personal Data to a third country.

### 3. Categories of data and data subjects

- **Categories of data subjects.** End-customers (clients) of [Customer]; users invited or permitted by [Customer] to access the service.
- **Categories of Personal Data.** Email addresses, names, billing addresses, tax identification numbers, invoice line-item content, payment metadata.
- **Special categories.** None expected. [Customer] must not upload special-category data via free-text fields.

### 4. Sub-processors

[Operator] uses the sub-processors listed in Annex A. [Operator] gives [Customer] notice of any intended addition or replacement of sub-processors at least 30 days in advance and gives [Customer] the right to object on reasonable grounds related to data protection.

### 5. International transfers

Where Personal Data is transferred outside the EEA / UK to a country without an adequacy decision, the parties rely on Standard Contractual Clauses (SCCs) and any supplementary measures necessary.

### 6. Security

[Operator] implements the technical and organisational measures listed in Annex B (encryption in transit and at rest, access control, logging, breach response).

### 7. Data subject rights

[Operator] shall, taking into account the nature of the processing, assist [Customer] by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of [Customer]'s obligation to respond to requests for exercising the data subject's rights laid down in Chapter III of the GDPR.

> **Implementation note.** Self-service data export and erasure endpoints are not yet implemented in GetPaid — a known, tracked gap. Until those land, [Operator] commits to fulfilling Article 15 / 17 / 20 requests within 30 days via manual SQL operations.

### 8. Personal data breach notification

[Operator] notifies [Customer] without undue delay after becoming aware of a Personal Data breach, with sufficient information to allow [Customer] to meet any obligations to report or inform Data Subjects of the Personal Data breach.

### 9. Audit rights

[Customer] has the right to audit [Operator]'s compliance with this DPA, subject to reasonable advance notice and confidentiality obligations.

### 10. Data return and deletion

On termination of the service, [Operator] returns or deletes all Personal Data processed on behalf of [Customer], at [Customer]'s choice. Deletion is confirmed in writing.

### Annex A — sub-processors

See the table at the top of this document.

### Annex B — Technical and organisational measures

Refer to `docs/privacy.md` (Security baseline) for the operative posture. Operators may extend with their own measures (SOC 2 attestation, ISO 27001, etc.) when applicable.

## Open work

- Self-service data export endpoint.
- Self-service data erasure with anonymisation flow.
- Automated sub-processor change notification (operator-side; not in code).
