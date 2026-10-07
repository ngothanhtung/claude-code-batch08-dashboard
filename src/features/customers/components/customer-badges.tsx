import { Badge } from "@/components/ui/badge"
import {
  CUSTOMER_PRIORITY_LABELS,
  CUSTOMER_STATUS_LABELS,
  type CustomerPriority,
  type CustomerStatus,
} from "@/features/customers/types"

const STATUS_DOTS = {
  active: "bg-green-500 dark:bg-green-400",
  inactive: "bg-muted-foreground/50",
} satisfies Record<CustomerStatus, string>

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <span className={`size-2 rounded-full ${STATUS_DOTS[status]}`} />
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  )
}

// The label stays in the foreground color: green and gray text on a light
// background would be hard to read.
const PRIORITY_STYLES = {
  high: { badge: "border-[#f5222d] bg-[#f5222d]/15", dot: "bg-[#f5222d]" },
  medium: { badge: "border-[#52c41a] bg-[#52c41a]/15", dot: "bg-[#52c41a]" },
  low: { badge: "border-[#bfbfbf] bg-[#bfbfbf]/20", dot: "bg-[#bfbfbf]" },
} satisfies Record<CustomerPriority, { badge: string; dot: string }>

export function CustomerPriorityBadge({
  priority,
}: {
  priority: CustomerPriority
}) {
  const styles = PRIORITY_STYLES[priority]
  return (
    <Badge variant="outline" className={styles.badge}>
      <span className={`size-2 rounded-full ${styles.dot}`} />
      {CUSTOMER_PRIORITY_LABELS[priority]}
    </Badge>
  )
}
