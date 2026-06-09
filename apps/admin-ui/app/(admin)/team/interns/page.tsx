/**
 * Team Interns page
 * Redirects to /interns (the canonical intern management page)
 */
import { redirect } from "next/navigation";

export default function TeamInternsPage() {
  redirect("/interns");
}
