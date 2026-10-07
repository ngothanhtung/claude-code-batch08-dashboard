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
  deleteCustomer,
  getCustomerErrorMessage,
} from "@/features/customers/services/customers.service"
import type { Customer } from "@/features/customers/types"

type CustomerDeleteDialogProps = {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function CustomerDeleteDialog({
  customer,
  open,
  onOpenChange,
  onDeleted,
}: CustomerDeleteDialogProps) {
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (!customer) return
    setDeleting(true)
    try {
      await deleteCustomer(customer.id)
      toast.success("Customer deleted")
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
          <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{customer?.name}&rdquo; will be permanently deleted. This
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
