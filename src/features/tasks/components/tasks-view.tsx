"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ClipboardListIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/features/tasks/components/task-badges"
import { TaskDeleteDialog } from "@/features/tasks/components/task-delete-dialog"
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet"
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog"
import {
  getTaskErrorMessage,
  getTasks,
} from "@/features/tasks/services/tasks.service"
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  canDeleteTask,
  canEditTask,
  formatDueDate,
  isOverdue,
  type Task,
  type TaskStatus,
} from "@/features/tasks/types"

const SCOPE_LABELS = {
  all: "All tasks",
  assigned: "Assigned to me",
  created: "Created by me",
}
type Scope = keyof typeof SCOPE_LABELS

type ListState = {
  tasks: Task[]
  loading: boolean
  error: string | null
}

/** Link to the tasks page with the detail sheet open for `id`. */
function taskHref(id: string) {
  return `/tasks?task=${encodeURIComponent(id)}`
}

export function TasksView() {
  const { user } = useAuth()
  const router = useRouter()
  // The open task lives in the URL so it can be shared and survives reloads.
  const selectedId = useSearchParams().get("task")
  const [state, setState] = React.useState<ListState>({
    tasks: [],
    loading: true,
    error: null,
  })
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<TaskStatus | "all">("all")
  const [scope, setScope] = React.useState<Scope>("all")
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Task | null>(null)
  const [deleting, setDeleting] = React.useState<Task | null>(null)

  const loadTasks = React.useCallback(() => {
    return getTasks()
      .then((tasks) => setState({ tasks, loading: false, error: null }))
      .catch((err) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: getTaskErrorMessage(err),
        }))
      )
  }, [])

  React.useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const userEmail = user?.email?.toLowerCase()
  const visibleTasks = state.tasks.filter((task) => {
    if (status !== "all" && task.status !== status) return false
    if (scope === "assigned" && task.assigneeEmail !== userEmail) return false
    if (scope === "created" && task.createdBy !== user?.uid) return false
    const term = search.trim().toLowerCase()
    return (
      !term ||
      task.title.toLowerCase().includes(term) ||
      task.assigneeEmail?.includes(term)
    )
  })

  const countByStatus = (value: TaskStatus) =>
    state.tasks.filter((task) => task.status === value).length

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            Create tasks and assign them to your team.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onValueChange={(value) => setStatus(value as TaskStatus | "all")}
        >
          <TabsList>
            <TabsTrigger value="all">All ({state.tasks.length})</TabsTrigger>
            {TASK_STATUSES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TASK_STATUS_LABELS[value]} ({countByStatus(value)})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Select
            items={SCOPE_LABELS}
            value={scope}
            onValueChange={(value) => {
              if (value) setScope(value as Scope)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-56 pl-8"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.loading ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="px-4">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : state.error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="text-destructive">{state.error}</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setState((current) => ({ ...current, loading: true }))
                      loadTasks()
                    }}
                  >
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            ) : visibleTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ClipboardListIcon className="size-8" />
                    {state.tasks.length === 0
                      ? "No tasks yet. Create the first one."
                      : "No tasks match your filters."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visibleTasks.map((task) => (
                <TableRow
                  key={task.id}
                  data-state={task.id === selectedId ? "selected" : undefined}
                >
                  <TableCell className="max-w-80 pl-4">
                    <Link
                      href={taskHref(task.id)}
                      replace
                      scroll={false}
                      className="block truncate font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>
                    <TaskPriorityBadge priority={task.priority} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.assigneeEmail ?? "Unassigned"}
                  </TableCell>
                  <TableCell
                    className={
                      isOverdue(task)
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {formatDueDate(task.dueDate) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground data-open:bg-muted"
                          />
                        }
                      >
                        <EllipsisVerticalIcon />
                        <span className="sr-only">Open menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                          onClick={() =>
                            router.replace(taskHref(task.id), { scroll: false })
                          }
                        >
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canEditTask(task, user)}
                          onClick={() => openEdit(task)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!canDeleteTask(task, user)}
                          onClick={() => setDeleting(task)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TaskDetailSheet
        taskId={selectedId}
        initialTask={state.tasks.find((task) => task.id === selectedId)}
        onClose={() => router.replace("/tasks", { scroll: false })}
        onChanged={loadTasks}
      />
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onSaved={loadTasks}
      />
      <TaskDeleteDialog
        task={deleting}
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onDeleted={loadTasks}
      />
    </div>
  )
}
