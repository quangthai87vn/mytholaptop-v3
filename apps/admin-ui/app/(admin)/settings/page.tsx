/**
 * Redirect /settings → /settings/app
 * Preserves backward compatibility for old navigation links.
 */
import { redirect } from "next/navigation";

export default function SettingsRootPage() {
  redirect("/settings/app");
}
