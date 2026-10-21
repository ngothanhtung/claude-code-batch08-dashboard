import { AppShell } from "@/components/app-shell"
import { GameSetup } from "@/features/gameshow/components/game-setup"

export default async function GameSetupPage({
  params,
}: PageProps<"/gameshow/[id]/setup">) {
  const { id } = await params
  return (
    <AppShell title="Game setup">
      <GameSetup gameId={id} />
    </AppShell>
  )
}
