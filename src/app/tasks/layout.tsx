import type { Metadata } from "next"

import { AppShell } from "@/components/app-shell"
import { RequireAuth } from "@/components/require-auth"

export const metadata: Metadata = {
  title: "Tasks",
}

export default function TasksLayout({ children }: LayoutProps<"/tasks">) {
  return (
    <RequireAuth>
      <AppShell title="Tasks">{children}</AppShell>
    </RequireAuth>
  )
}
