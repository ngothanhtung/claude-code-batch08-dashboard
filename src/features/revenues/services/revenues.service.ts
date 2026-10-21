import { FirebaseError } from "firebase/app"
import {
  collection,
  onSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore"

import { db } from "@/lib/firebase"
import type { Revenue } from "@/features/revenues/types"

const revenuesCollection = collection(db, "revenues")

function toNumber(value: unknown) {
  const number = typeof value === "string" ? Number(value) : value
  return typeof number === "number" && Number.isFinite(number) ? number : 0
}

function toRevenue(snapshot: QueryDocumentSnapshot): Revenue {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    year: toNumber(data.year),
    month: toNumber(data.month),
    value: toNumber(data.value),
  }
}

/**
 * Listens to the whole `revenues` collection and calls `onChange` with every
 * document on each change. Returns the unsubscribe function.
 */
export function subscribeToRevenues(
  onChange: (revenues: Revenue[]) => void,
  onError: (error: unknown) => void
) {
  return onSnapshot(
    revenuesCollection,
    (snapshot) => onChange(snapshot.docs.map(toRevenue)),
    onError
  )
}

export function getRevenueErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
        return "You don't have permission to view revenues."
      case "unavailable":
        return "Can't reach the server. Check your connection."
    }
  }
  return "Something went wrong. Please try again."
}
