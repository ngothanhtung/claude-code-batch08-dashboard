"use client"

import * as React from "react"
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import {
  CountdownDisplay,
  GameGate,
  getOptionState,
  OptionTile,
  useCountdown,
} from "@/features/gameshow/components/game-shared"
import { useGame, useMyAnswer } from "@/features/gameshow/hooks"
import {
  getGameErrorMessage,
  submitAnswer,
} from "@/features/gameshow/services/gameshow.service"
import {
  POINTS_PER_CORRECT_ANSWER,
  sortByScore,
  type OptionId,
} from "@/features/gameshow/types"

/**
 * Contestant device. Shows the question when the director does, accepts one
 * tap as the final answer while answering is open, and only learns the
 * correct answer when the director reveals it.
 */
export function PlayView({ gameId }: { gameId: string }) {
  const { user } = useAuth()
  const { game, live, contestants, role, loading, error } = useGame(gameId)
  const uid = user?.uid ?? null
  const questionId = live?.questionId ?? null
  const { answer } = useMyAnswer(
    gameId,
    role === "contestant" ? questionId : null,
    uid
  )
  const secondsLeft = useCountdown(live)
  // The option being submitted, so the tap shows at once.
  const [pending, setPending] = React.useState<{
    questionId: string
    optionId: OptionId
  } | null>(null)

  const me = contestants.find((contestant) => contestant.uid === uid)
  const pendingOption =
    pending && pending.questionId === questionId ? pending.optionId : null
  const myOption = answer?.optionId ?? pendingOption
  const canAnswer =
    live?.phase === "answering" &&
    !myOption &&
    secondsLeft !== null &&
    secondsLeft > 0

  async function choose(optionId: OptionId) {
    if (!canAnswer || !uid || !questionId) return
    setPending({ questionId, optionId })
    try {
      await submitAnswer(gameId, questionId, uid, optionId)
    } catch (err) {
      setPending(null)
      toast.error(getGameErrorMessage(err))
    }
  }

  return (
    <GameGate loading={loading} error={error} allowed={role === "contestant"}>
      {game && live && (
        <div className="flex min-h-svh flex-col bg-background">
          <header className="flex items-center gap-4 border-b px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">
                {me?.name ?? "Contestant"}
              </div>
              <div className="text-xs text-muted-foreground">
                {game.title} · Seat {me?.seat ?? "–"}
              </div>
            </div>
            <CountdownDisplay seconds={secondsLeft} className="text-3xl" />
            <div className="rounded-lg bg-primary px-4 py-2 text-center text-primary-foreground">
              <div className="text-[10px] uppercase opacity-80">Score</div>
              <div className="text-2xl leading-none font-bold tabular-nums">
                {me?.score ?? 0}
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
            {live.phase === "ended" ? (
              <FinalResult
                rank={sortByScore(contestants).findIndex((c) => c.uid === uid) + 1}
                score={me?.score ?? 0}
              />
            ) : !live.question || live.phase === "idle" ? (
              <div className="flex flex-1 items-center justify-center text-center text-2xl text-muted-foreground">
                Get ready…
              </div>
            ) : (
              <>
                <p className="text-center text-2xl leading-snug font-semibold sm:text-3xl">
                  {live.question.text}
                </p>
                <div className="grid flex-1 content-center gap-4 sm:grid-cols-2">
                  {live.question.options.map((option) => (
                    <OptionTile
                      key={option.id}
                      option={option}
                      size="lg"
                      state={getOptionState(
                        option.id,
                        live.correctOptionId,
                        myOption
                      )}
                      onClick={canAnswer ? () => choose(option.id) : undefined}
                      disabled={!canAnswer}
                    >
                      {pendingOption === option.id && !answer && (
                        <Loader2Icon className="animate-spin" />
                      )}
                    </OptionTile>
                  ))}
                </div>
                <StatusLine
                  phase={live.phase}
                  myOption={myOption}
                  timeUp={secondsLeft === 0}
                  result={uid ? live.results?.[uid] : undefined}
                />
              </>
            )}
          </main>
        </div>
      )}
    </GameGate>
  )
}

function StatusLine({
  phase,
  myOption,
  timeUp,
  result,
}: {
  phase: string
  myOption: OptionId | null
  timeUp: boolean
  result: { optionId: OptionId | null; isCorrect: boolean } | undefined
}) {
  let content: React.ReactNode
  let tone = "text-muted-foreground"
  if (phase === "revealed") {
    if (result?.isCorrect) {
      tone = "text-emerald-600"
      content = (
        <>
          <CheckCircle2Icon className="size-8" />
          Correct! +{POINTS_PER_CORRECT_ANSWER}
        </>
      )
    } else {
      tone = "text-destructive"
      content = (
        <>
          <XCircleIcon className="size-8" />
          {result?.optionId || myOption ? "Wrong answer" : "No answer"}
        </>
      )
    }
  } else if (myOption) {
    content = `Locked in: ${myOption}. Waiting for the answer…`
  } else if (phase === "question_shown") {
    content = "Read the question. Answering opens soon."
  } else if (phase === "answering") {
    tone = timeUp ? "text-destructive" : "text-foreground"
    content = timeUp ? "Time's up" : "Tap your answer. One tap is final."
  } else {
    content = "Answering is closed."
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-center text-xl font-semibold",
        tone
      )}
    >
      {content}
    </div>
  )
}

function FinalResult({ rank, score }: { rank: number; score: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <div className="text-xl text-muted-foreground">Game over</div>
      <div className="text-6xl font-bold tabular-nums">{score} pts</div>
      {rank > 0 && (
        <div className="text-2xl font-medium">
          {rank === 1 ? "🏆 1st place" : `Place ${rank}`}
        </div>
      )}
    </div>
  )
}
