"use client"

import * as React from "react"
import Link from "next/link"
import {
  EyeIcon,
  FlagIcon,
  LockIcon,
  PlayIcon,
  RotateCcwIcon,
  SettingsIcon,
  TrophyIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
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
  endGame,
  getGameErrorMessage,
  lockAnswers,
  resetGame,
  revealAnswer,
  setShowScoreboard,
  showQuestion,
  startAnswering,
} from "@/features/gameshow/services/gameshow.service"
import { sortBySeat, type LiveState, type Question } from "@/features/gameshow/types"

export function DirectorConsole({ gameId }: { gameId: string }) {
  const { game, live, contestants, role, loading, error } = useGame(gameId)
  const isDirector = role === "director"
  const questions = useQuestions(gameId, isDirector)
  const answers = useAnswers(gameId, isDirector ? (live?.questionId ?? null) : null)
  const secondsLeft = useCountdown(live)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)

  if (!game || !live) {
    return <GameGate loading={loading} error={error} allowed={isDirector}>{null}</GameGate>
  }

  const list = questions.questions
  const currentIndex = list.findIndex((q) => q.id === live.questionId)
  const current = currentIndex >= 0 ? list[currentIndex] : null
  // Default selection: the question to show next.
  const defaultSelected =
    live.phase === "idle"
      ? list[0]
      : live.phase === "revealed"
        ? list[currentIndex + 1]
        : current
  const selected =
    list.find((q) => q.id === selectedId) ?? defaultSelected ?? null
  const selectedIndex = selected ? list.indexOf(selected) : -1
  const seated = sortBySeat(contestants)
  const answeredCount = answers.length

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      toast.error(getGameErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const phase = live.phase
  const canShow = !!selected && phase !== "answering" && phase !== "ended"
  const canStart = phase === "question_shown"
  const canLock = phase === "answering"
  const canReveal = !!current && (phase === "answering" || phase === "locked")

  return (
    <GameGate loading={loading} error={error} allowed={isDirector}>
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[18rem_1fr_20rem] lg:p-6">
        {/* Question list */}
        <Card className="lg:max-h-[calc(100svh-var(--header-height)-3rem)]">
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                render={<Link href={`/gameshow/${encodeURIComponent(gameId)}/setup`} />}
                aria-label="Setup"
              >
                <SettingsIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No questions. Add some in setup.
              </p>
            ) : (
              <ol className="flex flex-col gap-1">
                {list.map((question, index) => (
                  <li key={question.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(question.id)}
                      className={cn(
                        "flex w-full gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-muted",
                        question.id === selected?.id
                          ? "border-primary"
                          : "border-transparent",
                        question.id === live.questionId && "bg-muted font-medium"
                      )}
                    >
                      <span className="w-5 shrink-0 text-muted-foreground tabular-nums">
                        {index + 1}.
                      </span>
                      <span className="line-clamp-2">{question.text}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Live control */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                On air
                <PhaseBadge phase={phase} />
              </CardTitle>
              <CardAction>
                <CountdownDisplay seconds={secondsLeft} className="text-2xl" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <LivePreview live={live} current={current} index={currentIndex} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">Selected: </span>
                {selected ? (
                  <>
                    <span className="font-medium">
                      Q{selectedIndex + 1}.
                    </span>{" "}
                    {selected.text}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    {list.length ? "No more questions" : "—"}
                  </span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <ControlButton
                  step={1}
                  icon={<EyeIcon />}
                  label="Show question"
                  active={canShow}
                  disabled={busy || !canShow}
                  onClick={() =>
                    selected &&
                    run(async () => {
                      await showQuestion(gameId, selected, selectedIndex)
                      setSelectedId(null)
                    })
                  }
                />
                <ControlButton
                  step={2}
                  icon={<PlayIcon />}
                  label="Start answering"
                  active={canStart}
                  disabled={busy || !canStart}
                  onClick={() => run(() => startAnswering(gameId))}
                />
                <ControlButton
                  step={3}
                  icon={<LockIcon />}
                  label={`Lock (${answeredCount}/${contestants.length})`}
                  active={canLock}
                  disabled={busy || !canLock}
                  onClick={() => run(() => lockAnswers(gameId))}
                />
                <ControlButton
                  step={4}
                  icon={<FlagIcon />}
                  label="Reveal answer"
                  active={canReveal}
                  disabled={busy || !canReveal}
                  onClick={() =>
                    current &&
                    run(() => revealAnswer(gameId, current, contestants, phase))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={live.showScoreboard ? "default" : "outline"}
                  disabled={busy}
                  onClick={() =>
                    run(() => setShowScoreboard(gameId, !live.showScoreboard))
                  }
                >
                  <TrophyIcon />
                  {live.showScoreboard ? "Hide scoreboard" : "Show scoreboard"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || phase === "answering" || phase === "ended"}
                  onClick={() => run(() => endGame(gameId))}
                >
                  <FlagIcon />
                  End game
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmReset(true)}
                  className="ml-auto text-destructive"
                >
                  <RotateCcwIcon />
                  Reset game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contestants */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Answers</CardTitle>
            </CardHeader>
            <CardContent>
              {seated.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contestants. Assign them in setup.
                </p>
              ) : (
                <AnswersTable contestants={seated} answers={answers} live={live} />
              )}
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

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the game?</AlertDialogTitle>
            <AlertDialogDescription>
              Deletes every answer, sets all scores to 0 and clears every
              screen. Questions and the team are kept. Use this after a
              rehearsal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmReset(false)
                run(() => resetGame(gameId, contestants))
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GameGate>
  )
}

function ControlButton({
  step,
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  step: number
  icon: React.ReactNode
  label: string
  /** The next expected step is highlighted. */
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      size="lg"
      variant={active ? "default" : "outline"}
      className="h-16 flex-col gap-1"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-[11px] font-normal opacity-70">Step {step}</span>
    </Button>
  )
}

/** What is on air right now, with the answer key for the director. */
function LivePreview({
  live,
  current,
  index,
}: {
  live: LiveState
  current: Question | null
  index: number
}) {
  if (live.phase === "idle" || !current) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {live.phase === "ended" ? "Game over." : "Nothing on air yet."}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-medium">
        <span className="text-muted-foreground">Q{index + 1}. </span>
        {current.text}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {current.options.map((option) => (
          <OptionTile
            key={option.id}
            option={option}
            state={
              live.correctOptionId
                ? getOptionState(option.id, live.correctOptionId, null)
                : option.id === current.correctOptionId
                  ? "selected"
                  : "default"
            }
          />
        ))}
      </div>
      {!live.correctOptionId && (
        <p className="text-xs text-muted-foreground">
          Correct answer (hidden from contestants and LED):{" "}
          <span className="font-semibold text-foreground">
            {current.correctOptionId}
          </span>
        </p>
      )}
    </div>
  )
}
