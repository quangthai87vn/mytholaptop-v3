/**
 * Calendar page — workspace calendar hub
 * P8.1: New canonical path. Redirects to /workspace/calendar (existing implementation)
 */
import { redirect } from "next/navigation";

export default function CalendarPage() {
  redirect("/workspace/calendar");
}
