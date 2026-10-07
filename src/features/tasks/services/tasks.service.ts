import { FirebaseError } from "firebase/app"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentSnapshot,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase"
import type { Task, TaskInput } from "@/features/tasks/types"

const tasksCollection = collection(db, "tasks")

function toDate(value: unknown) {
  return value ? (value as Timestamp).toDate() : null
}

/** Reads a due date stored as a Timestamp (or a legacy `YYYY-MM-DD` string). */
function toDueDate(value: unknown) {
  if (!value) return null
  if (typeof value === "string") return value
  const date = (value as Timestamp).toDate()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** Stores a `YYYY-MM-DD` due date as a Timestamp at local midnight. */
function fromDueDate(value: string | null) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  return Timestamp.fromDate(new Date(year, month - 1, day))
}

function toTask(snapshot: DocumentSnapshot): Task {
  // "estimate" fills in pending server timestamps right after a local write.
  const data = snapshot.data({ serverTimestamps: "estimate" }) ?? {}
  return {
    id: snapshot.id,
    title: data.title ?? "",
    description: data.description ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "medium",
    assigneeEmail: data.assigneeEmail ?? null,
    dueDate: toDueDate(data.dueDate),
    createdBy: data.createdBy ?? "",
    createdByEmail: data.createdByEmail ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

function normalize(input: Partial<TaskInput>) {
  const { dueDate, ...result } = input
  if (result.title !== undefined) result.title = result.title.trim()
  if (result.description !== undefined) {
    result.description = result.description.trim()
  }
  if (result.assigneeEmail !== undefined) {
    result.assigneeEmail = result.assigneeEmail?.trim().toLowerCase() || null
  }
  if (dueDate === undefined) return result
  return { ...result, dueDate: fromDueDate(dueDate) }
}

function requireUser() {
  const user = auth.currentUser
  if (!user) {
    throw new Error("You must be signed in to manage tasks.")
  }
  return user
}

/** Creates a task owned by the signed-in user and returns its id. */
export async function createTask(input: TaskInput) {
  const user = requireUser()
  const ref = await addDoc(tasksCollection, {
    ...normalize(input),
    createdBy: user.uid,
    createdByEmail: user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTask(id: string, changes: Partial<TaskInput>) {
  requireUser()
  await updateDoc(doc(tasksCollection, id), {
    ...normalize(changes),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTask(id: string) {
  requireUser()
  await deleteDoc(doc(tasksCollection, id))
}

/** Returns all tasks, newest first. */
export async function getTasks() {
  const snapshot = await getDocs(
    query(tasksCollection, orderBy("createdAt", "desc"))
  )
  return snapshot.docs.map(toTask)
}

/** Returns the task, or `null` if it does not exist. */
export async function getTask(id: string) {
  const snapshot = await getDoc(doc(tasksCollection, id))
  return snapshot.exists() ? toTask(snapshot) : null
}

export function getTaskErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
        return "You don't have permission to do this."
      case "not-found":
        return "This task no longer exists."
      case "unavailable":
        return "Can't reach the database. Check your connection."
    }
  }
  return error instanceof Error ? error.message : "Something went wrong."
}
