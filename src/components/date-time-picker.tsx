"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"

type DateTimePickerProps = {
  value: Date | undefined
  onChange: (value: Date) => void
  onBlur?: () => void
  /** Applied to the date button so a `<label htmlFor>` focuses it. */
  id?: string
  "aria-invalid"?: boolean
  className?: string
}

/**
 * Date picker (Popover + Calendar) next to a time input, as in shadcn's
 * "Time Picker" example. Works with local `Date` values.
 */
export function DateTimePicker({
  value,
  onChange,
  onBlur,
  id,
  "aria-invalid": invalid,
  className,
}: DateTimePickerProps) {
  function handleDateChange(date: string) {
    const [year, month, day] = date.split("-").map(Number)
    const next = new Date(value ?? new Date(year, month - 1, day))
    next.setFullYear(year, month - 1, day)
    onChange(next)
  }

  function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Clearing the input gives "": keep the current time instead.
    if (!event.target.value) return
    const [hours, minutes] = event.target.value.split(":").map(Number)
    const next = new Date(value ?? new Date())
    next.setHours(hours, minutes, 0, 0)
    onChange(next)
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <DatePicker
        id={id}
        className="min-w-0 flex-1"
        value={value ? format(value, "yyyy-MM-dd") : ""}
        onChange={handleDateChange}
        onBlur={onBlur}
        aria-invalid={invalid}
      />
      {/* Wide enough for 12-hour "09 : 09 PM" plus Firefox's clock icon,
          which the webkit-only rule below can't hide. */}
      <Input
        type="time"
        aria-label="Time"
        className="w-36 shrink-0 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        value={value ? format(value, "HH:mm") : ""}
        onChange={handleTimeChange}
        onBlur={onBlur}
        aria-invalid={invalid}
      />
    </div>
  )
}
