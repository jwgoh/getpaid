import { z } from "zod";

import { SCHEMA_LIMITS } from "./limits";

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(SCHEMA_LIMITS.CLIENT_NAME_MAX),
  email: z.email("Invalid email address").max(SCHEMA_LIMITS.EMAIL_MAX),
  defaultRate: z.number().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS).optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(SCHEMA_LIMITS.CLIENT_NAME_MAX),
  email: z.email("Invalid email address").max(SCHEMA_LIMITS.EMAIL_MAX),
  defaultRate: z.number().int().min(0).max(SCHEMA_LIMITS.MONEY_MAX_CENTS).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type ClientFormInput = z.infer<typeof clientFormSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
