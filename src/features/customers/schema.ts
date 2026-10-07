import { z } from "zod"

import {
  ACTIVITY_TYPES,
  CALL_QUALITIES,
  CUSTOMER_PRIORITIES,
  CUSTOMER_STATUSES,
  activityHasContent,
} from "@/features/customers/types"

/** Validation for the customer form. Keep in sync with `firestore.rules`. */
export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(200, "Name must be at most 200 characters."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .pipe(z.email("Enter a valid email address.")),
  status: z.enum(CUSTOMER_STATUSES),
  priority: z.enum(CUSTOMER_PRIORITIES),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters."),
  assignedTo: z.string().nullable(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export const customerFormDefaults: CustomerFormValues = {
  name: "",
  email: "",
  status: "active",
  priority: "medium",
  description: "",
  assignedTo: null,
}

/** Validation for the activity form. Keep in sync with `firestore.rules`. */
export const activityFormSchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    date: z.date({ error: "Date and time are required." }),
    callQuality: z.enum(CALL_QUALITIES).nullable(),
    content: z
      .string()
      .trim()
      .max(5000, "Content must be at most 5000 characters."),
    note: z.string().trim().max(2000, "Note must be at most 2000 characters."),
  })
  .refine(
    (values) => !activityHasContent(values.type) || values.content.length > 0,
    {
      message: "Content is required.",
      path: ["content"],
      // Also run when other fields are invalid, so all errors show at once.
      when: (payload) => {
        const values = payload.value as { type?: unknown; content?: unknown }
        return typeof values.content === "string" && !!values.type
      },
    }
  )

export type ActivityFormValues = z.infer<typeof activityFormSchema>
