"use client"

import { CheckIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  CountdownDisplay,
  GameGate,
  getOptionState,
  OptionTile,
  Scoreboard,
  useCountdown,
} from "@/features/gameshow/components/game-shared"
import { useGame } from "@/features/gameshow/hooks"
import {
  sortBySeat,
  type Contestant,
  type LiveState,
} from "@/features/gameshow/types"

/**
 * Public LED screen. Shows only what the audience may see: the question, the
 * countdown, who has answered (not what), and results after the reveal.
 */
export function ScreenView({ gameId }: { gameId: string }) {
  const { game, live, contestants, role, loading, error } = useGame(gameId)
  const secondsLeft = useCountdown(live)
  // Any member may open it (e.g. the director to check the output).
  const allowed = !!role

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <GameGate loading={loading} error={error} allowed={allowed}>
        {game && live && (
          <div className="relative flex flex-1 flex-col gap-8 p-10">
            <header className="flex items-center justify-between gap-6 text-2xl text-muted-foreground">
              <span className="truncate">{game.title}</span>
              {live.question && live.phase !== "ended" && (
                <span>Question {live.questionIndex + 1}</span>
              )}
            </header>

            {!live.question || live.phase === "idle" ? (
              <div className="flex flex-1 items-center justify-center text-center text-7xl font-bold">
                {game.title}
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-center gap-10">
                <div className="flex items-start gap-8">
                  <p className="flex-1 text-5xl leading-tight font-semibold">
                    {live.question.text}
                  </p>
                  <CountdownDisplay
                    seconds={secondsLeft}
                    className="shrink-0 text-7xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {live.question.options.map((option) => (
                    <OptionTile
                      key={option.id}
                      option={option}
                      size="xl"
                      state={getOptionState(option.id, live.correctOptionId, null)}
                    />
                  ))}
                </div>
              </div>
            )}

            <ContestantStrip contestants={sortBySeat(contestants)} live={live} />

            {(live.showScoreboard || live.phase === "ended") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 bg-background/95 p-16">
                <h2 className="text-6xl font-bold">
                  {live.phase === "ended" ? "Final results" : "Scoreboard"}
                </h2>
                <div className="w-full max-w-4xl">
                  <Scoreboard contestants={contestants} size="xl" />
                </div>
              </div>
            )}
          </div>
        )}
      </GameGate>
    </div>
  )
}

function ContestantStrip({
  contestants,
  live,
}: {
  contestants: Contestant[]
  live: LiveState
}) {
  if (!contestants.length) return null
  return (
    <div className="grid grid-cols-4 gap-6">
      {contestants.map((contestant) => {
        const result = live.results?.[contestant.uid]
        const answered =
          !!live.questionId && contestant.answeredQuestionId === live.questionId
        return (
          <div
            key={contestant.uid}
            className={cn(
              "flex items-center gap-4 rounded-2xl border-2 px-6 py-4",
              result?.isCorrect && "border-emerald-600 bg-emerald-600/20",
              result && !result.isCorrect && "border-destructive bg-destructive/20",
              !result && answered && "border-primary"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-3xl font-semibold">
                {contestant.name}
              </div>
              <div className="text-xl text-muted-foreground">
                {result
                  ? result.optionId
                    ? `Answer ${result.optionId}`
                    : "No answer"
                  : answered && live.phase !== "idle"
                    ? "Answered"
                    : " "}
              </div>
            </div>
            {result &&
              (result.isCorrect ? (
                <CheckIcon className="size-10 text-emerald-500" />
              ) : (
                <XIcon className="size-10 text-destructive" />
              ))}
            <div className="text-5xl font-bold tabular-nums">
              {contestant.score}
            </div>
          </div>
        )
      })}
    </div>
  )
}
