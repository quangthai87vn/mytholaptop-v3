import { redirect } from "next/navigation";

export default function MigrationRedirectPage() {
  redirect("/products/sync");
}
