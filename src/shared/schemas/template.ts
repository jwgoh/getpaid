import { z } from "zod";

import { BRANDING, INVOICE, VALIDATION } from "@app/shared/config/config";
import { DISCOUNT_TYPE, type DiscountTypeValue } from "@app/shared/config/invoice-status";

import { SCHEMA_LIMITS } from "./limits";
import { lineItemGroupSchema, lineItemSchema } from "./line-item";

export const templateItemSchema = lineItemSchema;
export const templateItemGroupSchema = lineItemGroupSchema;

export const createTemplateSchema = z
  .object({
    name: z.string().min(1).max(SCHEMA_LIMITS.TEMPLATE_NAME_MAX),
    description: z.string().max(SCHEMA_LIMITS.TEMPLATE_DESCRIPTION_MAX).optional(),
    currency: z.string().max(SCHEMA_LIMITS.CURRENCY_CODE_MAX).default(BRANDING.DEFAULT_CURRENCY),
    discount: z
      .object({
        type: z.nativeEnum(DISCOUNT_TYPE),
        value: z.number().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS),
      })
      .optional(),
    taxRate: z.number().min(0).max(INVOICE.MAX_TAX_RATE).optional(),
    notes: z.string().max(SCHEMA_LIMITS.TEMPLATE_NOTES_MAX).optional(),
    dueDays: z.number().min(1).max(VALIDATION.MAX_DUE_DAYS).optional(),
    items: z.array(lineItemSchema),
    itemGroups: z.array(lineItemGroupSchema).optional(),
  })
  .refine(
    (data) => {
      const ungroupedCount = data.items.length;
      const groupedCount = data.itemGroups?.reduce((sum, g) => sum + g.items.length, 0) ?? 0;

      return ungroupedCount + groupedCount > 0;
    },
    { message: "At least one item is required", path: ["items"] }
  );

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(SCHEMA_LIMITS.TEMPLATE_NAME_MAX).optional(),
  description: z.string().max(SCHEMA_LIMITS.TEMPLATE_DESCRIPTION_MAX).optional(),
  currency: z.string().max(SCHEMA_LIMITS.CURRENCY_CODE_MAX).optional(),
  discount: z
    .object({
      type: z.nativeEnum(DISCOUNT_TYPE),
      value: z.number().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS),
    })
    .nullable()
    .optional(),
  taxRate: z.number().min(0).max(INVOICE.MAX_TAX_RATE).optional(),
  notes: z.string().max(SCHEMA_LIMITS.TEMPLATE_NOTES_MAX).optional(),
  dueDays: z.number().min(1).max(VALIDATION.MAX_DUE_DAYS).optional(),
  items: z.array(lineItemSchema).optional(),
  itemGroups: z.array(lineItemGroupSchema).optional(),
});

export const templateFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(SCHEMA_LIMITS.TEMPLATE_NAME_MAX),
    description: z.string().max(SCHEMA_LIMITS.TEMPLATE_DESCRIPTION_MAX).optional(),
    currency: z.string().min(1, "Currency is required").max(SCHEMA_LIMITS.CURRENCY_CODE_MAX),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED, ""]).optional(),
    discountValue: z.number().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS).optional(),
    taxRate: z.number().min(0).max(INVOICE.MAX_TAX_RATE).optional(),
    notes: z.string().max(SCHEMA_LIMITS.TEMPLATE_NOTES_MAX).optional(),
    dueDays: z.number().min(1, "Due days must be at least 1").max(VALIDATION.MAX_DUE_DAYS),
    items: z.array(lineItemSchema),
    itemGroups: z.array(lineItemGroupSchema).optional(),
  })
  .refine(
    (data) => {
      const ungroupedCount = data.items.length;
      const groupedCount = data.itemGroups?.reduce((sum, g) => sum + g.items.length, 0) ?? 0;

      return ungroupedCount + groupedCount > 0;
    },
    { message: "At least one item is required", path: ["items"] }
  );

export type TemplateItem = z.infer<typeof templateItemSchema>;
export type TemplateFormData = z.infer<typeof templateFormSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export interface TemplateResponseItem {
  id: string;
  templateId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
}

export interface TemplateResponseItemGroup {
  id: string;
  templateId: string;
  title: string;
  sortOrder: number;
  items: TemplateResponseItem[];
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  discountType: DiscountTypeValue | null;
  discountValue: number;
  taxRate: number;
  notes: string | null;
  dueDays: number;
  createdAt: string;
  updatedAt: string;
  items: TemplateResponseItem[];
  itemGroups: TemplateResponseItemGroup[];
}
