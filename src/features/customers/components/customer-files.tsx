"use client"

import * as React from "react"
import {
  EllipsisVerticalIcon,
  FileArchiveIcon,
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { getCustomerErrorMessage } from "@/features/customers/services/customers.service"
import {
  deleteCustomerFile,
  getCustomerFiles,
  uploadCustomerFile,
} from "@/features/customers/services/files.service"
import {
  canDeleteCustomerFile,
  formatFileSize,
  type Customer,
  type CustomerFile,
} from "@/features/customers/types"
import { getUserLabel, type UserProfile } from "@/features/users/types"

type ListState = {
  files: CustomerFile[]
  loading: boolean
  error: string | null
}

type Upload = { key: string; name: string; progress: number }

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return <FileImageIcon />
  if (/spreadsheet|excel|csv/.test(contentType)) return <FileSpreadsheetIcon />
  if (/zip|compressed|archive|tar|rar|7z/.test(contentType)) {
    return <FileArchiveIcon />
  }
  if (/pdf|text|word|document|presentation/.test(contentType)) {
    return <FileTextIcon />
  }
  return <FileIcon />
}

/** Short type label, e.g. "PDF" from "contract.pdf". */
function getFileTypeLabel(file: CustomerFile) {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()
    : undefined
  return extension ? extension.toUpperCase() : file.contentType
}

export function CustomerFiles({
  customer,
  users,
}: {
  customer: Customer
  users: UserProfile[]
}) {
  const { user } = useAuth()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [state, setState] = React.useState<ListState>({
    files: [],
    loading: true,
    error: null,
  })
  const [uploads, setUploads] = React.useState<Upload[]>([])
  const [dragging, setDragging] = React.useState(false)
  const [deleting, setDeleting] = React.useState<CustomerFile | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)

  const loadFiles = React.useCallback(() => {
    return getCustomerFiles(customer.id)
      .then((files) => setState({ files, loading: false, error: null }))
      .catch((err) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: getCustomerErrorMessage(err),
        }))
      )
  }, [customer.id])

  React.useEffect(() => {
    loadFiles()
  }, [loadFiles])

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return
    const batch = files.map((file) => ({
      file,
      key: crypto.randomUUID(),
    }))
    setUploads((current) => [
      ...current,
      ...batch.map(({ file, key }) => ({ key, name: file.name, progress: 0 })),
    ])

    const results = await Promise.allSettled(
      batch.map(({ file, key }) =>
        uploadCustomerFile(customer.id, file, (progress) =>
          setUploads((current) =>
            current.map((upload) =>
              upload.key === key ? { ...upload, progress } : upload
            )
          )
        ).finally(() =>
          setUploads((current) =>
            current.filter((upload) => upload.key !== key)
          )
        )
      )
    )

    const uploaded = results.filter((r) => r.status === "fulfilled").length
    if (uploaded > 0) {
      toast.success(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`)
    }
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("File upload failed", result.reason)
        toast.error(getCustomerErrorMessage(result.reason))
      }
    }
    loadFiles()
  }

  async function handleDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteCustomerFile(deleting)
      toast.success("File deleted")
      setDeleting(null)
      loadFiles()
    } catch (err) {
      console.error("File delete failed", err)
      toast.error(getCustomerErrorMessage(err))
    } finally {
      setDeletePending(false)
    }
  }

  const usersById = new Map(users.map((profile) => [profile.uid, profile]))

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        // Ignore leaving into a child element.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        uploadFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">
          Files{!state.loading && ` (${state.files.length})`}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            uploadFiles(Array.from(event.target.files ?? []))
            // Allow picking the same file again.
            event.target.value = ""
          }}
        />
      </div>

      {dragging && (
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 p-6 text-center text-sm">
          <UploadIcon className="size-6" />
          Drop files to upload
        </div>
      )}

      {uploads.map((upload) => (
        <div
          key={upload.key}
          className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{upload.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round(upload.progress * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${upload.progress * 100}%` }}
            />
          </div>
        </div>
      ))}

      {state.loading ? (
        <Skeleton className="h-14 w-full" />
      ) : state.error ? (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-destructive">{state.error}</p>
          <Button
            variant="link"
            onClick={() => {
              setState((current) => ({ ...current, loading: true }))
              loadFiles()
            }}
          >
            Try again
          </Button>
        </div>
      ) : state.files.length === 0 && uploads.length === 0 && !dragging ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <PaperclipIcon className="size-6" />
          No files yet. Upload or drop files here (max 10 MB each).
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {state.files.map((file) => {
            const uploader = usersById.get(file.uploadedBy)
            return (
              <li key={file.id} className="flex items-center gap-3 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
                  {getFileIcon(file.contentType)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium hover:underline"
                    title={file.name}
                  >
                    {file.name}
                  </a>
                  <span className="truncate text-xs text-muted-foreground">
                    {getFileTypeLabel(file)} · {formatFileSize(file.size)} ·{" "}
                    {file.uploadedAt?.toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    }) ?? "—"}{" "}
                    · {uploader ? getUserLabel(uploader) : "Unknown user"}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground data-open:bg-muted"
                      />
                    }
                  >
                    <EllipsisVerticalIcon />
                    <span className="sr-only">Open menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(file.url, "_blank", "noreferrer")
                      }
                    >
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!canDeleteCustomerFile(file, customer, user)}
                      onClick={() => setDeleting(file)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.name}&rdquo; will be permanently deleted. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={handleDelete}
            >
              {deletePending && <Loader2Icon className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
