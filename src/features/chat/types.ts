/** A participant as stored in `conversations/{id}.members`. */
export type ChatMember = {
  uid: string
  name: string
}

/** A chat room in the Firestore `conversations` collection. */
export type Conversation = {
  id: string
  members: ChatMember[]
  /** Uids of `members`, used by queries (`array-contains`) and rules. */
  memberIds: string[]
  createdBy: string
  createdTime: Date | null
  /** Preview of the newest message, null until the first one is sent. */
  lastMessage: string | null
  lastSender: string | null
  updatedTime: Date | null
}

/** A file attached to a message; the file itself is in Storage. */
export type ChatAttachment = {
  name: string
  /** Download URL from Firebase Storage. */
  url: string
  /** MIME type, e.g. `image/png`. */
  contentType: string
  /** Bytes. */
  size: number
  /** `conversations/{conversationId}/messages/{messageId}/{name}` */
  storagePath: string
}

/** A message in `conversations/{id}/messages`. */
export type ChatMessage = {
  id: string
  sender: string
  /** May be empty when the message only has attachments. */
  content: string
  attachments: ChatAttachment[]
  createdTime: Date | null
}

/** Limits mirrored in `firestore.rules` and `storage.rules`. */
export const MAX_MESSAGE_LENGTH = 2000
export const MAX_ATTACHMENTS = 10
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export function isImage(contentType: string) {
  return contentType.startsWith("image/")
}

/** Text for the room list, e.g. "📎 report.pdf" for a file-only message. */
export function getMessagePreview(content: string, attachments: { name: string }[]) {
  if (content) return content
  if (attachments.length === 1) return `📎 ${attachments[0].name}`
  return `📎 ${attachments.length} files`
}

/** Names of everyone except the current user, e.g. "An, Bình". */
export function getConversationTitle(
  conversation: Conversation,
  currentUid: string | undefined
) {
  const others = conversation.members.filter(
    (member) => member.uid !== currentUid
  )
  return (others.length ? others : conversation.members)
    .map((member) => member.name)
    .join(", ")
}

export function getMemberName(conversation: Conversation, uid: string) {
  return (
    conversation.members.find((member) => member.uid === uid)?.name ??
    "Unknown user"
  )
}

export function getInitials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

/** Same set of members, regardless of order. */
export function hasSameMembers(conversation: Conversation, uids: string[]) {
  const ids = new Set(conversation.memberIds)
  return ids.size === new Set(uids).size && uids.every((uid) => ids.has(uid))
}
