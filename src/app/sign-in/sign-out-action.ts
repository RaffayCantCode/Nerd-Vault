"use server";

import { signOut } from "@/lib/auth";

export async function signOutUser() {
  await signOut({ redirectTo: "/" });
}
