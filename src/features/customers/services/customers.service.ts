import { FirebaseError } from "firebase/app"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase"
import { activitiesCollection } from "@/features/customers/services/activities.service"
import type { Customer, CustomerInput } from "@/features/customers/types"
import { userRef } from "@/features/users/services/users.service"

const customersCollection = collection(db, "customers")

function toDate(value: unknown) {
  return value ? (value as Timestamp).toDate() : null
}

/** Reads the uid out of a `users/{uid}` reference. */
function toUid(value: unknown) {
  return value ? (value as DocumentReference).id : null
}

function toCustomer(snapshot: QueryDocumentSnapshot): Customer {
  // "estimate" fills in pending server timestamps right after a local write.
  const data = snapshot.data({ serverTimestamps: "estimate" })
  return {
    id: snapshot.id,
    name: data.name ?? "",
    email: data.email ?? "",
    status: data.status ?? "active",
    priority: data.priority ?? "medium",
    description: data.description ?? "",
    assignedTo: toUid(data.assignedTo),
    createdBy: toUid(data.createdBy) ?? "",
    updatedBy: toUid(data.updatedBy) ?? "",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

function toFirestore(input: CustomerInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    status: input.status,
    priority: input.priority,
    description: input.description.trim(),
    assignedTo: input.assignedTo ? userRef(input.assignedTo) : null,
  }
}

function requireUser() {
  const user = auth.currentUser
  if (!user) {
    throw new Error("You must be signed in to manage customers.")
  }
  return user
}

/** Creates a customer owned by the signed-in user and returns its id. */
export async function createCustomer(input: CustomerInput) {
  const user = requireUser()
  const ref = await addDoc(customersCollection, {
    ...toFirestore(input),
    createdBy: userRef(user.uid),
    updatedBy: userRef(user.uid),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const user = requireUser()
  await updateDoc(doc(customersCollection, id), {
    ...toFirestore(input),
    updatedBy: userRef(user.uid),
    updatedAt: serverTimestamp(),
  })
}

/** Max writes per batch is 500; leave headroom. */
const BATCH_SIZE = 400

/**
 * Deletes the customer and its activities. Firestore doesn't delete
 * subcollections with their parent, so the activities go first.
 */
export async function deleteCustomer(id: string) {
  requireUser()
  const activities = await getDocs(activitiesCollection(id))
  for (let i = 0; i < activities.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const activity of activities.docs.slice(i, i + BATCH_SIZE)) {
      batch.delete(activity.ref)
    }
    await batch.commit()
  }
  await deleteDoc(doc(customersCollection, id))
}

/** Returns all customers, newest first. */
export async function getCustomers() {
  const snapshot = await getDocs(
    query(customersCollection, orderBy("createdAt", "desc"))
  )
  return snapshot.docs.map(toCustomer)
}

export function getCustomerErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
        return "You don't have permission to do this."
      case "not-found":
        return "This customer no longer exists."
      case "unavailable":
        return "Can't reach the database. Check your connection."
    }
  }
  return error instanceof Error ? error.message : "Something went wrong."
}
