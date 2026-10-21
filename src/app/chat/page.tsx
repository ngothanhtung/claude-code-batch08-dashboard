import { Suspense } from "react"

import { ChatView } from "@/features/chat/components/chat-view"

export default function ChatPage() {
  return (
    // ChatView reads the open conversation from the URL with useSearchParams.
    <Suspense>
      <ChatView />
    </Suspense>
  )
}
