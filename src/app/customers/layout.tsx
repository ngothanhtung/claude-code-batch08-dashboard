import type { Metadata } from "next"

import { AppShell } from "@/components/app-shell"
import { RequireAuth } from "@/components/require-auth"

export const metadata: Metadata = {
  title: "Customers",
}

export default function CustomersLayout({
  children,
}: LayoutProps<"/customers">) {
  return (
    <RequireAuth>
      <AppShell title="Customers">{children}</AppShell>
    </RequireAuth>
  )
}
