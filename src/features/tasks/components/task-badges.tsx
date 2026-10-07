import { CircleCheckIcon, CircleDashedIcon, CircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/types"

const STATUS_ICONS = {
  todo: <CircleIcon />,
  in_progress: <CircleDashedIcon />,
  done: <CircleCheckIcon className="fill-green-500 text-white dark:fill-green-400 dark:text-background" />,
} satisfies Record<TaskStatus, React.ReactNode>

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {STATUS_ICONS[status]}
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}

const PRIORITY_VARIANTS = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
} as const satisfies Record<TaskPriority, string>

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANTS[priority]}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  )
}
