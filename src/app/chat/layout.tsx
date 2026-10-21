import type { Metadata } from "next"

import { AppShell } from "@/components/app-shell"
import { RequireAuth } from "@/components/require-auth"

export const metadata: Metadata = {
  title: "Chat",
}

export default function ChatLayout({ children }: LayoutProps<"/chat">) {
  return (
    <RequireAuth>
      <AppShell title="Chat">{children}</AppShell>
    </RequireAuth>
  )
}
