import { FirebaseError } from "firebase/app"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentSnapshot,
} from "firebase/firestore"
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage"

import { db, storage } from "@/lib/firebase"
import {
  getMessagePreview,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  type ChatAttachment,
  type ChatMember,
  type ChatMessage,
  type Conversation,
} from "@/features/chat/types"

const conversationsCollection = collection(db, "conversations")

function messagesCollection(conversationId: string) {
  return collection(conversationsCollection, conversationId, "messages")
}

// Pending serverTimestamp() values are estimated so new messages sort and
// display immediately instead of showing up as null.
const snapshotOptions = { serverTimestamps: "estimate" } as const

function toConversation(snapshot: DocumentSnapshot): Conversation {
  const data = snapshot.data(snapshotOptions) ?? {}
  return {
    id: snapshot.id,
    members: data.members ?? [],
    memberIds: data.memberIds ?? [],
    createdBy: data.createdBy ?? "",
    createdTime: data.createdTime?.toDate() ?? null,
    lastMessage: data.lastMessage ?? null,
    lastSender: data.lastSender ?? null,
    updatedTime: data.updatedTime?.toDate() ?? null,
  }
}

function toMessage(snapshot: DocumentSnapshot): ChatMessage {
  const data = snapshot.data(snapshotOptions) ?? {}
  return {
    id: snapshot.id,
    sender: data.sender ?? "",
    content: data.content ?? "",
    attachments: data.attachments ?? [],
    createdTime: data.createdTime?.toDate() ?? null,
  }
}

/**
 * Listens to the conversations `uid` is a member of, newest activity first.
 * Sorted client-side so no composite index is needed.
 */
export function subscribeToConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError: (error: unknown) => void
) {
  return onSnapshot(
    query(conversationsCollection, where("memberIds", "array-contains", uid)),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map(toConversation)
          .sort(
            (a, b) =>
              (b.updatedTime?.getTime() ?? 0) - (a.updatedTime?.getTime() ?? 0)
          )
      ),
    onError
  )
}

/** Listens to the messages of a conversation, oldest first. */
export function subscribeToMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: unknown) => void
) {
  return onSnapshot(
    query(messagesCollection(conversationId), orderBy("createdTime", "asc")),
    (snapshot) => onChange(snapshot.docs.map(toMessage)),
    onError
  )
}

/** Creates a room for the current user and `others`. Returns its id. */
export async function createConversation(
  currentUser: ChatMember,
  others: ChatMember[]
) {
  const members = [
    currentUser,
    ...others.filter((member) => member.uid !== currentUser.uid),
  ]
  const ref = await addDoc(conversationsCollection, {
    members,
    memberIds: members.map((member) => member.uid),
    createdBy: currentUser.uid,
    createdTime: serverTimestamp(),
    lastMessage: null,
    lastSender: null,
    updatedTime: serverTimestamp(),
  })
  return ref.id
}

/** Throws a user-facing error if `files` can't be attached to one message. */
export function validateAttachments(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_ATTACHMENTS} files.`)
  }
  const tooLarge = files.find((file) => file.size > MAX_ATTACHMENT_SIZE)
  if (tooLarge) {
    throw new Error(`"${tooLarge.name}" is larger than 10 MB.`)
  }
}

/**
 * Uploads `files` to `conversations/{id}/messages/{messageId}/` in Storage,
 * then adds the message and updates the room's preview in one atomic write.
 * Reports overall upload progress from 0 to 1.
 */
export async function sendMessage(
  conversationId: string,
  sender: string,
  content: string,
  files: File[] = [],
  onProgress?: (progress: number) => void
) {
  validateAttachments(files)

  // Generate the id first so the Storage folder and the document match.
  const messageRef = doc(messagesCollection(conversationId))
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  const transferred = files.map(() => 0)
  const uploadedPaths: string[] = []

  try {
    // allSettled waits for every upload, so cleanup below sees all of them.
    const results = await Promise.allSettled(
      files.map(async (file, index): Promise<ChatAttachment> => {
        // Prefix with the index so two files with the same name don't collide.
        const storagePath = `${messageRef.path}/${index}-${file.name}`
        const storageRef = ref(storage, storagePath)
        const contentType = file.type || "application/octet-stream"
        const task = uploadBytesResumable(storageRef, file, {
          contentType,
          customMetadata: { uploadedBy: sender },
        })
        task.on("state_changed", (snapshot) => {
          transferred[index] = snapshot.bytesTransferred
          const done = transferred.reduce((sum, bytes) => sum + bytes, 0)
          onProgress?.(totalBytes ? done / totalBytes : 1)
        })
        await task
        uploadedPaths.push(storagePath)
        return {
          name: file.name,
          url: await getDownloadURL(storageRef),
          contentType,
          size: file.size,
          storagePath,
        }
      })
    )
    const failed = results.find((result) => result.status === "rejected")
    if (failed) throw failed.reason
    const attachments = results.map(
      (result) => (result as PromiseFulfilledResult<ChatAttachment>).value
    )

    const batch = writeBatch(db)
    batch.set(messageRef, {
      sender,
      content,
      attachments,
      createdTime: serverTimestamp(),
    })
    batch.update(doc(conversationsCollection, conversationId), {
      lastMessage: getMessagePreview(content, attachments),
      lastSender: sender,
      updatedTime: serverTimestamp(),
    })
    await batch.commit()
  } catch (err) {
    // Don't leave orphaned objects behind if an upload or the write failed.
    await Promise.all(
      uploadedPaths.map((path) => deleteObject(ref(storage, path)).catch(() => {}))
    )
    throw err
  }
}

export function getChatErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
      case "storage/unauthorized":
        return "You don't have access to this conversation."
      case "storage/canceled":
        return "The upload was canceled."
      case "storage/quota-exceeded":
        return "Storage quota exceeded."
      case "not-found":
        return "This conversation no longer exists."
      case "unavailable":
        return "Can't reach the server. Check your connection."
    }
  } else if (error instanceof Error && error.message) {
    return error.message
  }
  return "Something went wrong. Please try again."
}
