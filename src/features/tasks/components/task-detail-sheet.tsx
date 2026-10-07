"use client"

import * as React from "react"
import {
  CalendarIcon,
  CircleUserRoundIcon,
  PencilIcon,
  SearchXIcon,
  Trash2Icon,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/features/tasks/components/task-badges"
import { TaskDeleteDialog } from "@/features/tasks/components/task-delete-dialog"
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog"
import {
  getTask,
  getTaskErrorMessage,
} from "@/features/tasks/services/tasks.service"
import {
  canDeleteTask,
  canEditTask,
  formatDueDate,
  isOverdue,
  type Task,
} from "@/features/tasks/types"

type TaskDetailSheetProps = {
  /** Id of the task to show. `null` closes the sheet. */
  taskId: string | null
  /** Shown immediately while the latest version is fetched. */
  initialTask?: Task
  onClose: () => void
  /** Called after the task was edited or deleted. */
  onChanged: () => void
}

export function TaskDetailSheet({
  taskId,
  initialTask,
  onClose,
  onChanged,
}: TaskDetailSheetProps) {
  // Keep rendering the last task while the sheet animates closed.
  const [shownId, setShownId] = React.useState(taskId)
  if (taskId && taskId !== shownId) {
    setShownId(taskId)
  }

  return (
    <Sheet
      open={taskId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="gap-0 data-[side=right]:sm:max-w-lg">
        {shownId && (
          <TaskDetailContent
            key={shownId}
            id={shownId}
            initialTask={initialTask}
            onChanged={onChanged}
            onDeleted={() => {
              onClose()
              onChanged()
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; task: Task | null }

function formatDateTime(date: Date | null) {
  return date
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—"
}

function TaskDetailContent({
  id,
  initialTask,
  onChanged,
  onDeleted,
}: {
  id: string
  initialTask?: Task
  onChanged: () => void
  onDeleted: () => void
}) {
  const { user } = useAuth()
  const [state, setState] = React.useState<DetailState>(() =>
    initialTask?.id === id
      ? { status: "ready", task: initialTask }
      : { status: "loading" }
  )
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const loadTask = React.useCallback(() => {
    return getTask(id)
      .then((task) => setState({ status: "ready", task }))
      .catch((err) =>
        setState({ status: "error", message: getTaskErrorMessage(err) })
      )
  }, [id])

  React.useEffect(() => {
    loadTask()
  }, [loadTask])

  if (state.status === "loading") {
    return (
      <>
        <SheetHeader>
          <SheetTitle>
            <Skeleton className="h-6 w-3/4" />
          </SheetTitle>
          <SheetDescription render={<div />}>
            <Skeleton className="h-4 w-1/2" />
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    )
  }

  if (state.status === "error" || !state.task) {
    return (
      <SheetHeader className="flex-1 items-center justify-center text-center">
        <SearchXIcon className="size-8 text-muted-foreground" />
        <SheetTitle>
          {state.status === "error" ? "Couldn't load task" : "Task not found"}
        </SheetTitle>
        <SheetDescription>
          {state.status === "error"
            ? state.message
            : "It may have been deleted."}
        </SheetDescription>
      </SheetHeader>
    )
  }

  const task = state.task
  const overdue = isOverdue(task)

  return (
    <>
      <SheetHeader className="gap-3 pr-12">
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <SheetTitle className="text-lg leading-snug">{task.title}</SheetTitle>
        <SheetDescription>
          Created by {task.createdByEmail ?? "unknown"} ·{" "}
          {formatDateTime(task.createdAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
        <dl className="grid gap-4 rounded-lg border p-4 text-sm">
          <div className="flex items-center gap-3">
            <dt className="flex w-28 shrink-0 items-center gap-2 text-muted-foreground">
              <CircleUserRoundIcon className="size-4" />
              Assignee
            </dt>
            <dd className="truncate">{task.assigneeEmail ?? "Unassigned"}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="flex w-28 shrink-0 items-center gap-2 text-muted-foreground">
              <CalendarIcon className="size-4" />
              Due date
            </dt>
            <dd className={overdue ? "font-medium text-destructive" : ""}>
              {formatDueDate(task.dueDate) ?? "No due date"}
              {overdue && " · Overdue"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Description</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {task.description || "No description."}
          </p>
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground">
          Last updated {formatDateTime(task.updatedAt)}
        </p>
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        <Button
          variant="destructive"
          disabled={!canDeleteTask(task, user)}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon />
          Delete
        </Button>
        <Button
          disabled={!canEditTask(task, user)}
          onClick={() => setEditOpen(true)}
        >
          <PencilIcon />
          Edit
        </Button>
      </SheetFooter>

      <TaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        onSaved={() => {
          loadTask()
          onChanged()
        }}
      />
      <TaskDeleteDialog
        task={task}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  )
}
