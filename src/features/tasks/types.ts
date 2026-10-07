export const TASK_STATUSES = ["todo", "in_progress", "done"] as const
export const TASK_PRIORITIES = ["low", "medium", "high"] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

/** Fields the user can edit. */
export type TaskInput = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  /** Email of the person the task is assigned to. */
  assigneeEmail: string | null
  /** Calendar date in `YYYY-MM-DD` format (stored as a Timestamp in Firestore). */
  dueDate: string | null
}

export type Task = TaskInput & {
  id: string
  createdBy: string
  createdByEmail: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type CurrentUser = { uid: string; email: string | null } | null

/** Mirrors the Firestore rules: the creator or the assignee may edit. */
export function canEditTask(task: Task, user: CurrentUser) {
  if (!user) return false
  return (
    task.createdBy === user.uid ||
    (!!user.email && task.assigneeEmail === user.email.toLowerCase())
  )
}

/** Mirrors the Firestore rules: only the creator may delete. */
export function canDeleteTask(task: Task, user: CurrentUser) {
  return !!user && task.createdBy === user.uid
}

export function formatDueDate(dueDate: string | null) {
  if (!dueDate) return null
  const [year, month, day] = dueDate.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function isOverdue(task: Pick<Task, "dueDate" | "status">) {
  if (!task.dueDate || task.status === "done") return false
  const [year, month, day] = task.dueDate.split("-").map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(year, month - 1, day) < today
}
