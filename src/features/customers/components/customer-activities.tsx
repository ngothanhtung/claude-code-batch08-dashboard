"use client"

import * as React from "react"
import { EllipsisVerticalIcon, HistoryIcon, PlusIcon } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityDeleteDialog } from "@/features/customers/components/activity-delete-dialog"
import { ActivityFormDialog } from "@/features/customers/components/activity-form-dialog"
import { ACTIVITY_ICONS } from "@/features/customers/components/activity-icons"
import { getActivities } from "@/features/customers/services/activities.service"
import { getCustomerErrorMessage } from "@/features/customers/services/customers.service"
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  CALL_QUALITY_LABELS,
  canDeleteActivity,
  canEditActivity,
  formatActivityDate,
  type Activity,
  type ActivityType,
  type CallQuality,
  type Customer,
} from "@/features/customers/types"
import { getUserLabel, type UserProfile } from "@/features/users/types"

type ListState = {
  activities: Activity[]
  loading: boolean
  error: string | null
}

const CALL_QUALITY_VARIANTS = {
  good: "secondary",
  average: "outline",
  poor: "destructive",
} as const satisfies Record<CallQuality, string>

export function CustomerActivities({
  customer,
  users,
}: {
  customer: Customer
  users: UserProfile[]
}) {
  const { user } = useAuth()
  const [state, setState] = React.useState<ListState>({
    activities: [],
    loading: true,
    error: null,
  })
  const [filter, setFilter] = React.useState<ActivityType | "all">("all")
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Activity | null>(null)
  const [deleting, setDeleting] = React.useState<Activity | null>(null)

  const loadActivities = React.useCallback(() => {
    return getActivities(customer.id)
      .then((activities) =>
        setState({ activities, loading: false, error: null })
      )
      .catch((err) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: getCustomerErrorMessage(err),
        }))
      )
  }, [customer.id])

  React.useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const usersById = new Map(users.map((profile) => [profile.uid, profile]))
  const visibleActivities = state.activities.filter(
    (activity) => filter === "all" || activity.type === filter
  )
  const countByType = (type: ActivityType) =>
    state.activities.filter((activity) => activity.type === type).length

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Activities</h3>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon />
          Log activity
        </Button>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as ActivityType | "all")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="all">All ({state.activities.length})</TabsTrigger>
          {ACTIVITY_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]} ({countByType(type)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {state.loading ? (
        Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))
      ) : state.error ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-destructive">{state.error}</p>
          <Button
            variant="link"
            onClick={() => {
              setState((current) => ({ ...current, loading: true }))
              loadActivities()
            }}
          >
            Try again
          </Button>
        </div>
      ) : visibleActivities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <HistoryIcon className="size-8" />
          {state.activities.length === 0
            ? "No activities yet. Log the first call, email, meeting or note."
            : "No activities of this type."}
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {visibleActivities.map((activity) => {
            const author = usersById.get(activity.createdBy)
            return (
              <li
                key={activity.id}
                className="flex gap-3 rounded-lg border p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-4">
                  {ACTIVITY_ICONS[activity.type]}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {ACTIVITY_TYPE_LABELS[activity.type]}
                    </span>
                    <span className="text-muted-foreground">
                      {formatActivityDate(activity.date)}
                    </span>
                    {activity.type === "call" && activity.callQuality && (
                      <Badge
                        variant={CALL_QUALITY_VARIANTS[activity.callQuality]}
                      >
                        {CALL_QUALITY_LABELS[activity.callQuality]}
                      </Badge>
                    )}
                  </div>
                  {activity.content && (
                    <p className="whitespace-pre-wrap">{activity.content}</p>
                  )}
                  {activity.note && (
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      <span className="font-medium">Note: </span>
                      {activity.note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    by {author ? getUserLabel(author) : "Unknown user"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground data-open:bg-muted"
                      />
                    }
                  >
                    <EllipsisVerticalIcon />
                    <span className="sr-only">Open menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem
                      disabled={!canEditActivity(activity, user)}
                      onClick={() => {
                        setEditing(activity)
                        setFormOpen(true)
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!canDeleteActivity(activity, customer, user)}
                      onClick={() => setDeleting(activity)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ol>
      )}

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customerId={customer.id}
        activity={editing}
        onSaved={loadActivities}
      />
      <ActivityDeleteDialog
        activity={deleting}
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onDeleted={loadActivities}
      />
    </div>
  )
}
