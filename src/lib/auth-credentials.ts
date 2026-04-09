import { z } from "zod";

export const credentialsSignInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const credentialsSignUpSchema = credentialsSignInSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
});

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
