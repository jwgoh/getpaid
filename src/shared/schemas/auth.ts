import { z } from "zod";

import { SCHEMA_LIMITS } from "./limits";

export const signUpSchema = z.object({
  email: z.email("Invalid email address").max(SCHEMA_LIMITS.EMAIL_MAX),
  password: z
    .string()
    .min(SCHEMA_LIMITS.PASSWORD_MIN, "Password must be at least 8 characters")
    .max(SCHEMA_LIMITS.PASSWORD_MAX, "Password must be at most 128 characters"),
});

export const signInSchema = z.object({
  email: z.email("Invalid email address").max(SCHEMA_LIMITS.EMAIL_MAX),
  password: z
    .string()
    .min(1, "Password is required")
    .max(SCHEMA_LIMITS.PASSWORD_MAX, "Password must be at most 128 characters"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
