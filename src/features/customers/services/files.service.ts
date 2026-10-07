import { FirebaseError } from "firebase/app"
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore"
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage"

import { auth, db, storage } from "@/lib/firebase"
import { MAX_FILE_SIZE, type CustomerFile } from "@/features/customers/types"
import { userRef } from "@/features/users/services/users.service"

/** `customers/{customerId}/files` */
export function filesCollection(customerId: string) {
  return collection(db, "customers", customerId, "files")
}

function toCustomerFile(
  customerId: string,
  snapshot: QueryDocumentSnapshot
): CustomerFile {
  // "estimate" fills in pending server timestamps right after a local write.
  const data = snapshot.data({ serverTimestamps: "estimate" })
  return {
    id: snapshot.id,
    customerId,
    name: data.name ?? "",
    url: data.url ?? "",
    contentType: data.contentType ?? "",
    size: data.size ?? 0,
    storagePath: data.storagePath ?? "",
    uploadedAt: data.uploadedAt ? (data.uploadedAt as Timestamp).toDate() : null,
    uploadedBy: (data.uploadedBy as DocumentReference | undefined)?.id ?? "",
  }
}

function requireUser() {
  const user = auth.currentUser
  if (!user) {
    throw new Error("You must be signed in to manage files.")
  }
  return user
}

/**
 * Uploads `file` to `customers/{customerId}/files/{fileId}-{name}` in Storage,
 * then records it in the `files` subcollection. Reports progress from 0 to 1.
 */
export async function uploadCustomerFile(
  customerId: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  const user = requireUser()
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`"${file.name}" is larger than 10 MB.`)
  }

  // Generate the id first so the Storage path and the document match.
  const docRef = doc(filesCollection(customerId))
  const storagePath = `customers/${customerId}/files/${docRef.id}-${file.name}`
  const storageRef = ref(storage, storagePath)
  const contentType = file.type || "application/octet-stream"

  const task = uploadBytesResumable(storageRef, file, {
    contentType,
    customMetadata: { uploadedBy: user.uid },
  })
  task.on("state_changed", (snapshot) =>
    onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes)
  )
  await task

  try {
    await setDoc(docRef, {
      name: file.name,
      url: await getDownloadURL(storageRef),
      contentType,
      size: file.size,
      storagePath,
      uploadedAt: serverTimestamp(),
      uploadedBy: userRef(user.uid),
    })
  } catch (err) {
    // Don't leave an orphaned object behind if the document can't be saved.
    await deleteObject(storageRef).catch(() => {})
    throw err
  }
  return docRef.id
}

/** Deletes the Storage object (if it still exists), then the document. */
export async function deleteCustomerFile(file: CustomerFile) {
  requireUser()
  try {
    await deleteObject(ref(storage, file.storagePath))
  } catch (err) {
    if (
      !(err instanceof FirebaseError) ||
      err.code !== "storage/object-not-found"
    ) {
      throw err
    }
  }
  await deleteDoc(doc(filesCollection(file.customerId), file.id))
}

/** Returns the customer's files, newest first. */
export async function getCustomerFiles(customerId: string) {
  const snapshot = await getDocs(
    query(filesCollection(customerId), orderBy("uploadedAt", "desc"))
  )
  return snapshot.docs.map((docSnapshot) =>
    toCustomerFile(customerId, docSnapshot)
  )
}
