import type { Metadata } from "next"

import { AppShell } from "@/components/app-shell"
import { RequireAuth } from "@/components/require-auth"

export const metadata: Metadata = {
  title: "Revenues",
}

export default function RevenuesLayout({
  children,
}: LayoutProps<"/revenues">) {
  return (
    <RequireAuth>
      <AppShell title="Revenues">{children}</AppShell>
    </RequireAuth>
  )
}
