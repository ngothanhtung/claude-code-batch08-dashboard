import { AppShell } from "@/components/app-shell"
import { GamesList } from "@/features/gameshow/components/games-list"

export default function GameshowPage() {
  return (
    <AppShell title="Gameshow">
      <GamesList />
    </AppShell>
  )
}
