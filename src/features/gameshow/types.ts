export const GAME_ROLES = [
  "director",
  "mc",
  "judge",
  "contestant",
  "display",
] as const
export type GameRole = (typeof GAME_ROLES)[number]

export const GAME_ROLE_LABELS: Record<GameRole, string> = {
  director: "Director",
  mc: "MC",
  judge: "Judge",
  contestant: "Contestant",
  display: "LED screen",
}

/** Roles that see the answer key (questions collection). */
export const STAFF_ROLES: GameRole[] = ["director", "mc", "judge"]

export const MAX_CONTESTANTS = 4
export const SEATS = [1, 2, 3, 4] as const

export const OPTION_IDS = ["A", "B", "C", "D"] as const
export type OptionId = (typeof OPTION_IDS)[number]

export type QuestionOption = {
  id: OptionId
  text: string
}

/** `games/{gameId}` */
export type Game = {
  id: string
  title: string
  /** uid → role. One role per user per game. */
  roles: Record<string, GameRole>
  /** Keys of `roles`, for `array-contains` queries and rules. */
  memberIds: string[]
  createdBy: string
  createdAt: Date | null
}

/** `games/{gameId}/questions/{questionId}`: staff only, has the answer key. */
export type Question = {
  id: string
  order: number
  text: string
  options: QuestionOption[]
  correctOptionId: OptionId
  timeLimitSec: number
  /** Read out by the MC after the answer is revealed. */
  explanation: string
  /** Private notes or script for the MC. */
  mcNotes: string
}

export const GAME_PHASES = [
  "idle",
  "question_shown",
  "answering",
  "locked",
  "revealed",
  "ended",
] as const
export type GamePhase = (typeof GAME_PHASES)[number]

export const GAME_PHASE_LABELS: Record<GamePhase, string> = {
  idle: "Waiting",
  question_shown: "Question shown",
  answering: "Answering",
  locked: "Locked",
  revealed: "Answer revealed",
  ended: "Ended",
}

export type ContestantResult = {
  optionId: OptionId | null
  isCorrect: boolean
}

/**
 * `games/{gameId}/live/state`: the single document every screen listens to.
 * Only the director writes it. It never contains the answer key until the
 * director reveals it.
 */
export type LiveState = {
  phase: GamePhase
  questionId: string | null
  /** 0-based position of the current question. */
  questionIndex: number
  /** Copied from the question when shown, without the correct answer. */
  question: { text: string; options: QuestionOption[] } | null
  timeLimitSec: number
  /** Server time answering opened; answers are accepted for timeLimitSec. */
  openedAt: Date | null
  /** Null until revealed. */
  correctOptionId: OptionId | null
  /** Per contestant uid, set when revealed. */
  results: Record<string, ContestantResult> | null
  showScoreboard: boolean
}

/** `games/{gameId}/contestants/{uid}` */
export type Contestant = {
  uid: string
  name: string
  seat: number
  score: number
  /** Set by the contestant when answering, so screens can show who answered. */
  answeredQuestionId: string | null
}

/** `games/{gameId}/answers/{questionId}_{uid}`: one per contestant per question. */
export type Answer = {
  id: string
  questionId: string
  contestantId: string
  optionId: OptionId
  answeredAt: Date | null
  /** Null until the director reveals the answer. */
  isCorrect: boolean | null
}

export const POINTS_PER_CORRECT_ANSWER = 1
export const DEFAULT_TIME_LIMIT_SEC = 15

export function answerId(questionId: string, uid: string) {
  return `${questionId}_${uid}`
}

export function isStaffRole(role: GameRole | null | undefined) {
  return !!role && STAFF_ROLES.includes(role)
}

/** Where a member should go when opening a game. */
export function getRoleHref(gameId: string, role: GameRole) {
  const base = `/gameshow/${encodeURIComponent(gameId)}`
  switch (role) {
    case "director":
      return `${base}/director`
    case "mc":
    case "judge":
      return `${base}/host`
    case "contestant":
      return `${base}/play`
    case "display":
      return `${base}/screen`
  }
}

export function sortBySeat(contestants: Contestant[]) {
  return [...contestants].sort((a, b) => a.seat - b.seat)
}

/** Highest score first, then seat. */
export function sortByScore(contestants: Contestant[]) {
  return [...contestants].sort((a, b) => b.score - a.score || a.seat - b.seat)
}

/** Seconds left to answer, or null when answering hasn't opened. */
export function getSecondsLeft(live: LiveState, now: number) {
  if (!live.openedAt) return null
  const closesAt = live.openedAt.getTime() + live.timeLimitSec * 1000
  return Math.max(0, Math.ceil((closesAt - now) / 1000))
}
