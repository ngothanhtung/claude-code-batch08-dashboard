import { FirebaseError } from "firebase/app"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import type { QuestionFormValues } from "@/features/gameshow/schema"
import {
  answerId,
  OPTION_IDS,
  POINTS_PER_CORRECT_ANSWER,
  type Answer,
  type Contestant,
  type ContestantResult,
  type Game,
  type GameRole,
  type LiveState,
  type OptionId,
  type Question,
} from "@/features/gameshow/types"

const gamesCollection = collection(db, "games")

const gameDoc = (gameId: string) => doc(gamesCollection, gameId)
const liveDoc = (gameId: string) => doc(gamesCollection, gameId, "live", "state")
const questionsCollection = (gameId: string) =>
  collection(gamesCollection, gameId, "questions")
const contestantsCollection = (gameId: string) =>
  collection(gamesCollection, gameId, "contestants")
const answersCollection = (gameId: string) =>
  collection(gamesCollection, gameId, "answers")

// Pending serverTimestamp() values are estimated so local writes show at once.
const snapshotOptions = { serverTimestamps: "estimate" } as const

function dataOf(snapshot: DocumentSnapshot) {
  return snapshot.data(snapshotOptions) ?? {}
}

function toGame(snapshot: DocumentSnapshot): Game {
  const data = dataOf(snapshot)
  return {
    id: snapshot.id,
    title: data.title ?? "",
    roles: data.roles ?? {},
    memberIds: data.memberIds ?? [],
    createdBy: data.createdBy ?? "",
    createdAt: data.createdAt?.toDate() ?? null,
  }
}

function toQuestion(snapshot: DocumentSnapshot): Question {
  const data = dataOf(snapshot)
  return {
    id: snapshot.id,
    order: data.order ?? 0,
    text: data.text ?? "",
    options: data.options ?? [],
    correctOptionId: data.correctOptionId ?? "A",
    timeLimitSec: data.timeLimitSec ?? 15,
    explanation: data.explanation ?? "",
    mcNotes: data.mcNotes ?? "",
  }
}

const idleState: LiveState = {
  phase: "idle",
  questionId: null,
  questionIndex: 0,
  question: null,
  timeLimitSec: 0,
  openedAt: null,
  correctOptionId: null,
  results: null,
  showScoreboard: false,
}

function toLiveState(snapshot: DocumentSnapshot): LiveState {
  const data = dataOf(snapshot)
  return {
    phase: data.phase ?? "idle",
    questionId: data.questionId ?? null,
    questionIndex: data.questionIndex ?? 0,
    question: data.question ?? null,
    timeLimitSec: data.timeLimitSec ?? 0,
    openedAt: data.openedAt?.toDate() ?? null,
    correctOptionId: data.correctOptionId ?? null,
    results: data.results ?? null,
    showScoreboard: data.showScoreboard ?? false,
  }
}

function toContestant(snapshot: DocumentSnapshot): Contestant {
  const data = dataOf(snapshot)
  return {
    uid: snapshot.id,
    name: data.name ?? "",
    seat: data.seat ?? 0,
    score: data.score ?? 0,
    answeredQuestionId: data.answeredQuestionId ?? null,
  }
}

function toAnswer(snapshot: DocumentSnapshot): Answer {
  const data = dataOf(snapshot)
  return {
    id: snapshot.id,
    questionId: data.questionId ?? "",
    contestantId: data.contestantId ?? "",
    optionId: data.optionId ?? "A",
    answeredAt: data.answeredAt?.toDate() ?? null,
    isCorrect: data.isCorrect ?? null,
  }
}

/* ----------------------------- Subscriptions ----------------------------- */

type OnError = (error: unknown) => void

/** Games `uid` has a role in, newest first (sorted client-side). */
export function subscribeToMyGames(
  uid: string,
  onChange: (games: Game[]) => void,
  onError: OnError
) {
  return onSnapshot(
    query(gamesCollection, where("memberIds", "array-contains", uid)),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map(toGame)
          .sort(
            (a, b) =>
              (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
          )
      ),
    onError
  )
}

export function subscribeToGame(
  gameId: string,
  onChange: (game: Game | null) => void,
  onError: OnError
) {
  return onSnapshot(
    gameDoc(gameId),
    (snapshot) => onChange(snapshot.exists() ? toGame(snapshot) : null),
    onError
  )
}

