"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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
  createTask,
  getTaskErrorMessage,
  updateTask,
} from "@/features/tasks/services/tasks.service"
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/types"

type TaskFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The task to edit. Omit to create a new task. */
  task?: Task | null
  onSaved?: () => void
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onSaved,
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the task details."
              : "Create a task and assign it to a teammate."}
          </DialogDescription>
        </DialogHeader>
        {/* Remounts with fresh values every time the dialog opens. */}
        <TaskForm
          key={task?.id ?? "new"}
          task={task}
          onSaved={() => {
            onOpenChange(false)
            onSaved?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({
  task,
  onSaved,
}: {
  task?: Task | null
  onSaved: () => void
}) {
  const [values, setValues] = React.useState<TaskInput>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "todo",
    priority: task?.priority ?? "medium",
    assigneeEmail: task?.assigneeEmail ?? "",
    dueDate: task?.dueDate ?? "",
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function set<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.title.trim()) {
      setError("Title is required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (task) {
        await updateTask(task.id, values)
        toast.success("Task updated")
      } else {
        await createTask(values)
        toast.success("Task created")
      }
      onSaved()
    } catch (err) {
      setError(getTaskErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="task-title">Title</FieldLabel>
          <Input
            id="task-title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="task-description">Description</FieldLabel>
          <Textarea
            id="task-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Add more details..."
            rows={4}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              items={TASK_STATUS_LABELS}
              value={values.status}
              onValueChange={(value) => {
                if (value) set("status", value as TaskStatus)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {TASK_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Priority</FieldLabel>
            <Select
              items={TASK_PRIORITY_LABELS}
              value={values.priority}
              onValueChange={(value) => {
                if (value) set("priority", value as TaskPriority)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {TASK_PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="task-assignee">Assignee email</FieldLabel>
            <Input
              id="task-assignee"
              type="email"
              value={values.assigneeEmail ?? ""}
              onChange={(e) => set("assigneeEmail", e.target.value)}
              placeholder="teammate@example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-due-date">Due date</FieldLabel>
            <Input
              id="task-due-date"
              type="date"
              value={values.dueDate ?? ""}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </Field>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2Icon className="animate-spin" />}
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
