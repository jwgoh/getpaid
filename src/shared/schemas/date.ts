import { z } from "zod";

const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime());

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((value) => new Date(value))
  .refine(isValidDate, "Invalid date");

export const optionalDateSchema = z
  .string()
  .or(z.date())
  .transform((value) => new Date(value))
  .refine(isValidDate, "Invalid date")
  .optional()
  .nullable();
