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
import { deleteActivity } from "@/features/customers/services/activities.service"
import { getCustomerErrorMessage } from "@/features/customers/services/customers.service"
import { ACTIVITY_TYPE_LABELS, type Activity } from "@/features/customers/types"

type ActivityDeleteDialogProps = {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function ActivityDeleteDialog({
  activity,
  open,
  onOpenChange,
  onDeleted,
}: ActivityDeleteDialogProps) {
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (!activity) return
    setDeleting(true)
    try {
      await deleteActivity(activity.customerId, activity.id)
      toast.success("Activity deleted")
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      toast.error(getCustomerErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
          <AlertDialogDescription>
            This {activity ? ACTIVITY_TYPE_LABELS[activity.type].toLowerCase() : "activity"}{" "}
            will be permanently deleted. This action cannot be undone.
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
