"use server";

import { auth } from "@/lib/auth";
import { execute } from "@/lib/d1";
import { revalidatePath } from "next/cache";

export async function completeOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  await execute(`UPDATE users SET has_seen_onboarding = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [session.user.id]);

  revalidatePath("/");
  return { success: true };
}
