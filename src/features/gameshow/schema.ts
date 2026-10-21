import { z } from "zod"

import { OPTION_IDS } from "@/features/gameshow/types"

/** Validation for the question form. Keep in sync with `firestore.rules`. */
export const questionFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Question is required.")
    .max(1000, "Question must be at most 1000 characters."),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Option is required.")
        .max(300, "Option must be at most 300 characters.")
    )
    .length(OPTION_IDS.length),
  correctOptionId: z.enum(OPTION_IDS),
  timeLimitSec: z
    .number({ error: "Enter a number of seconds." })
    .int("Use whole seconds.")
    .min(5, "At least 5 seconds.")
    .max(300, "At most 300 seconds."),
  explanation: z
    .string()
    .trim()
    .max(2000, "Explanation must be at most 2000 characters."),
  mcNotes: z
    .string()
    .trim()
    .max(2000, "Notes must be at most 2000 characters."),
})

export type QuestionFormValues = z.infer<typeof questionFormSchema>

export const gameTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be at most 200 characters.")
