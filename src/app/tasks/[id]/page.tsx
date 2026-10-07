import { redirect } from "next/navigation"

// Task details open in a sheet on the list page; keep old links working.
export default async function TaskDetailPage({
  params,
}: PageProps<"/tasks/[id]">) {
  const { id } = await params
  redirect(`/tasks?task=${encodeURIComponent(id)}`)
}
