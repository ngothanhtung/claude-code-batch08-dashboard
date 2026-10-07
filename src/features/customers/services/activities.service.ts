import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentReference,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase"
import {
  activityHasContent,
  activityHasNote,
  type Activity,
  type ActivityInput,
} from "@/features/customers/types"
import { userRef } from "@/features/users/services/users.service"

/** `customers/{customerId}/activities` */
export function activitiesCollection(customerId: string) {
  return collection(db, "customers", customerId, "activities")
}

function toDate(value: unknown) {
  return value ? (value as Timestamp).toDate() : null
}

function toUid(value: unknown) {
  return value ? (value as DocumentReference).id : null
}

function toActivity(
  customerId: string,
  snapshot: QueryDocumentSnapshot
): Activity {
  // "estimate" fills in pending server timestamps right after a local write.
  const data = snapshot.data({ serverTimestamps: "estimate" })
  return {
    id: snapshot.id,
    customerId,
    type: data.type ?? "note",
    // Activities logged before times were added are stored at local midnight.
    date: toDate(data.date) ?? toDate(data.createdAt) ?? new Date(0),
    callQuality: data.callQuality ?? null,
    content: data.content ?? "",
    note: data.note ?? "",
    createdBy: toUid(data.createdBy) ?? "",
    updatedBy: toUid(data.updatedBy) ?? "",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

/** Fields that don't apply to the activity type are stored as `null`. */
function toFirestore(input: ActivityInput) {
  return {
    type: input.type,
    date: Timestamp.fromDate(input.date),
    callQuality: input.type === "call" ? input.callQuality : null,
    content: activityHasContent(input.type) ? input.content.trim() : null,
    note: activityHasNote(input.type) ? input.note.trim() : null,
  }
}

function requireUser() {
  const user = auth.currentUser
  if (!user) {
    throw new Error("You must be signed in to manage activities.")
  }
  return user
}

export async function createActivity(customerId: string, input: ActivityInput) {
  const user = requireUser()
  const ref = await addDoc(activitiesCollection(customerId), {
    ...toFirestore(input),
    createdBy: userRef(user.uid),
    updatedBy: userRef(user.uid),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateActivity(
  customerId: string,
  id: string,
  input: ActivityInput
) {
  const user = requireUser()
  await updateDoc(doc(activitiesCollection(customerId), id), {
    ...toFirestore(input),
    updatedBy: userRef(user.uid),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteActivity(customerId: string, id: string) {
  requireUser()
  await deleteDoc(doc(activitiesCollection(customerId), id))
}

/** Returns the customer's activities, most recent first. */
export async function getActivities(customerId: string) {
  const snapshot = await getDocs(
    query(activitiesCollection(customerId), orderBy("createdAt", "desc"))
  )
  // Sorted by date here instead of in the query, which would need a composite
  // index. The sort is stable, so ties stay newest-created first.
  return snapshot.docs
    .map((docSnapshot) => toActivity(customerId, docSnapshot))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}
