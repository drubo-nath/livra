import { z } from "zod";

export const paymentMethods = ["cod", "bkash", "nagad", "card"] as const;

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  // Contact phone: by default uses session phone; if alternate recipientPhone is provided, phoneVerificationToken is validated
  recipientPhone: z.string().trim().optional().or(z.literal("")),
  phoneVerificationToken: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(5, "Enter your full address").max(200),
  city: z.string().trim().min(2, "City is required").max(60),
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  paymentMethod: z.enum(paymentMethods),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        // Size availability is checked against the product row server-side.
        size: z.string().trim().min(1).max(12),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1, "Your bag is empty"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});
