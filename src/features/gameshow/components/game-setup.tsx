"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GameGate } from "@/features/gameshow/components/game-shared"
import { QuestionFormDialog } from "@/features/gameshow/components/question-form-dialog"
import { useGame, useQuestions } from "@/features/gameshow/hooks"
import { gameTitleSchema } from "@/features/gameshow/schema"
import {
  deleteQuestion,
  getGameErrorMessage,
  saveTeam,
  swapQuestions,
  updateGameTitle,
} from "@/features/gameshow/services/gameshow.service"
import {
  GAME_ROLE_LABELS,
  GAME_ROLES,
  MAX_CONTESTANTS,
  SEATS,
  type Contestant,
  type Game,
  type GameRole,
  type Question,
} from "@/features/gameshow/types"
import { getUsers } from "@/features/users/services/users.service"
import { getUserLabel, type UserProfile } from "@/features/users/types"

export function GameSetup({ gameId }: { gameId: string }) {
  const { game, contestants, role, loading, error } = useGame(gameId)
  const isDirector = role === "director"
  const questions = useQuestions(gameId, isDirector)

  return (
    <GameGate loading={loading} error={error} allowed={isDirector}>
      {game && (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <TitleEditor key={game.title} game={game} />
          <QuestionsCard
            gameId={gameId}
            questions={questions.questions}
            loading={questions.loading}
            error={questions.error}
          />
          <TeamCard game={game} contestants={contestants} />
        </div>
      )}
    </GameGate>
  )
}

function TitleEditor({ game }: { game: Game }) {
  const [title, setTitle] = React.useState(game.title)
  const [saving, setSaving] = React.useState(false)
  const changed = title.trim() !== game.title

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    const parsed = gameTitleSchema.safeParse(title)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid title.")
      return
    }
    setSaving(true)
    try {
      await updateGameTitle(game.id, parsed.data)
      toast.success("Title saved")
    } catch (err) {
      toast.error(getGameErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <form onSubmit={handleSave} className="flex max-w-xl flex-1 gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-10 text-lg font-semibold"
          aria-label="Game title"
        />
        {changed && (
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        )}
      </form>
      <Button
        nativeButton={false}
        render={
          <Link href={`/gameshow/${encodeURIComponent(game.id)}/director`} />
        }
      >
        Open director console
      </Button>
    </div>
  )
}

