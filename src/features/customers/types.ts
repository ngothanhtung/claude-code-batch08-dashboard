export const CUSTOMER_STATUSES = ["active", "inactive"] as const
export const CUSTOMER_PRIORITIES = ["high", "medium", "low"] as const

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]
export type CustomerPriority = (typeof CUSTOMER_PRIORITIES)[number]

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}

export const CUSTOMER_PRIORITY_LABELS: Record<CustomerPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

/** Sort rank: high comes first. */
export const CUSTOMER_PRIORITY_RANK: Record<CustomerPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

/** Fields the user can edit. */
export type CustomerInput = {
  name: string
  email: string
  status: CustomerStatus
  priority: CustomerPriority
  description: string
  /** Uid of the assigned user (stored as a `users/{uid}` reference). */
  assignedTo: string | null
}

export type Customer = CustomerInput & {
  id: string
  /** Uids, stored as `users/{uid}` references in Firestore. */
  createdBy: string
  updatedBy: string
  createdAt: Date | null
  updatedAt: Date | null
}

/** Link to the customers page with the detail sheet open for `id`. */
export function customerHref(id: string) {
  return `/customers?customer=${encodeURIComponent(id)}`
}

type CurrentUser = { uid: string } | null

/** Mirrors the Firestore rules: only the creator may delete. */
export function canDeleteCustomer(customer: Customer, user: CurrentUser) {
  return !!user && customer.createdBy === user.uid
}

export const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const
export const CALL_QUALITIES = ["good", "average", "poor"] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]
export type CallQuality = (typeof CALL_QUALITIES)[number]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
}

/** The date means something different for each activity type. */
export const ACTIVITY_DATE_LABELS: Record<ActivityType, string> = {
  call: "Call time",
  email: "Sent at",
  meeting: "Meeting time",
  note: "Created at",
}

export const CALL_QUALITY_LABELS: Record<CallQuality, string> = {
  good: "Good",
  average: "Average",
  poor: "Poor",
}

/** Which optional fields each activity type has. */
export function activityHasContent(type: ActivityType) {
  return type !== "call"
}

export function activityHasNote(type: ActivityType) {
  return type !== "note"
}

/** Fields the user can edit. Fields that don't apply to `type` are ignored. */
export type ActivityInput = {
  type: ActivityType
  /** When the activity happened (date and time, stored as a Timestamp). */
  date: Date
  /** Calls only. */
  callQuality: CallQuality | null
  /** Emails, meetings and notes only. */
  content: string
  /** Calls, emails and meetings only. */
  note: string
}

/** Stored in the `customers/{customerId}/activities` subcollection. */
export type Activity = ActivityInput & {
  id: string
  customerId: string
  /** Uids, stored as `users/{uid}` references in Firestore. */
  createdBy: string
  updatedBy: string
  createdAt: Date | null
  updatedAt: Date | null
}

/** Mirrors the Firestore rules: only the author may edit an activity. */
export function canEditActivity(activity: Activity, user: CurrentUser) {
  return !!user && activity.createdBy === user.uid
}

/** Mirrors the Firestore rules: the author or the customer's creator may delete. */
export function canDeleteActivity(
  activity: Activity,
  customer: Customer,
  user: CurrentUser
) {
  return (
    !!user &&
    (activity.createdBy === user.uid || customer.createdBy === user.uid)
  )
}

export function formatActivityDate(date: Date) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Max upload size; also enforced in `storage.rules`. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Stored in the `customers/{customerId}/files` subcollection; the file itself
 * is in Storage at `storagePath` (`customers/{customerId}/files/...`).
 */
export type CustomerFile = {
  id: string
  customerId: string
  name: string
  /** Download URL from Firebase Storage. */
  url: string
  /** MIME type, e.g. `application/pdf`. */
  contentType: string
  /** Bytes. */
  size: number
  storagePath: string
  uploadedAt: Date | null
  /** Uid, stored as a `users/{uid}` reference in Firestore. */
  uploadedBy: string
}

/** Mirrors the rules: the uploader or the customer's creator may delete. */
export function canDeleteCustomerFile(
  file: CustomerFile,
  customer: Customer,
  user: CurrentUser
) {
  return (
    !!user && (file.uploadedBy === user.uid || customer.createdBy === user.uid)
  )
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
