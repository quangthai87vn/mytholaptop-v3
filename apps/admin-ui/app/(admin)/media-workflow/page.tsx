import { redirect } from "next/navigation";

/**
 * @deprecated MediaWorkflow page has been consolidated into /tasks.
 */
export default function MediaWorkflowPage() {
  redirect("/tasks?view=workflow");
}
