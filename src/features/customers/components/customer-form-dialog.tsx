"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  customerFormDefaults,
  customerFormSchema,
  type CustomerFormValues,
} from "@/features/customers/schema"
import {
  createCustomer,
  getCustomerErrorMessage,
  updateCustomer,
} from "@/features/customers/services/customers.service"
import {
  CUSTOMER_PRIORITIES,
  CUSTOMER_PRIORITY_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type Customer,
} from "@/features/customers/types"
import { getUserLabel, type UserProfile } from "@/features/users/types"

type CustomerFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The customer to edit. Omit to create a new customer. */
  customer?: Customer | null
  /** Users that can be picked as the assignee. */
  users: UserProfile[]
  onSaved?: () => void
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  users,
  onSaved,
}: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            {customer
              ? "Update the customer details."
              : "Add a customer and assign it to a teammate."}
          </DialogDescription>
        </DialogHeader>
        {/* Remounts with fresh values every time the dialog opens. */}
        <CustomerForm
          key={customer?.id ?? "new"}
          customer={customer}
          users={users}
          onSaved={() => {
            onOpenChange(false)
            onSaved?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function toFormValues(customer?: Customer | null): CustomerFormValues {
  if (!customer) return customerFormDefaults
  return {
    name: customer.name,
    email: customer.email,
    status: customer.status,
    priority: customer.priority,
    description: customer.description,
    assignedTo: customer.assignedTo,
  }
}

function CustomerForm({
  customer,
  users,
  onSaved,
}: {
  customer?: Customer | null
  users: UserProfile[]
  onSaved: () => void
}) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: toFormValues(customer),
  })
  const { isSubmitting, errors } = form.formState

  const assigneeItems = [
    { label: "Unassigned", value: null as string | null },
    ...users.map((user) => ({ label: getUserLabel(user), value: user.uid })),
  ]
  // Keep the current assignee selectable even if their profile is missing.
  if (
    customer?.assignedTo &&
    !users.some((user) => user.uid === customer.assignedTo)
  ) {
    assigneeItems.push({ label: "Unknown user", value: customer.assignedTo })
  }

  async function onSubmit(values: CustomerFormValues) {
    try {
      if (customer) {
        await updateCustomer(customer.id, values)
        toast.success("Customer updated")
      } else {
        await createCustomer(values)
        toast.success("Customer created")
      }
      onSaved()
    } catch (err) {
      form.setError("root", { message: getCustomerErrorMessage(err) })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-name">Name</FieldLabel>
              <Input
                {...field}
                id="customer-name"
                placeholder="Nguyễn Văn Tuấn"
                aria-invalid={fieldState.invalid}
                autoFocus
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-email">Email</FieldLabel>
              <Input
                {...field}
                id="customer-email"
                type="email"
                placeholder="customer@example.com"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Status</FieldLabel>
                <Select
                  items={CUSTOMER_STATUS_LABELS}
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {CUSTOMER_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="priority"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Priority</FieldLabel>
                <Select
                  items={CUSTOMER_PRIORITY_LABELS}
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {CUSTOMER_PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
        <Controller
          name="assignedTo"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Assigned to</FieldLabel>
              <Select
                items={assigneeItems}
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assigneeItems.map((item) => (
                    <SelectItem key={item.value ?? "none"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="customer-description">Description</FieldLabel>
              <Textarea
                {...field}
                id="customer-description"
                placeholder="Notes about this customer..."
                rows={4}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {errors.root && <FieldError>{errors.root.message}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {customer ? "Save changes" : "Create customer"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
