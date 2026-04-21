"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { credentialsSignInSchema, credentialsSignUpSchema, normalizeEmail } from "@/lib/auth-credentials";
import { OAUTH_TRANSIENT_COOKIE_NAMES } from "@/lib/auth-cookies";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET || !process.env.AUTH_SECRET) {
    redirect("/sign-in?mode=login&error=google-not-configured");
  }

  const cookieStore = await cookies();

  for (const cookieName of OAUTH_TRANSIENT_COOKIE_NAMES) {
    cookieStore.delete(cookieName);
  }

  const redirectTo = sanitizeRedirectTo(formData?.get("redirectTo"));
  await signIn("google", { redirectTo });
}

export async function signUpWithCredentials(formData: FormData) {
  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));
  const parsed = credentialsSignUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to create account.");
    redirect(`/sign-in?mode=signup&error=${message}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect(
      `/sign-in?mode=login&error=${encodeURIComponent("An account with this email already exists.")}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
    },
  });

  redirect(`/sign-in?mode=login&success=account-created&redirectTo=${encodeURIComponent(redirectTo)}`);
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

  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));

  try {
    await signIn("credentials", {
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(
        `/sign-in?mode=login&error=${encodeURIComponent("Incorrect email or password.")}&redirectTo=${encodeURIComponent(redirectTo)}`,
      );
    }

    throw error;
  }
}
