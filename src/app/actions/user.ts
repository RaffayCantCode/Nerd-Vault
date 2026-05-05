"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function completeOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { hasSeenOnboarding: true },
  });

  revalidatePath("/");
  return { success: true };
}
