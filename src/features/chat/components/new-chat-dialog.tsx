"use client"

import * as React from "react"
import { Loader2Icon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  createConversation,
  getChatErrorMessage,
} from "@/features/chat/services/chat.service"
import {
  getInitials,
  hasSameMembers,
  type Conversation,
} from "@/features/chat/types"
import { getUsers } from "@/features/users/services/users.service"
import { getUserLabel, type UserProfile } from "@/features/users/types"

type NewChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: Conversation[]
  /** Called with the new room, or an existing one with the same members. */
  onSelect: (conversationId: string) => void
}

export function NewChatDialog({
  open,
  onOpenChange,
  conversations,
  onSelect,
}: NewChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>
            Pick one or more people. Users appear here after signing in once.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the selection resets on each open. */}
        <NewChatForm
          conversations={conversations}
          onSelect={(conversationId) => {
            onOpenChange(false)
            onSelect(conversationId)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function NewChatForm({
  conversations,
  onSelect,
}: Pick<NewChatDialogProps, "conversations" | "onSelect">) {
  const { user } = useAuth()
  const [users, setUsers] = React.useState<UserProfile[] | null>(null)
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => {
        setUsers([])
        toast.error(getChatErrorMessage(err))
      })
  }, [])

  const candidates = (users ?? [])
    .filter((profile) => profile.uid !== user?.uid)
    .filter((profile) =>
      getUserLabel(profile).toLowerCase().includes(search.trim().toLowerCase())
    )

  function toggle(uid: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, uid] : current.filter((id) => id !== uid)
    )
  }

  async function handleCreate() {
    if (!user || !users || !selected.length) return
    const memberIds = [user.uid, ...selected]
    const existing = conversations.find((conversation) =>
      hasSameMembers(conversation, memberIds)
    )
    if (existing) {
      onSelect(existing.id)
      return
    }

    setCreating(true)
    try {
      const others = users
        .filter((profile) => selected.includes(profile.uid))
        .map((profile) => ({ uid: profile.uid, name: getUserLabel(profile) }))
      const id = await createConversation(
        { uid: user.uid, name: getUserLabel(user) },
        others
      )
      onSelect(id)
    } catch (err) {
      toast.error(getChatErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people"
          className="pl-8"
          aria-label="Search people"
        />
      </div>
      <div className="-mx-1 max-h-72 overflow-y-auto">
        {users === null ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No users found.
          </p>
        ) : (
          candidates.map((profile) => {
            const label = getUserLabel(profile)
            return (
              <label
                key={profile.uid}
                className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(profile.uid)}
                  onCheckedChange={(checked) => toggle(profile.uid, checked)}
                />
                <Avatar className="size-8">
                  {profile.photoURL && <AvatarImage src={profile.photoURL} />}
                  <AvatarFallback>{getInitials(label)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium">{label}</div>
                  {profile.displayName && profile.email && (
                    <div className="truncate text-xs text-muted-foreground">
                      {profile.email}
                    </div>
                  )}
                </div>
              </label>
            )
          })
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          onClick={handleCreate}
          disabled={!selected.length || creating}
        >
          {creating && <Loader2Icon className="animate-spin" />}
          {selected.length > 1 ? "Create group" : "Start chat"}
        </Button>
      </DialogFooter>
    </>
  )
}
