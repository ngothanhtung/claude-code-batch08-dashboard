import { Suspense } from "react"

import { CustomersView } from "@/features/customers/components/customers-view"

export default function CustomersPage() {
  return (
    // CustomersView reads the open customer from the URL with useSearchParams.
    <Suspense>
      <CustomersView />
    </Suspense>
  )
}
