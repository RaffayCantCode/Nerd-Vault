import { redirect } from "next/navigation";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const asQuery = new URLSearchParams();
  asQuery.set("tab", "media");
  const folder = typeof resolvedSearchParams?.folder === "string" ? resolvedSearchParams.folder : undefined;
  const user = typeof resolvedSearchParams?.user === "string" ? resolvedSearchParams.user : undefined;
  if (folder) asQuery.set("folder", folder);
  if (user) asQuery.set("user", user);
  redirect(`/home?${asQuery.toString()}`);
}