export function subscribeToLiveState(
  gameId: string,
  onChange: (live: LiveState) => void,
  onError: OnError
) {
  return onSnapshot(
    liveDoc(gameId),
    (snapshot) => onChange(snapshot.exists() ? toLiveState(snapshot) : idleState),
    onError
  )
}

/** Staff only: questions with the answer key, in show order. */
export function subscribeToQuestions(
  gameId: string,
  onChange: (questions: Question[]) => void,
  onError: OnError
) {
  return onSnapshot(
    query(questionsCollection(gameId), orderBy("order", "asc")),
    (snapshot) => onChange(snapshot.docs.map(toQuestion)),
    onError
  )
}

export function subscribeToContestants(
  gameId: string,
  onChange: (contestants: Contestant[]) => void,
  onError: OnError
) {
  return onSnapshot(
    contestantsCollection(gameId),
    (snapshot) => onChange(snapshot.docs.map(toContestant)),
    onError
  )
}

/** Staff only: every contestant's answer to one question. */
export function subscribeToAnswers(
  gameId: string,
  questionId: string,
  onChange: (answers: Answer[]) => void,
  onError: OnError
) {
  return onSnapshot(
    query(answersCollection(gameId), where("questionId", "==", questionId)),
    (snapshot) => onChange(snapshot.docs.map(toAnswer)),
    onError
  )
}

/** A contestant's own answer to one question (null if not answered yet). */
export function subscribeToMyAnswer(
  gameId: string,
  questionId: string,
  uid: string,
  onChange: (answer: Answer | null) => void,
  onError: OnError
) {
  return onSnapshot(
    doc(answersCollection(gameId), answerId(questionId, uid)),
    (snapshot) => onChange(snapshot.exists() ? toAnswer(snapshot) : null),
    onError
  )
}

/* --------------------------------- Setup --------------------------------- */

/**
 * Creates a game with the current user as director. Returns its id.
 * `live/state` is created by the director's first command (see updateLive):
 * rules can't see the new game from the same batch.
 */
