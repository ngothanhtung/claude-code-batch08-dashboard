"use client"

import * as React from "react"

import { useAuth } from "@/components/auth-provider"
import {
  getGameErrorMessage,
  subscribeToAnswers,
  subscribeToContestants,
  subscribeToGame,
  subscribeToLiveState,
  subscribeToMyAnswer,
  subscribeToQuestions,
} from "@/features/gameshow/services/gameshow.service"
import type {
  Answer,
  Contestant,
  Game,
  GameRole,
  LiveState,
  Question,
} from "@/features/gameshow/types"

type Subscribe<T> = (
  onChange: (value: T) => void,
  onError: (error: unknown) => void
) => () => void

type SubscriptionState<T> = {
  /** Identifies the subscription the value belongs to. */
  key: string | null
  value: T | undefined
  error: string | null
}

/**
 * Realtime value of a Firestore listener. `key` identifies the subscription;
 * pass null to skip it. Values from a previous key are never returned.
 */
function useSubscription<T>(key: string | null, subscribe: Subscribe<T>) {
  const [state, setState] = React.useState<SubscriptionState<T>>({
    key: null,
    value: undefined,
    error: null,
  })
  const subscribeRef = React.useRef(subscribe)
  React.useEffect(() => {
    subscribeRef.current = subscribe
  })

  React.useEffect(() => {
    if (key === null) return
    return subscribeRef.current(
      (value) => setState({ key, value, error: null }),
      (err) => setState({ key, value: undefined, error: getGameErrorMessage(err) })
    )
  }, [key])

  const current = state.key === key && key !== null
  return {
    value: current ? state.value : undefined,
    error: current ? state.error : null,
    loading: key !== null && !current,
  }
}

/** The game, its live state and contestants, plus the current user's role. */
export function useGame(gameId: string) {
  const { user } = useAuth()
  const game = useSubscription<Game | null>(gameId, (onChange, onError) =>
    subscribeToGame(gameId, onChange, onError)
  )
  const live = useSubscription<LiveState>(gameId, (onChange, onError) =>
    subscribeToLiveState(gameId, onChange, onError)
  )
  const contestants = useSubscription<Contestant[]>(
    gameId,
    (onChange, onError) => subscribeToContestants(gameId, onChange, onError)
  )

  const role: GameRole | null =
    (user && game.value?.roles[user.uid]) || null

  return {
    game: game.value ?? null,
    live: live.value ?? null,
    contestants: contestants.value ?? [],
    role,
    loading: game.loading || live.loading || contestants.loading,
    error:
      game.error ??
      live.error ??
      contestants.error ??
      (game.value === null ? "This game doesn't exist." : null),
  }
}

/** Staff only. Pass `enabled: false` for other roles to skip the listener. */
export function useQuestions(gameId: string, enabled: boolean) {
  const questions = useSubscription<Question[]>(
    enabled ? gameId : null,
    (onChange, onError) => subscribeToQuestions(gameId, onChange, onError)
  )
  return {
    questions: questions.value ?? [],
    loading: questions.loading,
    error: questions.error,
  }
}

/** Staff only: answers to the current question. */
export function useAnswers(gameId: string, questionId: string | null) {
  const answers = useSubscription<Answer[]>(
    questionId ? `${gameId}/${questionId}` : null,
    (onChange, onError) =>
      subscribeToAnswers(gameId, questionId!, onChange, onError)
  )
  return answers.value ?? []
}

/** A contestant's own answer to `questionId` (null if not answered). */
export function useMyAnswer(
  gameId: string,
  questionId: string | null,
  uid: string | null
) {
  const answer = useSubscription<Answer | null>(
    questionId && uid ? `${gameId}/${questionId}/${uid}` : null,
    (onChange, onError) =>
      subscribeToMyAnswer(gameId, questionId!, uid!, onChange, onError)
  )
  return { answer: answer.value ?? null, loading: answer.loading }
}

/** Current time, updated every `intervalMs` while `active`. */
export function useNow(active: boolean, intervalMs = 250) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [active, intervalMs])
  return now
}
