"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { credentialsSignInSchema, credentialsSignUpSchema, normalizeEmail } from "@/lib/auth-credentials";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function signInWithGoogle() {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET || !process.env.AUTH_SECRET) {
    redirect("/sign-in?mode=login&error=google-not-configured");
  }

  await signIn("google", { redirectTo: "/browse" });
}

export async function signUpWithCredentials(formData: FormData) {
  const parsed = credentialsSignUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to create account.");
    redirect(`/sign-in?mode=signup&error=${message}`);
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect(`/sign-in?mode=login&error=${encodeURIComponent("An account with this email already exists.")}`);
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
    },
  });

  redirect("/sign-in?mode=login&success=account-created");
}

export async function signInWithCredentials(formData: FormData) {
  const parsed = credentialsSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to sign in.");
    redirect(`/sign-in?mode=login&error=${message}`);
  }

  try {
    await signIn("credentials", {
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
      redirectTo: "/browse",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/sign-in?mode=login&error=${encodeURIComponent("Incorrect email or password.")}`);
    }

    throw error;
  }
}
