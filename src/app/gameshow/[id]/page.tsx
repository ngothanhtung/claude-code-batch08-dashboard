import { GameEntry } from "@/features/gameshow/components/game-entry"

export default async function GamePage({ params }: PageProps<"/gameshow/[id]">) {
  const { id } = await params
  return <GameEntry gameId={id} />
}
