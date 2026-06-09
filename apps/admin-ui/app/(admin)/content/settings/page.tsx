/**
 * AI Settings redirect — legacy canonical: /content/settings
 * Canonical route is now /settings/ai (P8.1.2).
 * This page redirects to the new canonical location.
 * Keeping this file ensures old links/bookmarks still work.
 */
import { redirect } from "next/navigation";

export default function ContentSettingsRedirect() {
  redirect("/settings/ai");
}
