"use server";

import { cookies } from "next/headers";
import { signOut } from "@/lib/auth";

export async function signOutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("nv.redirect-to");
  await signOut({ redirectTo: "/" });
}
