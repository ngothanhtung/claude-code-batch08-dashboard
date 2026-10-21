"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import { CenteredMessage, GameGate } from "@/features/gameshow/components/game-shared"
import { useGame } from "@/features/gameshow/hooks"
import { getRoleHref } from "@/features/gameshow/types"

/** `/gameshow/{id}` sends each member to the screen for their role. */
export function GameEntry({ gameId }: { gameId: string }) {
  const router = useRouter()
  const { role, loading, error } = useGame(gameId)

  React.useEffect(() => {
    if (role) router.replace(getRoleHref(gameId, role))
  }, [gameId, role, router])

  return (
    <div className="flex min-h-svh flex-col">
      <GameGate loading={loading} error={error} allowed={!!role}>
        <CenteredMessage>
          <Loader2Icon className="size-6 animate-spin" />
        </CenteredMessage>
      </GameGate>
    </div>
  )
}
