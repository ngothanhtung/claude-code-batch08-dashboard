"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  questionFormSchema,
  type QuestionFormValues,
} from "@/features/gameshow/schema"
import {
  createQuestion,
  getGameErrorMessage,
  updateQuestion,
} from "@/features/gameshow/services/gameshow.service"
import {
  DEFAULT_TIME_LIMIT_SEC,
  OPTION_IDS,
  type Question,
} from "@/features/gameshow/types"

type QuestionFormDialogProps = {
  gameId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The question to edit. Omit to add one at `nextOrder`. */
  question?: Question | null
  nextOrder: number
}

export function QuestionFormDialog({
  gameId,
  open,
  onOpenChange,
  question,
  nextOrder,
}: QuestionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{question ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>
            Only the director, MC and judges can see the correct answer.
          </DialogDescription>
        </DialogHeader>
        {/* Remounts with fresh values every time the dialog opens. */}
        <QuestionForm
          key={question?.id ?? "new"}
          gameId={gameId}
          question={question}
          nextOrder={nextOrder}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function toFormValues(question?: Question | null): QuestionFormValues {
  if (!question) {
    return {
      text: "",
      options: OPTION_IDS.map(() => ""),
      correctOptionId: "A",
      timeLimitSec: DEFAULT_TIME_LIMIT_SEC,
      explanation: "",
      mcNotes: "",
    }
  }
  return {
    text: question.text,
    options: OPTION_IDS.map(
      (id) => question.options.find((option) => option.id === id)?.text ?? ""
    ),
    correctOptionId: question.correctOptionId,
    timeLimitSec: question.timeLimitSec,
    explanation: question.explanation,
    mcNotes: question.mcNotes,
  }
}

function QuestionForm({
  gameId,
  question,
  nextOrder,
  onSaved,
}: {
  gameId: string
  question?: Question | null
  nextOrder: number
  onSaved: () => void
}) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: toFormValues(question),
  })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: QuestionFormValues) {
    try {
      if (question) {
        await updateQuestion(gameId, question.id, values)
        toast.success("Question updated")
      } else {
        await createQuestion(gameId, values, nextOrder)
        toast.success("Question added")
      }
      onSaved()
    } catch (err) {
      form.setError("root", { message: getGameErrorMessage(err) })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="text"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="question-text">Question</FieldLabel>
              <Textarea
                {...field}
                id="question-text"
                rows={3}
                aria-invalid={fieldState.invalid}
                autoFocus
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTION_IDS.map((id, index) => (
            <Controller
              key={id}
              name={`options.${index}`}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`question-option-${id}`}>
                    Option {id}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`question-option-${id}`}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            name="correctOptionId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Correct answer</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                >
                  <SelectTrigger className="w-full" onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTION_IDS.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="timeLimitSec"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="question-time">Time limit (seconds)</FieldLabel>
                <Input
                  {...field}
                  id="question-time"
                  type="number"
                  min={5}
                  max={300}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <Controller
          name="explanation"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="question-explanation">Explanation</FieldLabel>
              <Textarea
                {...field}
                id="question-explanation"
                rows={2}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Shown to the MC after the answer is revealed.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="mcNotes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="question-notes">MC notes</FieldLabel>
              <Textarea
                {...field}
                id="question-notes"
                rows={2}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {errors.root && <FieldError>{errors.root.message}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {question ? "Save" : "Add question"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
