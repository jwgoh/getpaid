import { z } from "zod";

import { BRANDING, INVOICE } from "@app/shared/config/config";
import { DISCOUNT_TYPE } from "@app/shared/config/invoice-status";
import { calculateTotals } from "@app/shared/lib/calculations";

import { dateSchema, optionalDateSchema } from "./date";
import { SCHEMA_LIMITS } from "./limits";
import { lineItemGroupSchema, lineItemSchema } from "./line-item";

export const invoiceItemSchema = lineItemSchema;
export const invoiceItemGroupSchema = lineItemGroupSchema;

const tagSchema = z.string().min(1).max(SCHEMA_LIMITS.TAG_MAX);

export const invoiceTagsSchema = z.array(z.string());

export function parseInvoiceTags(value: unknown): string[] {
  const result = invoiceTagsSchema.safeParse(value);

  return result.success ? result.data : [];
}

export const discountTypeSchema = z.nativeEnum(DISCOUNT_TYPE);

export const discountSchema = z
  .object({
    type: discountTypeSchema,
    value: z.number().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS),
  })
  .superRefine((discount, ctx) => {
    if (
      discount.type === DISCOUNT_TYPE.PERCENTAGE &&
      discount.value > SCHEMA_LIMITS.MAX_DISCOUNT_PERCENT
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage discount cannot exceed 100%",
        path: ["value"],
      });
    }
  })
  .nullable()
  .optional();

interface InvoiceTotalsInput {
  items?: { quantity: number; unitPrice: number }[];
  itemGroups?: { items: { quantity: number; unitPrice: number }[] }[];
  discount?: { type: DiscountType; value: number } | null;
  taxRate?: number;
}

function refineInvoiceTotalsCeiling(data: InvoiceTotalsInput, ctx: z.RefinementCtx): void {
  if (!data.items && !data.itemGroups) {
    return;
  }

  const allItems = [
    ...(data.items ?? []),
    ...(data.itemGroups?.flatMap((group) => group.items) ?? []),
  ];
  const { subtotal, total } = calculateTotals(allItems, data.discount, data.taxRate);

  if (subtotal > SCHEMA_LIMITS.MONEY_MAX_CENTS || total > SCHEMA_LIMITS.MONEY_MAX_CENTS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invoice total is too large",
      path: ["items"],
    });
  }
}

interface InvoiceItemCountInput {
  items: ReadonlyArray<unknown>;
  itemGroups?: ReadonlyArray<{ items: ReadonlyArray<unknown> }>;
}

function hasAtLeastOneItem(data: InvoiceItemCountInput): boolean {
  const ungroupedCount = data.items.length;
  const groupedCount = data.itemGroups?.reduce((sum, g) => sum + g.items.length, 0) ?? 0;

  return ungroupedCount + groupedCount > 0;
}

function atLeastOneItemMessage(): { message: string; path: PropertyKey[] } {
  return { message: "At least one item is required", path: ["items"] };
}

const itemsSchema = z
  .array(invoiceItemSchema)
  .max(SCHEMA_LIMITS.INVOICE_ITEMS_MAX, "Too many line items");

const itemGroupsSchema = z
  .array(invoiceItemGroupSchema)
  .max(SCHEMA_LIMITS.INVOICE_ITEM_GROUPS_MAX, "Too many item groups")
  .optional();

const invoiceCommonFields = {
  itemGroups: itemGroupsSchema,
  tags: z.array(tagSchema).optional(),
  discount: discountSchema,
  taxRate: z.number().min(0).max(INVOICE.MAX_TAX_RATE).optional(),
} as const;

export const invoiceFormSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    currency: z.string().min(1, "Currency is required").max(SCHEMA_LIMITS.CURRENCY_CODE_MAX),
    dueDate: z.string().min(1, "Due date is required"),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    items: itemsSchema,
    notes: z.string().max(SCHEMA_LIMITS.INVOICE_NOTES_MAX).optional(),
    message: z.string().max(SCHEMA_LIMITS.INVOICE_MESSAGE_MAX).optional(),
    ...invoiceCommonFields,
  })
  .refine(hasAtLeastOneItem, atLeastOneItemMessage())
  .superRefine(refineInvoiceTotalsCeiling)
  .refine(
    (data) => {
      if (data.periodStart && data.periodEnd) {
        return data.periodEnd >= data.periodStart;
      }

      return true;
    },
    { message: "Period end must be after period start", path: ["periodEnd"] }
  );

export const createInvoiceSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    currency: z.string().max(SCHEMA_LIMITS.CURRENCY_CODE_MAX).default(BRANDING.DEFAULT_CURRENCY),
    dueDate: dateSchema,
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
    items: itemsSchema,
    notes: z.string().max(SCHEMA_LIMITS.INVOICE_NOTES_MAX).optional(),
    message: z.string().max(SCHEMA_LIMITS.INVOICE_MESSAGE_MAX).optional(),
    ...invoiceCommonFields,
  })
  .refine(hasAtLeastOneItem, atLeastOneItemMessage())
  .superRefine(refineInvoiceTotalsCeiling);

export const updateInvoiceSchema = z
  .object({
    clientId: z.string().optional(),
    currency: z.string().max(SCHEMA_LIMITS.CURRENCY_CODE_MAX).optional(),
    dueDate: dateSchema.optional(),
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
    items: itemsSchema.optional(),
    notes: z.string().max(SCHEMA_LIMITS.INVOICE_NOTES_MAX).optional().nullable(),
    message: z.string().max(SCHEMA_LIMITS.INVOICE_MESSAGE_MAX).optional().nullable(),
    ...invoiceCommonFields,
  })
  .superRefine((data, ctx) => {
    if ((data.items === undefined) !== (data.itemGroups === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "items and itemGroups must be provided together",
        path: data.items === undefined ? ["items"] : ["itemGroups"],
      });
    }
  })
  .superRefine(refineInvoiceTotalsCeiling);

export type DiscountType = z.infer<typeof discountTypeSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type InvoiceItemGroupInput = z.infer<typeof invoiceItemGroupSchema>;
export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
