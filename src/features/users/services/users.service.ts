import type { User } from "firebase/auth"
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import type { UserProfile } from "@/features/users/types"

const usersCollection = collection(db, "users")

/** Reference to `users/{uid}`, used for createdBy/updatedBy/assignedTo fields. */
export function userRef(uid: string) {
  return doc(usersCollection, uid)
}

function toUserProfile(snapshot: QueryDocumentSnapshot): UserProfile {
  const data = snapshot.data()
  return {
    uid: snapshot.id,
    displayName: data.displayName ?? null,
    email: data.email ?? null,
    photoURL: data.photoURL ?? null,
  }
}

/**
 * Creates or refreshes the signed-in user's profile so other users can pick
 * them (e.g. as a customer's assignee).
 */
export async function saveUserProfile(user: User) {
  await setDoc(
    userRef(user.uid),
    {
      displayName: user.displayName,
      email: user.email?.toLowerCase() ?? null,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

/** Returns every user who has signed in at least once. */
export async function getUsers() {
  const snapshot = await getDocs(usersCollection)
  return snapshot.docs.map(toUserProfile)
}