export async function createGame(title: string, uid: string) {
  const ref = await addDoc(gamesCollection, {
    title,
    roles: { [uid]: "director" },
    memberIds: [uid],
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGameTitle(gameId: string, title: string) {
  await updateDoc(gameDoc(gameId), { title })
}

export type TeamContestant = { uid: string; name: string; seat: number }

/**
 * Saves who has which role. Contestant documents are created for new
 * contestants (score 0), renamed/reseated for existing ones and deleted for
 * removed ones.
 */
export async function saveTeam(
  gameId: string,
  roles: Record<string, GameRole>,
  contestants: TeamContestant[],
  existing: Contestant[]
) {
  const batch = writeBatch(db)
  batch.update(gameDoc(gameId), { roles, memberIds: Object.keys(roles) })

  const existingIds = new Set(existing.map((contestant) => contestant.uid))
  for (const contestant of contestants) {
    const ref = doc(contestantsCollection(gameId), contestant.uid)
    if (existingIds.has(contestant.uid)) {
      batch.update(ref, { name: contestant.name, seat: contestant.seat })
    } else {
      batch.set(ref, {
        name: contestant.name,
        seat: contestant.seat,
        score: 0,
        answeredQuestionId: null,
      })
    }
  }
  const keptIds = new Set(contestants.map((contestant) => contestant.uid))
  for (const contestant of existing) {
    if (!keptIds.has(contestant.uid)) {
      batch.delete(doc(contestantsCollection(gameId), contestant.uid))
    }
  }
  await batch.commit()
}

function toQuestionData(values: QuestionFormValues) {
  return {
    text: values.text,
    options: OPTION_IDS.map((id, index) => ({ id, text: values.options[index] })),
    correctOptionId: values.correctOptionId,
    timeLimitSec: values.timeLimitSec,
    explanation: values.explanation,
    mcNotes: values.mcNotes,
  }
}

export async function createQuestion(
  gameId: string,
  values: QuestionFormValues,
  order: number
) {
  await addDoc(questionsCollection(gameId), { ...toQuestionData(values), order })
}

export async function updateQuestion(
  gameId: string,
  questionId: string,
  values: QuestionFormValues
) {
  await updateDoc(
    doc(questionsCollection(gameId), questionId),
    toQuestionData(values)
  )
}

export async function deleteQuestion(gameId: string, questionId: string) {
  await deleteDoc(doc(questionsCollection(gameId), questionId))
}

/** Swaps the show order of two questions. */
export async function swapQuestions(gameId: string, a: Question, b: Question) {
  const batch = writeBatch(db)
  batch.update(doc(questionsCollection(gameId), a.id), { order: b.order })
  batch.update(doc(questionsCollection(gameId), b.id), { order: a.order })
  await batch.commit()
}

/* ------------------------------- Director -------------------------------- */

/** Merges into live/state, creating it on the first command. */
function updateLive(gameId: string, data: Record<string, unknown>) {
  return setDoc(
    liveDoc(gameId),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

/** Shows a question everywhere (without its answer); answering stays closed. */
export function showQuestion(gameId: string, question: Question, index: number) {
  return updateLive(gameId, {
    phase: "question_shown",
    questionId: question.id,
    questionIndex: index,
    question: { text: question.text, options: question.options },
    timeLimitSec: question.timeLimitSec,
    openedAt: null,
    correctOptionId: null,
    results: null,
    showScoreboard: false,
  })
}

/** Opens answering; the rules accept answers for `timeLimitSec` from now. */
export function startAnswering(gameId: string) {
  return updateLive(gameId, {
    phase: "answering",
    openedAt: serverTimestamp(),
  })
}

export function lockAnswers(gameId: string) {
  return updateLive(gameId, { phase: "locked" })
}

/**
 * Locks answering, marks every answer right or wrong, adds a point to each
 * correct contestant and publishes the correct answer and results, all in one
 * batch so every screen switches at the same moment.
 */
export async function revealAnswer(
  gameId: string,
  question: Question,
  contestants: Contestant[],
  phase: LiveState["phase"]
) {
  if (phase === "answering") {
    await lockAnswers(gameId)
  }
  // Read from the server so no answer that reached it is missed.
  const snapshot = await getDocsFromServer(
    query(answersCollection(gameId), where("questionId", "==", question.id))
  )
  const answers = snapshot.docs.map(toAnswer)

  const batch = writeBatch(db)
  const results: Record<string, ContestantResult> = {}
  for (const contestant of contestants) {
    const answer = answers.find((a) => a.contestantId === contestant.uid)
    const isCorrect = answer?.optionId === question.correctOptionId
    results[contestant.uid] = { optionId: answer?.optionId ?? null, isCorrect }
    if (answer) {
      batch.update(doc(answersCollection(gameId), answer.id), { isCorrect })
    }
    if (isCorrect) {
      batch.update(doc(contestantsCollection(gameId), contestant.uid), {
        score: increment(POINTS_PER_CORRECT_ANSWER),
      })
    }
  }
  batch.update(liveDoc(gameId), {
    phase: "revealed",
    correctOptionId: question.correctOptionId,
    results,
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export function setShowScoreboard(gameId: string, showScoreboard: boolean) {
  return updateLive(gameId, { showScoreboard })
}

export function endGame(gameId: string) {
  return updateLive(gameId, { phase: "ended", showScoreboard: true })
}

/** Deletes every answer, zeroes the scores and returns to the start. */
export async function resetGame(gameId: string, contestants: Contestant[]) {
  const answers = await getDocsFromServer(answersCollection(gameId))
  const batch = writeBatch(db)
  answers.docs.forEach((answer) => batch.delete(answer.ref))
  for (const contestant of contestants) {
    batch.update(doc(contestantsCollection(gameId), contestant.uid), {
      score: 0,
      answeredQuestionId: null,
    })
  }
  batch.set(liveDoc(gameId), { ...idleState, updatedAt: serverTimestamp() })
  await batch.commit()
}

/* ------------------------------ Contestant ------------------------------- */

/**
 * Records the contestant's final answer. The rules reject it unless answering
 * is open, the time limit hasn't passed and they haven't answered already.
 */
export async function submitAnswer(
  gameId: string,
  questionId: string,
  uid: string,
  optionId: OptionId
) {
  const batch = writeBatch(db)
  batch.set(doc(answersCollection(gameId), answerId(questionId, uid)), {
    questionId,
    contestantId: uid,
    optionId,
    answeredAt: serverTimestamp(),
    isCorrect: null,
  })
  batch.update(doc(contestantsCollection(gameId), uid), {
    answeredQuestionId: questionId,
  })
  await batch.commit()
}

export function getGameErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
        return "Not allowed. Answering may be closed, or you don't have this role."
      case "not-found":
        return "This game no longer exists."
      case "unavailable":
        return "Can't reach the server. Check your connection."
    }
  } else if (error instanceof Error && error.message) {
    return error.message
  }
  return "Something went wrong. Please try again."
}
