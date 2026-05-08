import { z } from "zod";

import { BRANDING, VALIDATION } from "@app/shared/config/config";

import { SCHEMA_LIMITS } from "./limits";

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const httpsUrlSchema = z
  .string()
  .url("Logo URL must be a valid URL")
  .max(SCHEMA_LIMITS.LOGO_URL_MAX, "Logo URL is too long")
  .refine((value) => value.startsWith("https://"), {
    message: "Logo URL must use HTTPS",
  });

export const senderProfileFormSchema = z
  .object({
    companyName: z.string().max(SCHEMA_LIMITS.COMPANY_NAME_MAX).optional(),
    displayName: z.string().max(SCHEMA_LIMITS.DISPLAY_NAME_MAX).optional(),
    emailFrom: z.string().max(SCHEMA_LIMITS.EMAIL_MAX).optional(),
    address: z.string().max(SCHEMA_LIMITS.ADDRESS_MAX).optional(),
    taxId: z.string().max(SCHEMA_LIMITS.TAX_ID_MAX).optional(),
    defaultCurrency: z.string().max(SCHEMA_LIMITS.CURRENCY_CODE_MAX),
    defaultRate: z.number().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS).optional(),
  })
  .refine((data) => data.companyName || data.displayName, {
    message: "Either company name or display name is required",
    path: ["companyName"],
  });

export const FONT_FAMILY_OPTIONS = ["system", "serif", "mono"] as const;

export const brandingSchema = z.object({
  logoUrl: httpsUrlSchema.optional().or(z.literal("")),
  primaryColor: z.string().regex(hexColorRegex, "Invalid hex color").optional(),
  accentColor: z.string().regex(hexColorRegex, "Invalid hex color").optional(),
  footerText: z.string().max(VALIDATION.MAX_FOOTER_TEXT_LENGTH).optional().or(z.literal("")),
  fontFamily: z.enum(FONT_FAMILY_OPTIONS).optional().or(z.literal("")),
  invoicePrefix: z
    .string()
    .max(VALIDATION.MAX_PREFIX_LENGTH)
    .regex(/^[A-Za-z0-9]*$/, "Only letters and numbers allowed")
    .optional()
    .or(z.literal("")),
});

export const senderProfileSchema = z.object({
  companyName: z.string().max(SCHEMA_LIMITS.COMPANY_NAME_MAX).optional(),
  displayName: z.string().max(SCHEMA_LIMITS.DISPLAY_NAME_MAX).optional(),
  emailFrom: z.string().max(SCHEMA_LIMITS.EMAIL_MAX).optional(),
  address: z.string().max(SCHEMA_LIMITS.ADDRESS_MAX).optional(),
  taxId: z.string().max(SCHEMA_LIMITS.TAX_ID_MAX).optional(),
  defaultCurrency: z
    .string()
    .max(SCHEMA_LIMITS.CURRENCY_CODE_MAX)
    .default(BRANDING.DEFAULT_CURRENCY),
  logoUrl: httpsUrlSchema.optional().or(z.literal("")),
  primaryColor: z.string().regex(hexColorRegex, "Invalid hex color").optional(),
  accentColor: z.string().regex(hexColorRegex, "Invalid hex color").optional(),
  footerText: z.string().max(SCHEMA_LIMITS.FOOTER_TEXT_MAX).optional(),
  fontFamily: z.string().max(SCHEMA_LIMITS.FONT_FAMILY_MAX).optional(),
  invoicePrefix: z
    .string()
    .max(VALIDATION.MAX_PREFIX_LENGTH)
    .regex(/^[A-Za-z0-9]*$/, "Only letters and numbers allowed")
    .optional(),
  defaultRate: z.number().int().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS).optional(),
});

export const createSenderProfileSchema = senderProfileSchema.refine(
  (data) =>
    (data.companyName && data.companyName.length > 0) ||
    (data.displayName && data.displayName.length > 0),
  {
    message: "Either company name or display name is required",
    path: ["companyName"],
  }
);

export type FontFamilyOption = (typeof FONT_FAMILY_OPTIONS)[number];
export type SenderProfileFormInput = z.infer<typeof senderProfileFormSchema>;
export type SenderProfileInput = z.infer<typeof senderProfileSchema>;
