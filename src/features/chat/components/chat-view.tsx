"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon, MessageSquareIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChatRoom, formatChatTime } from "@/features/chat/components/chat-room"
import { NewChatDialog } from "@/features/chat/components/new-chat-dialog"
import {
  getChatErrorMessage,
  subscribeToConversations,
} from "@/features/chat/services/chat.service"
import {
  getConversationTitle,
  getInitials,
  getMemberName,
  type Conversation,
} from "@/features/chat/types"

type ConversationsState = {
  conversations: Conversation[]
  loading: boolean
  error: string | null
}

function chatHref(conversationId: string) {
  return `/chat?conversation=${encodeURIComponent(conversationId)}`
}

export function ChatView() {
  const router = useRouter()
  const { user } = useAuth()
  // The open room lives in the URL so it can be shared and survives reloads.
  const selectedId = useSearchParams().get("conversation")
  const [state, setState] = React.useState<ConversationsState>({
    conversations: [],
    loading: true,
    error: null,
  })
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const uid = user?.uid

  React.useEffect(() => {
    if (!uid) return
    return subscribeToConversations(
      uid,
      (conversations) =>
        setState({ conversations, loading: false, error: null }),
      (err) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: getChatErrorMessage(err),
        }))
    )
  }, [uid])

  const selected =
    state.conversations.find((conversation) => conversation.id === selectedId) ??
    null

  function lastMessagePreview(conversation: Conversation) {
    if (!conversation.lastMessage) return "No messages yet"
    const author =
      conversation.lastSender === uid
        ? "You"
        : conversation.members.length > 2 && conversation.lastSender
          ? getMemberName(conversation, conversation.lastSender)
          : null
    return author
      ? `${author}: ${conversation.lastMessage}`
      : conversation.lastMessage
  }

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] min-h-0">
      <aside
        className={cn(
          "w-full shrink-0 flex-col border-r md:flex md:w-80",
          selectedId ? "hidden" : "flex"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="font-semibold">Conversations</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusIcon />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {state.error ? (
            <p className="px-2 py-8 text-center text-sm text-destructive">
              {state.error}
            </p>
          ) : state.loading ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : state.conversations.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start a new chat.
            </p>
          ) : (
            state.conversations.map((conversation) => {
              const title = getConversationTitle(conversation, uid)
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    router.replace(chatHref(conversation.id), { scroll: false })
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted",
                    conversation.id === selectedId && "bg-muted"
                  )}
                >
                  <Avatar className="size-10">
                    <AvatarFallback>{getInitials(title)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {conversation.lastMessage
                          ? formatChatTime(conversation.updatedTime)
                          : ""}
                      </span>
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {lastMessagePreview(conversation)}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col md:flex",
          selectedId ? "flex" : "hidden"
        )}
      >
        {selected ? (
          <ChatRoom
            key={selected.id}
            conversation={selected}
            onBack={() => router.replace("/chat", { scroll: false })}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            {selectedId && state.loading ? (
              <Loader2Icon className="size-5 animate-spin" />
            ) : (
              <>
                <MessageSquareIcon className="size-10" />
                <p className="text-sm">
                  {selectedId
                    ? "This conversation doesn't exist or you're not a member."
                    : "Select a conversation or start a new chat."}
                </p>
                {selectedId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.replace("/chat", { scroll: false })}
                  >
                    Back to conversations
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <NewChatDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        conversations={state.conversations}
        onSelect={(id) => router.replace(chatHref(id), { scroll: false })}
      />
    </div>
  )
}
