import type { Metadata } from "next"

import { RequireAuth } from "@/components/require-auth"

export const metadata: Metadata = {
  title: "Gameshow",
}

// No AppShell here: the contestant and LED screens are full-screen.
export default function GameshowLayout({ children }: LayoutProps<"/gameshow">) {
  return <RequireAuth>{children}</RequireAuth>
}