function QuestionsCard({
  gameId,
  questions,
  loading,
  error,
}: {
  gameId: string
  questions: Question[]
  loading: boolean
  error: string | null
}) {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Question | null>(null)
  const [deleting, setDeleting] = React.useState<Question | null>(null)
  const [busy, setBusy] = React.useState(false)
  const nextOrder = (questions.at(-1)?.order ?? 0) + 1

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      toast.error(getGameErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions</CardTitle>
        <CardDescription>
          Shown in this order. Each correct answer is worth 1 point.
        </CardDescription>
        <CardAction>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <PlusIcon />
            Add question
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <Loader2Icon className="mx-auto size-5 animate-spin text-muted-foreground" />
        ) : questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No questions yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {questions.map((question, index) => (
              <li
                key={question.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span className="w-6 pt-0.5 text-sm font-semibold text-muted-foreground tabular-nums">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{question.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {question.options
                      .map((option) => `${option.id}. ${option.text}`)
                      .join("  ·  ")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge className="bg-emerald-600 text-white">
                      Answer {question.correctOptionId}
                    </Badge>
                    <Badge variant="outline">{question.timeLimitSec}s</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy || index === 0}
                    onClick={() =>
                      run(() =>
                        swapQuestions(gameId, question, questions[index - 1])
                      )
                    }
                    aria-label="Move up"
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy || index === questions.length - 1}
                    onClick={() =>
                      run(() =>
                        swapQuestions(gameId, question, questions[index + 1])
                      )
                    }
                    aria-label="Move down"
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditing(question)
                      setFormOpen(true)
                    }}
                    aria-label="Edit"
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(question)}
                    aria-label="Delete"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <QuestionFormDialog
        gameId={gameId}
        open={formOpen}
        onOpenChange={setFormOpen}
        question={editing}
        nextOrder={nextOrder}
      />
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.text}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const question = deleting
                setDeleting(null)
                if (question) run(() => deleteQuestion(gameId, question.id))
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

type TeamDraft = Record<string, { role: GameRole; seat: number }>

function toDraft(game: Game, contestants: Contestant[]): TeamDraft {
  const draft: TeamDraft = {}
  for (const [uid, role] of Object.entries(game.roles)) {
    const seat = contestants.find((c) => c.uid === uid)?.seat ?? 0
    draft[uid] = { role, seat }
  }
  return draft
}

const NO_ROLE = "none"

function TeamCard({
  game,
  contestants,
}: {
  game: Game
  contestants: Contestant[]
}) {
  const { user } = useAuth()
  const [users, setUsers] = React.useState<UserProfile[] | null>(null)
  // Local edits; null means "not edited", so the saved team is shown.
  const [edits, setEdits] = React.useState<TeamDraft | null>(null)
  const [saving, setSaving] = React.useState(false)
  const draft = edits ?? toDraft(game, contestants)

  React.useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => {
        setUsers([])
        toast.error(getGameErrorMessage(err))
      })
  }, [])

  const draftContestants = Object.entries(draft).filter(
    ([, entry]) => entry.role === "contestant"
  )
  const seats = draftContestants.map(([, entry]) => entry.seat)
  const problem =
    draftContestants.length > MAX_CONTESTANTS
      ? `At most ${MAX_CONTESTANTS} contestants.`
      : new Set(seats).size !== seats.length
        ? "Each contestant needs a different seat."
        : null

  function setRole(uid: string, value: string) {
    const next = { ...draft }
    if (value === NO_ROLE) {
      delete next[uid]
    } else {
      const role = value as GameRole
      const takenSeats = Object.values(next)
        .filter((entry) => entry.role === "contestant")
        .map((entry) => entry.seat)
      const seat =
        role === "contestant"
          ? (next[uid]?.seat || SEATS.find((s) => !takenSeats.includes(s)) || 0)
          : 0
      next[uid] = { role, seat }
    }
    setEdits(next)
  }

  function setSeat(uid: string, seat: number) {
    setEdits({ ...draft, [uid]: { ...draft[uid], seat } })
  }

  async function handleSave() {
    if (problem || !users) return
    setSaving(true)
    try {
      const roles = Object.fromEntries(
        Object.entries(draft).map(([uid, entry]) => [uid, entry.role])
      )
      const team = draftContestants.map(([uid, entry]) => {
        const profile = users.find((u) => u.uid === uid)
        const name =
          (profile && getUserLabel(profile)) ??
          contestants.find((c) => c.uid === uid)?.name ??
          "Contestant"
        return { uid, name, seat: entry.seat }
      })
      await saveTeam(game.id, roles, team, contestants)
      setEdits(null)
      toast.success("Team saved")
    } catch (err) {
      toast.error(getGameErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Members whose profile is missing still need a row to be removable.
  const rows: { uid: string; label: string; email: string | null }[] = [
    ...(users ?? []).map((profile) => ({
      uid: profile.uid,
      label: getUserLabel(profile),
      email: profile.displayName ? profile.email : null,
    })),
    ...Object.keys(draft)
      .filter((uid) => users && !users.some((profile) => profile.uid === uid))
      .map((uid) => ({ uid, label: "Unknown user", email: null })),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Each device signs in with its own account. Give the LED screen its
          own account with the &ldquo;LED screen&rdquo; role. Users appear here
          after signing in once.
        </CardDescription>
        <CardAction>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!edits || !!problem || saving}
          >
            {saving && <Loader2Icon className="animate-spin" />}
            Save team
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {problem && <p className="text-sm text-destructive">{problem}</p>}
        {users === null ? (
          <Loader2Icon className="mx-auto size-5 animate-spin text-muted-foreground" />
        ) : (
          rows.map((row) => {
            const entry = draft[row.uid]
            const isSelf = row.uid === user?.uid
            return (
              <div
                key={row.uid}
                className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2"
              >
                <div className="min-w-40 flex-1">
                  <div className="truncate text-sm font-medium">
                    {row.label}
                    {isSelf && " (you)"}
                  </div>
                  {row.email && (
                    <div className="truncate text-xs text-muted-foreground">
                      {row.email}
                    </div>
                  )}
                </div>
                {entry?.role === "contestant" && (
                  <Select
                    value={String(entry.seat)}
                    onValueChange={(value) => value && setSeat(row.uid, Number(value))}
                  >
                    <SelectTrigger size="sm" className="w-28" aria-label="Seat">
                      <SelectValue>
                        {(value: string) => (value === "0" ? "Seat" : `Seat ${value}`)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SEATS.map((seat) => (
                        <SelectItem key={seat} value={String(seat)}>
                          Seat {seat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={entry?.role ?? NO_ROLE}
                  onValueChange={(value) => value && setRole(row.uid, value)}
                  disabled={isSelf}
                >
                  <SelectTrigger size="sm" className="w-36" aria-label="Role">
                    <SelectValue>
                      {(value: string) =>
                        value === NO_ROLE
                          ? "No role"
                          : GAME_ROLE_LABELS[value as GameRole]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ROLE}>No role</SelectItem>
                    {GAME_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {GAME_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
