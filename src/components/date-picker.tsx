"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/** `YYYY-MM-DD` → local Date, or undefined if empty. */
function parseDate(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** Local Date → `YYYY-MM-DD`. */
function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

type DatePickerProps = Omit<
  React.ComponentProps<typeof Button>,
  "value" | "onChange"
> & {
  /** Calendar date in `YYYY-MM-DD` format, or "" when empty. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** shadcn date picker (Popover + Calendar) that works with `YYYY-MM-DD` strings. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            data-empty={!selected}
            className={cn(
              "justify-start font-normal data-[empty=true]:text-muted-foreground",
              className
            )}
            {...props}
          />
        }
      >
        <CalendarIcon />
        {selected ? format(selected, "PPP") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            // Clicking the selected day again deselects it; keep a value instead.
            if (!date) return
            onChange(formatDate(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
