import { ScreenView } from "@/features/gameshow/components/screen-view"

export default async function ScreenPage({
  params,
}: PageProps<"/gameshow/[id]/screen">) {
  const { id } = await params
  return <ScreenView gameId={id} />
}
