import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/d1";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?redirectTo=/admin");
  }

  const user = await queryOne<{ role: string | null }>(`SELECT role FROM users WHERE id = ? LIMIT 1`, [session.user.id]);

  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  return <div className="admin-layout">{children}</div>;
}
