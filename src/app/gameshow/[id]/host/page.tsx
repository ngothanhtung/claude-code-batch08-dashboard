import { AppShell } from "@/components/app-shell"
import { HostView } from "@/features/gameshow/components/host-view"

export default async function HostPage({
  params,
}: PageProps<"/gameshow/[id]/host">) {
  const { id } = await params
  return (
    <AppShell title="MC / Judges">
      <HostView gameId={id} />
    </AppShell>
  )
}
