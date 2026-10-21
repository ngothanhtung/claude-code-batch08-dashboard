"use client"

import * as React from "react"
import { format, isToday } from "date-fns"
import {
  ArrowLeftIcon,
  FileIcon,
  Loader2Icon,
  PaperclipIcon,
  SendIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  getChatErrorMessage,
  sendMessage,
  subscribeToMessages,
  validateAttachments,
} from "@/features/chat/services/chat.service"
import {
  getConversationTitle,
  getInitials,
  getMemberName,
  isImage,
  MAX_MESSAGE_LENGTH,
  type ChatAttachment,
  type ChatMessage,
  type Conversation,
} from "@/features/chat/types"
import { formatFileSize } from "@/features/customers/types"

type MessagesState = {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
}

export function formatChatTime(date: Date | null) {
  if (!date) return ""
  return format(date, isToday(date) ? "HH:mm" : "dd/MM/yyyy HH:mm")
}

type ChatRoomProps = {
  conversation: Conversation
  onBack: () => void
}

/** Messages and composer of one room. Remount (key) when the room changes. */
export function ChatRoom({ conversation, onBack }: ChatRoomProps) {
  const { user } = useAuth()
  const [state, setState] = React.useState<MessagesState>({
    messages: [],
    loading: true,
    error: null,
  })
  const [draft, setDraft] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [sending, setSending] = React.useState(false)
  /** Upload progress from 0 to 1 while sending files, otherwise null. */
  const [progress, setProgress] = React.useState<number | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(
    () =>
      subscribeToMessages(
        conversation.id,
        (messages) => setState({ messages, loading: false, error: null }),
        (err) =>
          setState((current) => ({
            ...current,
            loading: false,
            error: getChatErrorMessage(err),
          }))
      ),
    [conversation.id]
  )

  // Keep the newest message in view.
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [state.messages.length])

  const isGroup = conversation.members.length > 2
  const title = getConversationTitle(conversation, user?.uid)

  const disabled = Boolean(state.error) || sending
  const canSend = !disabled && (draft.trim() !== "" || files.length > 0)

  function addFiles(added: File[]) {
    if (!added.length || disabled) return
    const next = [...files, ...added]
    try {
      validateAttachments(next)
      setFiles(next)
    } catch (err) {
      toast.error(getChatErrorMessage(err))
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if (!user || !canSend) return
    const attached = files
    setSending(true)
    setDraft("")
    setFiles([])
    if (attached.length) setProgress(0)
    try {
      await sendMessage(conversation.id, user.uid, content, attached, setProgress)
    } catch (err) {
      setDraft(content)
      setFiles(attached)
      toast.error(getChatErrorMessage(err))
    } finally {
      setSending(false)
      setProgress(null)
    }
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        addFiles(Array.from(event.dataTransfer.files))
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/80 text-sm font-medium">
          Drop files to attach
        </div>
      )}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeftIcon />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback>{getInitials(title)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {conversation.members.length} members
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {state.error ? (
          <p className="py-12 text-center text-sm text-destructive">
            {state.error}
          </p>
        ) : state.loading ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : state.messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {state.messages.map((message, index) => {
              const mine = message.sender === user?.uid
              const startsRun =
                state.messages[index - 1]?.sender !== message.sender
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex max-w-[75%] flex-col",
                    mine ? "items-end self-end" : "items-start self-start",
                    startsRun && index > 0 && "mt-3"
                  )}
                >
                  {startsRun && !mine && isGroup && (
                    <span className="mb-1 px-1 text-xs text-muted-foreground">
                      {getMemberName(conversation, message.sender)}
                    </span>
                  )}
                  {message.attachments.length > 0 && (
                    <div
                      className={cn(
                        "mb-1 flex flex-col gap-1",
                        mine ? "items-end" : "items-start"
                      )}
                    >
                      {message.attachments.map((attachment) => (
                        <AttachmentView
                          key={attachment.storagePath}
                          attachment={attachment}
                        />
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                      title={formatChatTime(message.createdTime)}
                    >
                      {message.content}
                    </div>
                  )}
                  <span className="mt-0.5 px-1 text-[11px] text-muted-foreground tabular-nums">
                    {formatChatTime(message.createdTime)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(files.length > 0 || progress !== null) && (
        <div className="flex flex-col gap-2 border-t px-3 pt-3">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex max-w-56 items-center gap-2 rounded-md border bg-muted/50 py-1 pr-1 pl-2 text-xs"
                >
                  <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setFiles((current) => current.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {progress !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Uploading… {Math.round(progress * 100)}%</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <form
        className={cn(
          "flex items-end gap-2 p-3",
          files.length === 0 && progress === null && "border-t"
        )}
        onSubmit={(event) => {
          event.preventDefault()
          handleSend()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach files"
        >
          <PaperclipIcon />
        </Button>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter adds a line. Ignore Enter while an IME
            // (e.g. Vietnamese Telex) is still composing a character.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type a message…"
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          className="max-h-40 min-h-9 resize-none"
          onPaste={(event) => addFiles(Array.from(event.clipboardData.files))}
          aria-label="Message"
          disabled={Boolean(state.error)}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          aria-label="Send"
        >
          {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
        </Button>
      </form>
    </div>
  )
}

/** Images show as a thumbnail; other files as a download card. */
function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  if (isImage(attachment.contentType)) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        title={attachment.name}
        className="block overflow-hidden rounded-xl border"
      >
        {/* Storage download URLs are arbitrary hosts, so no next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-60 max-w-64 object-cover"
          loading="lazy"
        />
      </a>
    )
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-64 items-center gap-3 rounded-xl border bg-background px-3 py-2 text-sm hover:bg-muted"
    >
      <FileIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="truncate font-medium">{attachment.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </div>
      </div>
    </a>
  )
}
