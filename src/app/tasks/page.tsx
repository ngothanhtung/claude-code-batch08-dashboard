import { Suspense } from "react"

import { TasksView } from "@/features/tasks/components/tasks-view"

export default function TasksPage() {
  return (
    // TasksView reads the open task from the URL with useSearchParams.
    <Suspense>
      <TasksView />
    </Suspense>
  )
}
