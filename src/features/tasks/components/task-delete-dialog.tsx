"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  deleteTask,
  getTaskErrorMessage,
} from "@/features/tasks/services/tasks.service"
import type { Task } from "@/features/tasks/types"

type TaskDeleteDialogProps = {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function TaskDeleteDialog({
  task,
  open,
  onOpenChange,
  onDeleted,
}: TaskDeleteDialogProps) {
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      await deleteTask(task.id)
      toast.success("Task deleted")
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      toast.error(getTaskErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{task?.title}&rdquo; will be permanently deleted. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting && <Loader2Icon className="animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
