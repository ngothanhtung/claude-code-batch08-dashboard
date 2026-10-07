"use client"

import * as React from "react"
import { CircleUserRoundIcon, MailIcon, SearchXIcon } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomerActivities } from "@/features/customers/components/customer-activities"
import { CustomerFiles } from "@/features/customers/components/customer-files"
import {
  CustomerPriorityBadge,
  CustomerStatusBadge,
} from "@/features/customers/components/customer-badges"
import type { Customer } from "@/features/customers/types"
import { getUserLabel, type UserProfile } from "@/features/users/types"

type CustomerDetailSheetProps = {
  /** Id of the customer to show. `null` closes the sheet. */
  customerId: string | null
  /** The customer from the loaded list; undefined while loading or if missing. */
  customer: Customer | undefined
  loading: boolean
  users: UserProfile[]
  onClose: () => void
}

export function CustomerDetailSheet({
  customerId,
  customer,
  loading,
  users,
  onClose,
}: CustomerDetailSheetProps) {
  // Keep rendering the last customer while the sheet animates closed.
  const [shown, setShown] = React.useState(customer)
  if (customer && customer !== shown) {
    setShown(customer)
  }
  const current = customerId ? customer : shown

  return (
    <Sheet
      open={customerId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="gap-0 data-[side=right]:sm:max-w-xl">
        {current ? (
          <CustomerDetailContent
            key={current.id}
            customer={current}
            users={users}
          />
        ) : loading ? (
          <SheetHeader>
            <SheetTitle>
              <Skeleton className="h-6 w-3/4" />
            </SheetTitle>
            <SheetDescription render={<div />}>
              <Skeleton className="h-4 w-1/2" />
            </SheetDescription>
          </SheetHeader>
        ) : (
          <SheetHeader className="flex-1 items-center justify-center text-center">
            <SearchXIcon className="size-8 text-muted-foreground" />
            <SheetTitle>Customer not found</SheetTitle>
            <SheetDescription>It may have been deleted.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function CustomerDetailContent({
  customer,
  users,
}: {
  customer: Customer
  users: UserProfile[]
}) {
  const assignee = customer.assignedTo
    ? users.find((profile) => profile.uid === customer.assignedTo)
    : undefined

  return (
    <>
      <SheetHeader className="gap-3 pr-12">
        <div className="flex flex-wrap gap-2">
          <CustomerStatusBadge status={customer.status} />
          <CustomerPriorityBadge priority={customer.priority} />
        </div>
        <SheetTitle className="text-lg leading-snug">{customer.name}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <MailIcon className="size-4" />
          {customer.email}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
        <dl className="grid gap-4 rounded-lg border p-4 text-sm">
          <div className="flex items-center gap-3">
            <dt className="flex w-28 shrink-0 items-center gap-2 text-muted-foreground">
              <CircleUserRoundIcon className="size-4" />
              Assigned to
            </dt>
            <dd className="truncate">
              {!customer.assignedTo
                ? "Unassigned"
                : assignee
                  ? getUserLabel(assignee)
                  : "Unknown user"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Description</dt>
            <dd className="whitespace-pre-wrap">
              {customer.description || "No description."}
            </dd>
          </div>
        </dl>

        <CustomerFiles customer={customer} users={users} />
        <CustomerActivities customer={customer} users={users} />
      </div>
    </>
  )
}
