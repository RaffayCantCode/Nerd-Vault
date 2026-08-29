"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { credentialsSignInSchema, credentialsSignUpSchema, normalizeEmail } from "@/lib/auth-credentials";
import { getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/auth-env";
import { signIn } from "@/lib/auth";
import { ensureDatabaseReady, execute, queryOne, uuid } from "@/lib/d1";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function sanitizeRedirectTo(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/sign-in")) {
    return "/";
  }

  return trimmed || "/";
}

export async function signInWithGoogle(formData?: FormData) {
  if (!getGoogleClientId() || !getGoogleClientSecret() || !getAuthSecret()) {
    redirect("/sign-in?mode=login&error=google-not-configured");
  }

  const redirectTo = sanitizeRedirectTo(formData?.get("redirectTo"));
  const cookieStore = await cookies();
  cookieStore.set("nv.redirect-to", redirectTo, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
    secure: process.env.NODE_ENV === "production",
  });

  try {
    await signIn("google", { redirectTo });
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      redirect(`/sign-in?mode=login&error=${encodeURIComponent(error.type ?? "google-sign-in-failed")}&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    redirect(`/sign-in?mode=login&error=${encodeURIComponent("google-sign-in-failed")}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }
}

export async function signUpWithCredentials(formData: FormData) {
  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));
  const parsed = credentialsSignUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const message = encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to create account.");
    redirect(`/sign-in?mode=signup&error=${message}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  await ensureDatabaseReady();
  const email = normalizeEmail(parsed.data.email);
  const existingUser = await queryOne<{ id: string }>(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email]);

  if (existingUser) {
    redirect(
      `/sign-in?mode=login&error=${encodeURIComponent("An account with this email already exists. Please log in.")}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const newUserId = uuid();

  const insertResult = await execute(
    `
      INSERT INTO users (
        id,
        name,
        email,
        image,
        password_hash,
        role,
        has_seen_onboarding,
        watched_visibility,
        wishlist_visibility,
        folders_default_visibility,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, NULL, ?, 'USER', 0, 'public', 'friends', 'public', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [newUserId, parsed.data.name.trim(), email, passwordHash],
  );

  if (insertResult.success === false && (insertResult as any).error) {
    console.error("[auth] Failed to insert new user into database:", (insertResult as any).error);
    redirect(
      `/sign-in?mode=signup&error=${encodeURIComponent(`Failed to create account: ${(insertResult as any).error}`)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  // Automatically sign in the newly registered user seamlessly
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    redirect(`/sign-in?mode=login&success=account-created&redirectTo=${encodeURIComponent(redirectTo)}`);
  }
}

export async function signInWithCredentials(formData: FormData) {
  const parsed = credentialsSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to sign in.");
    redirect(`/sign-in?mode=login&error=${message}&redirectTo=${encodeURIComponent(sanitizeRedirectTo(formData.get("redirectTo")))}`);
  }

  await ensureDatabaseReady();
  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));
  const cookieStore = await cookies();
  cookieStore.delete("nv.redirect-to");

  try {
    await signIn("credentials", {
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    const isCredentialMismatch =
      error instanceof AuthError ||
      errorMsg.includes("CredentialsSignin") ||
      errorMsg.includes("password") ||
      errorMsg.includes("credential");

    const message = isCredentialMismatch
      ? "Incorrect email or password."
      : "Sign in could not be completed. Please verify your credentials.";

    redirect(`/sign-in?mode=login&error=${encodeURIComponent(message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }
}

