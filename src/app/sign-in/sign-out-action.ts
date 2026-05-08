"use server";

import { cookies } from "next/headers";
import { signOut } from "@/lib/auth";

export async function signOutUser() {
  const cookieStore = await cookies();
  
  // Clear the session cookie on the server
  const sessionCookieName = process.env.NODE_ENV === "production" 
    ? "__Secure-authjs.session-token" 
    : "authjs.session-token";
  cookieStore.delete(sessionCookieName);
  
  await signOut({ redirectTo: "/" });
}
