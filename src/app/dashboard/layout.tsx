import { RequireAuth } from "@/components/require-auth"

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <RequireAuth>{children}</RequireAuth>
}
