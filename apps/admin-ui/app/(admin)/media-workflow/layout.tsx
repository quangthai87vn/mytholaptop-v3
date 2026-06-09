import { redirect } from "next/navigation";

/**
 * @deprecated MediaWorkflow UI has been consolidated into /tasks.
 */
export default function MediaWorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  redirect("/tasks?view=workflow");
}
