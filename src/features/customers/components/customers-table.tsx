"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  UsersIcon,
} from "lucide-react"
import {
  createColumnHelper,
  createSortedRowModel,
  FlexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortDirection,
  type SortFn,
  type SortingState,
} from "@tanstack/react-table"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CustomerPriorityBadge,
  CustomerStatusBadge,
} from "@/features/customers/components/customer-badges"
import {
  CUSTOMER_PRIORITY_RANK,
  canDeleteCustomer,
  customerHref,
  type Customer,
} from "@/features/customers/types"
import { getUserLabel, type UserProfile } from "@/features/users/types"

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, Customer>()

/** high → medium → low when ascending. */
const sortByPriority: SortFn<typeof features, Customer> = (rowA, rowB) =>
  CUSTOMER_PRIORITY_RANK[rowA.original.priority] -
  CUSTOMER_PRIORITY_RANK[rowB.original.priority]

/** Locale-aware so Vietnamese names sort correctly. */
const sortByText: SortFn<typeof features, Customer> = (rowA, rowB, columnId) =>
  String(rowA.getValue(columnId)).localeCompare(
    String(rowB.getValue(columnId)),
    "vi",
    { sensitivity: "base" }
  )

const DEFAULT_SORTING: SortingState = [{ id: "priority", desc: false }]

const SORT_ICONS = {
  asc: <ArrowUpIcon />,
  desc: <ArrowDownIcon />,
} satisfies Record<SortDirection, React.ReactNode>

function SortableHeader({
  label,
  sorted,
  onToggle,
}: {
  label: string
  sorted: false | SortDirection
  onToggle?: (event: unknown) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 data-[sorted=false]:text-muted-foreground"
      data-sorted={!!sorted}
      onClick={onToggle}
    >
      {label}
      {sorted ? SORT_ICONS[sorted] : <ArrowUpDownIcon />}
    </Button>
  )
}

type CustomersTableProps = {
  customers: Customer[]
  users: UserProfile[]
  /** Id of the customer open in the detail sheet. */
  selectedId: string | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomersTable({
  customers,
  users,
  selectedId,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [sorting, setSorting] = React.useState(DEFAULT_SORTING)

  const columns = React.useMemo(() => {
    const usersById = new Map(users.map((profile) => [profile.uid, profile]))

    return columnHelper.columns([
      columnHelper.accessor("id", {
        header: "ID",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <SortableHeader
            label="Name"
            sorted={column.getIsSorted()}
            onToggle={column.getToggleSortingHandler()}
          />
        ),
        sortFn: sortByText,
        cell: ({ row, getValue }) => (
          <Link
            href={customerHref(row.original.id)}
            replace
            scroll={false}
            className="font-medium hover:underline"
          >
            {getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("email", {
        header: ({ column }) => (
          <SortableHeader
            label="Email"
            sorted={column.getIsSorted()}
            onToggle={column.getToggleSortingHandler()}
          />
        ),
        sortFn: sortByText,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("priority", {
        header: ({ column }) => (
          <SortableHeader
            label="Priority"
            sorted={column.getIsSorted()}
            onToggle={column.getToggleSortingHandler()}
          />
        ),
        sortFn: sortByPriority,
        cell: ({ getValue }) => <CustomerPriorityBadge priority={getValue()} />,
      }),
      columnHelper.accessor("description", {
        header: "Description",
        enableSorting: false,
        cell: ({ getValue }) => (
          <p
            className="max-w-64 truncate text-muted-foreground"
            title={getValue()}
          >
            {getValue() || "—"}
          </p>
        ),
      }),
      columnHelper.accessor("status", {
        header: ({ column }) => (
          <SortableHeader
            label="Status"
            sorted={column.getIsSorted()}
            onToggle={column.getToggleSortingHandler()}
          />
        ),
        sortFn: sortByText,
        cell: ({ getValue }) => <CustomerStatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("assignedTo", {
        header: "Assigned to",
        enableSorting: false,
        cell: ({ getValue }) => {
          const uid = getValue()
          const assignee = uid ? usersById.get(uid) : undefined
          return (
            <span className="text-muted-foreground">
              {!uid
                ? "Unassigned"
                : assignee
                  ? getUserLabel(assignee)
                  : "Unknown user"}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground data-open:bg-muted"
                />
              }
            >
              <EllipsisVerticalIcon />
              <span className="sr-only">Open menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() =>
                  router.replace(customerHref(row.original.id), {
                    scroll: false,
                  })
                }
              >
                View activities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={!canDeleteCustomer(row.original, user)}
                onClick={() => onDelete(row.original)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ])
  }, [users, user, router, onEdit, onDelete])

  const table = useTable({
    features,
    data: customers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    // Toggle between asc and desc only, so the list is always sorted.
    enableSortingRemoval: false,
    getRowId: (row) => row.id,
  })

  const columnCount = columns.length

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className="first:pl-4 last:w-12"
                >
                  {header.isPlaceholder ? null : (
                    <FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={columnCount} className="px-4">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : error ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-32 text-center">
                <p className="text-destructive">{error}</p>
                <Button variant="link" onClick={onRetry}>
                  Try again
                </Button>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <UsersIcon className="size-8" />
                  No customers yet. Add the first one.
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.id === selectedId ? "selected" : undefined}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="first:pl-4">
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
