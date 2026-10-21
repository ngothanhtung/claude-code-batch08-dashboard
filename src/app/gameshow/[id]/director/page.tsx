import { AppShell } from "@/components/app-shell"
import { DirectorConsole } from "@/features/gameshow/components/director-console"

export default async function DirectorPage({
  params,
}: PageProps<"/gameshow/[id]/director">) {
  const { id } = await params
  return (
    <AppShell title="Director">
      <DirectorConsole gameId={id} />
    </AppShell>
  )
}
