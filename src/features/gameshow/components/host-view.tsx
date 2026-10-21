"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AnswersTable,
  CountdownDisplay,
  GameGate,
  getOptionState,
  OptionTile,
  PhaseBadge,
  Scoreboard,
  useCountdown,
} from "@/features/gameshow/components/game-shared"
import { useAnswers, useGame, useQuestions } from "@/features/gameshow/hooks"
import {
  GAME_ROLE_LABELS,
  isStaffRole,
  sortBySeat,
} from "@/features/gameshow/types"

/**
 * Tablet view for the MC and the judges: everything on air plus the answer
 * key, notes and every contestant's choice. Read-only; the director drives.
 */
export function HostView({ gameId }: { gameId: string }) {
  const { game, live, contestants, role, loading, error } = useGame(gameId)
  const isStaff = isStaffRole(role)
  const questions = useQuestions(gameId, isStaff)
  const answers = useAnswers(gameId, isStaff ? (live?.questionId ?? null) : null)
  const secondsLeft = useCountdown(live)

  const list = questions.questions
  const currentIndex = list.findIndex((q) => q.id === live?.questionId)
  const current = currentIndex >= 0 ? list[currentIndex] : null
  const next =
    live?.phase === "idle" ? list[0] : (list[currentIndex + 1] ?? null)
  const revealed = !!live?.correctOptionId

  return (
    <GameGate loading={loading} error={error} allowed={isStaff}>
      {game && live && (
        <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_22rem] lg:p-6">
          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {game.title}
                  <PhaseBadge phase={live.phase} />
                  {role && (
                    <Badge variant="secondary">{GAME_ROLE_LABELS[role]}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {current
                    ? `Question ${currentIndex + 1} of ${list.length}`
                    : `${list.length} questions`}
                </CardDescription>
                <CardAction>
                  <CountdownDisplay seconds={secondsLeft} className="text-3xl" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {current && live.phase !== "idle" ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-xl leading-snug font-semibold sm:text-2xl">
                      {current.text}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {current.options.map((option) => (
                        <OptionTile
                          key={option.id}
                          option={option}
                          size="lg"
                          state={
                            revealed
                              ? getOptionState(option.id, live.correctOptionId, null)
                              : option.id === current.correctOptionId
                                ? "selected"
                                : "default"
                          }
                        />
                      ))}
                    </div>
                    {!revealed && (
                      <p className="text-sm text-muted-foreground">
                        Answer key:{" "}
                        <span className="font-semibold text-foreground">
                          {current.correctOptionId}
                        </span>{" "}
                        (not shown to contestants yet)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    {live.phase === "ended"
                      ? "Game over."
                      : "Waiting for the director to show a question."}
                  </p>
                )}
              </CardContent>
            </Card>

            {current && (current.mcNotes || current.explanation) && (
              <Card>
                <CardContent className="flex flex-col gap-3 text-sm">
                  {current.mcNotes && (
                    <div>
                      <div className="mb-1 font-medium">MC notes</div>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {current.mcNotes}
                      </p>
                    </div>
                  )}
                  {current.explanation && (
                    <div>
                      <div className="mb-1 font-medium">Explanation</div>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {current.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {next && (
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Up next</CardDescription>
                  <CardTitle className="text-base font-medium">
                    {next.text}
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Answers</CardTitle>
              </CardHeader>
              <CardContent>
                <AnswersTable
                  contestants={sortBySeat(contestants)}
                  answers={answers}
                  live={live}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <Scoreboard contestants={contestants} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </GameGate>
  )
}
