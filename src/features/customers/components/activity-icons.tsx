import { MailIcon, PhoneIcon, StickyNoteIcon, UsersIcon } from "lucide-react"

import type { ActivityType } from "@/features/customers/types"

export const ACTIVITY_ICONS = {
  call: <PhoneIcon />,
  email: <MailIcon />,
  meeting: <UsersIcon />,
  note: <StickyNoteIcon />,
} satisfies Record<ActivityType, React.ReactNode>
