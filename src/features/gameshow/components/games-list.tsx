"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CenteredMessage } from "@/features/gameshow/components/game-shared"
import { gameTitleSchema } from "@/features/gameshow/schema"
import {
  createGame,
  getGameErrorMessage,
  subscribeToMyGames,
} from "@/features/gameshow/services/gameshow.service"
import {
  GAME_ROLE_LABELS,
  getRoleHref,
  type Game,
} from "@/features/gameshow/types"

type GamesState = {
  games: Game[]
  loading: boolean
  error: string | null
}

export function GamesList() {
  const { user } = useAuth()
  const [state, setState] = React.useState<GamesState>({
    games: [],
    loading: true,
    error: null,
  })
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const uid = user?.uid

  React.useEffect(() => {
    if (!uid) return
    return subscribeToMyGames(
      uid,
      (games) => setState({ games, loading: false, error: null }),
      (err) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: getGameErrorMessage(err),
        }))
    )
  }, [uid])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gameshow</h2>
          <p className="text-sm text-muted-foreground">
            Live multiple-choice quiz for the stage. Games you have a role in
            appear here.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon />
          New game
        </Button>
      </div>

      {state.error ? (
        <CenteredMessage>
          <p className="text-destructive">{state.error}</p>
        </CenteredMessage>
      ) : state.loading ? (
        <CenteredMessage>
          <Loader2Icon className="size-6 animate-spin" />
        </CenteredMessage>
      ) : state.games.length === 0 ? (
        <CenteredMessage>No games yet. Create one to get started.</CenteredMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.games.map((game) => {
            const role = uid ? game.roles[uid] : undefined
            if (!role) return null
            const base = `/gameshow/${encodeURIComponent(game.id)}`
            return (
              <Card key={game.id}>
                <CardHeader>
                  <CardTitle className="truncate">{game.title}</CardTitle>
                  <CardDescription>
                    {Object.keys(game.roles).length} members
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">{GAME_ROLE_LABELS[role]}</Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href={getRoleHref(game.id, role)} />}
                  >
                    Open
                  </Button>
                  {role === "director" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`${base}/setup`} />}
                      >
                        Setup
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`${base}/host`} />}
                      >
                        MC view
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`${base}/screen`} />}
                      >
                        LED view
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <NewGameDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

function NewGameDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New game</DialogTitle>
          <DialogDescription>
            You become the director. Add questions and assign roles next.
          </DialogDescription>
        </DialogHeader>
        <NewGameForm />
      </DialogContent>
    </Dialog>
  )
}

function NewGameForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = gameTitleSchema.safeParse(title)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid title.")
      return
    }
    if (!user) return
    setCreating(true)
    try {
      const id = await createGame(parsed.data, user.uid)
      router.push(`/gameshow/${encodeURIComponent(id)}/setup`)
    } catch (err) {
      toast.error(getGameErrorMessage(err))
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="game-title">Title</FieldLabel>
        <Input
          id="game-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(null)
          }}
          placeholder="Episode 12 – Final round"
          aria-invalid={!!error}
          autoFocus
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={creating}>
          {creating && <Loader2Icon className="animate-spin" />}
          Create
        </Button>
      </DialogFooter>
    </form>
  )
}
