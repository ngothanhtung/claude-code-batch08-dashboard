"use client"

import Link from "next/link"
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNow } from "@/features/gameshow/hooks"
import {
  GAME_PHASE_LABELS,
  getSecondsLeft,
  sortByScore,
  type Answer,
  type Contestant,
  type GamePhase,
  type LiveState,
  type OptionId,
  type QuestionOption,
} from "@/features/gameshow/types"

export function PhaseBadge({ phase }: { phase: GamePhase }) {
  return (
    <Badge
      variant={phase === "answering" ? "default" : "outline"}
      className={cn(phase === "answering" && "animate-pulse")}
    >
      {GAME_PHASE_LABELS[phase]}
    </Badge>
  )
}

/** Seconds left while answering is open; "Time's up" once it runs out. */
export function useCountdown(live: LiveState | null) {
  const active = live?.phase === "answering" && !!live.openedAt
  const now = useNow(active)
  if (!live || !active) return null
  return getSecondsLeft(live, now)
}

export function CenteredMessage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Loading, error and wrong-role states shared by every gameshow screen. */
export function GameGate({
  loading,
  error,
  allowed,
  children,
}: {
  loading: boolean
  error: string | null
  allowed: boolean
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <CenteredMessage>
        <Loader2Icon className="size-6 animate-spin" />
      </CenteredMessage>
    )
  }
  if (error || !allowed) {
    return (
      <CenteredMessage>
        <p className={cn(error && "text-destructive")}>
          {error ?? "Your role in this game doesn't have access to this screen."}
        </p>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/gameshow" />}
        >
          Back to games
        </Button>
      </CenteredMessage>
    )
  }
  return <>{children}</>
}

type OptionState = "default" | "selected" | "correct" | "wrong" | "dimmed"

export function getOptionState(
  optionId: OptionId,
  correctOptionId: OptionId | null,
  selectedOptionId: OptionId | null
): OptionState {
  if (correctOptionId) {
    if (optionId === correctOptionId) return "correct"
    if (optionId === selectedOptionId) return "wrong"
    return "dimmed"
  }
  if (selectedOptionId) {
    return optionId === selectedOptionId ? "selected" : "dimmed"
  }
  return "default"
}

const optionStateClasses: Record<OptionState, string> = {
  default: "border-border bg-card",
  selected: "border-primary bg-primary text-primary-foreground",
  correct: "border-emerald-600 bg-emerald-600 text-white",
  wrong: "border-destructive bg-destructive text-white",
  dimmed: "border-border bg-card opacity-50",
}

/** One answer option (A-D). Renders a button when `onClick` is given. */
export function OptionTile({
  option,
  state,
  size = "default",
  onClick,
  disabled,
  children,
}: {
  option: QuestionOption
  state: OptionState
  size?: "default" | "lg" | "xl"
  onClick?: () => void
  disabled?: boolean
  children?: React.ReactNode
}) {
  const className = cn(
    "flex w-full items-center gap-3 rounded-xl border-2 text-left transition-colors",
    size === "default" && "p-3 text-sm",
    size === "lg" && "p-4 text-lg sm:p-5 sm:text-xl",
    size === "xl" && "p-6 text-3xl",
    optionStateClasses[state],
    onClick && !disabled && "hover:border-primary active:scale-[0.99]"
  )
  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border-2 border-current font-bold",
          size === "default" && "size-7 text-sm",
          size === "lg" && "size-10",
          size === "xl" && "size-14"
        )}
      >
        {option.id}
      </span>
      <span className="min-w-0 flex-1 break-words">{option.text}</span>
      {state === "correct" && <CheckIcon className="shrink-0" />}
      {state === "wrong" && <XIcon className="shrink-0" />}
      {children}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}

/** Contestants ranked by score. */
export function Scoreboard({
  contestants,
  size = "default",
}: {
  contestants: Contestant[]
  size?: "default" | "xl"
}) {
  const ranked = sortByScore(contestants)
  return (
    <ol className={cn("flex flex-col", size === "xl" ? "gap-4" : "gap-2")}>
      {ranked.map((contestant, index) => (
        <li
          key={contestant.uid}
          className={cn(
            "flex items-center gap-3 rounded-lg border",
            size === "xl" ? "px-8 py-5 text-4xl" : "px-3 py-2 text-sm",
            index === 0 && contestant.score > 0 && "border-amber-500"
          )}
        >
          <span className="w-8 font-bold text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {contestant.name}
          </span>
          <span className="font-bold tabular-nums">{contestant.score}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Who answered what for the current question. Staff only: the choices are
 * secret until the answer is revealed.
 */
export function AnswersTable({
  contestants,
  answers,
  live,
}: {
  contestants: Contestant[]
  answers: Answer[]
  live: LiveState
}) {
  const ordered = [...answers].sort(
    (a, b) => (a.answeredAt?.getTime() ?? 0) - (b.answeredAt?.getTime() ?? 0)
  )
  const openedAt = live.openedAt?.getTime()
  return (
    <div className="flex flex-col gap-2">
      {[...contestants]
        .sort((a, b) => a.seat - b.seat)
        .map((contestant) => {
          const answer = answers.find((a) => a.contestantId === contestant.uid)
          const rank = answer ? ordered.indexOf(answer) + 1 : null
          const seconds =
            answer?.answeredAt && openedAt
              ? ((answer.answeredAt.getTime() - openedAt) / 1000).toFixed(2)
              : null
          return (
            <div
              key={contestant.uid}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="w-6 text-muted-foreground tabular-nums">
                #{contestant.seat}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {contestant.name}
              </span>
              {answer ? (
                <>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {seconds !== null && `${seconds}s · `}
                    {rank && `${rank}${["st", "nd", "rd"][rank - 1] ?? "th"}`}
                  </span>
                  <Badge
                    className={cn(
                      "min-w-8 justify-center",
                      answer.isCorrect === true && "bg-emerald-600 text-white",
                      answer.isCorrect === false && "bg-destructive text-white"
                    )}
                  >
                    {answer.optionId}
                  </Badge>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {live.phase === "answering" ? "Thinking…" : "No answer"}
                </span>
              )}
            </div>
          )
        })}
    </div>
  )
}

/** Big countdown number; red in the last 5 seconds. */
export function CountdownDisplay({
  seconds,
  className,
}: {
  seconds: number | null
  className?: string
}) {
  if (seconds === null) return null
  return (
    <span
      className={cn(
        "font-mono font-bold tabular-nums",
        seconds <= 5 && "text-destructive",
        className
      )}
    >
      {seconds > 0 ? `${seconds}s` : "Time's up"}
    </span>
  )
}
