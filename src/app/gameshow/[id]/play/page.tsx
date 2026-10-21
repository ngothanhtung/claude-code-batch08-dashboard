import { PlayView } from "@/features/gameshow/components/play-view"

export default async function PlayPage({
  params,
}: PageProps<"/gameshow/[id]/play">) {
  const { id } = await params
  return (
    <div className="flex min-h-svh flex-col">
      <PlayView gameId={id} />
    </div>
  )
}
