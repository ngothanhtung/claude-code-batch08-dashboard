"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CustomerDeleteDialog } from "@/features/customers/components/customer-delete-dialog"
import { CustomerDetailSheet } from "@/features/customers/components/customer-detail-sheet"
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog"
import { CustomersTable } from "@/features/customers/components/customers-table"
import {
  getCustomerErrorMessage,
  getCustomers,
} from "@/features/customers/services/customers.service"
import type { Customer } from "@/features/customers/types"
import { getUsers } from "@/features/users/services/users.service"
import type { UserProfile } from "@/features/users/types"

type ListState = {
  customers: Customer[]
  users: UserProfile[]
  loading: boolean
  error: string | null
}

export function CustomersView() {
  const router = useRouter()
  // The open customer lives in the URL so it can be shared and survives reloads.
  const selectedId = useSearchParams().get("customer")
  const [state, setState] = React.useState<ListState>({
    customers: [],
    users: [],
    loading: true,
    error: null,
  })
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Customer | null>(null)
  const [deleting, setDeleting] = React.useState<Customer | null>(null)

  const loadCustomers = React.useCallback(() => {
    return Promise.all([getCustomers(), getUsers()])
      .then(([customers, users]) =>
        setState({ customers, users, loading: false, error: null })
      )
      .catch((err) =>
        setState((current) => ({
          ...current,
          loading: false,
          error: getCustomerErrorMessage(err),
        }))
      )
  }, [])

  React.useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const openEdit = React.useCallback((customer: Customer) => {
    setEditing(customer)
    setFormOpen(true)
  }, [])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Manage your customers and who is responsible for them.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          New customer
        </Button>
      </div>

      <CustomersTable
        customers={state.customers}
        users={state.users}
        selectedId={selectedId}
        loading={state.loading}
        error={state.error}
        onRetry={() => {
          setState((current) => ({ ...current, loading: true }))
          loadCustomers()
        }}
        onEdit={openEdit}
        onDelete={setDeleting}
      />

      <CustomerDetailSheet
        customerId={selectedId}
        customer={state.customers.find(
          (customer) => customer.id === selectedId
        )}
        loading={state.loading}
        users={state.users}
        onClose={() => router.replace("/customers", { scroll: false })}
      />
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        users={state.users}
        onSaved={loadCustomers}
      />
      <CustomerDeleteDialog
        customer={deleting}
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onDeleted={loadCustomers}
      />
    </div>
  )
}
