"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { DateTimePicker } from "@/components/date-time-picker"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ACTIVITY_ICONS } from "@/features/customers/components/activity-icons"
import {
  activityFormSchema,
  type ActivityFormValues,
} from "@/features/customers/schema"
import {
  createActivity,
  updateActivity,
} from "@/features/customers/services/activities.service"
import { getCustomerErrorMessage } from "@/features/customers/services/customers.service"
import {
  ACTIVITY_DATE_LABELS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  CALL_QUALITIES,
  CALL_QUALITY_LABELS,
  activityHasContent,
  activityHasNote,
  type Activity,
  type ActivityType,
} from "@/features/customers/types"

type ActivityFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  /** The activity to edit. Omit to log a new activity. */
  activity?: Activity | null
  onSaved?: () => void
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  customerId,
  activity,
  onSaved,
}: ActivityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit activity" : "Log activity"}</DialogTitle>
          <DialogDescription>
            Record a call, email, meeting or note for this customer.
          </DialogDescription>
        </DialogHeader>
        {/* Remounts with fresh values every time the dialog opens. */}
        <ActivityForm
          key={activity?.id ?? "new"}
          customerId={customerId}
          activity={activity}
          onSaved={() => {
            onOpenChange(false)
            onSaved?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function startOfCurrentMinute() {
  const now = new Date()
  now.setSeconds(0, 0)
  return now
}

function toFormValues(activity?: Activity | null): ActivityFormValues {
  if (!activity) {
    return {
      type: "call",
      date: startOfCurrentMinute(),
      callQuality: null,
      content: "",
      note: "",
    }
  }
  return {
    type: activity.type,
    date: activity.date,
    callQuality: activity.callQuality,
    content: activity.content,
    note: activity.note,
  }
}

const CALL_QUALITY_ITEMS = [
  { label: "Not rated", value: null },
  ...CALL_QUALITIES.map((quality) => ({
    label: CALL_QUALITY_LABELS[quality],
    value: quality,
  })),
]

function ActivityForm({
  customerId,
  activity,
  onSaved,
}: {
  customerId: string
  activity?: Activity | null
  onSaved: () => void
}) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: toFormValues(activity),
  })
  const { isSubmitting, errors } = form.formState
  const type = useWatch({ control: form.control, name: "type" })

  async function onSubmit(values: ActivityFormValues) {
    try {
      if (activity) {
        await updateActivity(customerId, activity.id, values)
        toast.success("Activity updated")
      } else {
        await createActivity(customerId, values)
        toast.success("Activity logged")
      }
      onSaved()
    } catch (err) {
      form.setError("root", { message: getCustomerErrorMessage(err) })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="type"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Type</FieldLabel>
              <ToggleGroup
                variant="outline"
                className="w-full"
                value={[field.value]}
                onValueChange={(value) => {
                  // Ignore clicks that would leave nothing selected.
                  if (value[0]) field.onChange(value[0] as ActivityType)
                }}
              >
                {ACTIVITY_TYPES.map((value) => (
                  <ToggleGroupItem key={value} value={value} className="flex-1">
                    {ACTIVITY_ICONS[value]}
                    {ACTIVITY_TYPE_LABELS[value]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="activity-date">
                {ACTIVITY_DATE_LABELS[type]}
              </FieldLabel>
              <DateTimePicker
                id="activity-date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        {type === "call" && (
          <Controller
            name="callQuality"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Call quality</FieldLabel>
                <Select
                  items={CALL_QUALITY_ITEMS}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_QUALITY_ITEMS.map((item) => (
                      <SelectItem
                        key={item.value ?? "none"}
                        value={item.value}
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}
        {activityHasContent(type) && (
          <Controller
            name="content"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="activity-content">Content</FieldLabel>
                <Textarea
                  {...field}
                  id="activity-content"
                  placeholder={
                    type === "email"
                      ? "What was the email about?"
                      : type === "meeting"
                        ? "What was discussed?"
                        : "Write a note..."
                  }
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}
        {activityHasNote(type) && (
          <Controller
            name="note"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="activity-note">Note</FieldLabel>
                <Textarea
                  {...field}
                  id="activity-note"
                  placeholder="Optional follow-up notes..."
                  rows={2}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}
        {errors.root && <FieldError>{errors.root.message}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {activity ? "Save changes" : "Log activity"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
