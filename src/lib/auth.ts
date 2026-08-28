import NextAuth, { type NextAuthConfig } from "next-auth";
import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { createNerdVaultAdapter } from "@/lib/auth-adapter";
import { credentialsSignInSchema, normalizeEmail } from "@/lib/auth-credentials";
import { getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/auth-env";
import { ensureDatabaseReady, queryOne } from "@/lib/d1";

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const authSecret = getAuthSecret();
  if (!authSecret) {
    throw new Error("AUTH_SECRET is required.");
  }

  await ensureDatabaseReady();

  const googleClientId = getGoogleClientId();
  const googleClientSecret = getGoogleClientSecret();
  const googleReady = Boolean(googleClientId && googleClientSecret);

  const providers: NextAuthConfig["providers"] = [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSignInSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        await ensureDatabaseReady();
        const email = normalizeEmail(parsed.data.email);
        const user = await queryOne<{
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
          password_hash: string | null;
        }>(
          `SELECT id, name, email, image, password_hash FROM users WHERE email = ? LIMIT 1`,
          [email],
        );

        if (!user?.password_hash) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.password_hash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ];

  if (googleReady) {
    providers.unshift(
      Google({
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  return {
    secret: authSecret,
    trustHost: true,
    adapter: createNerdVaultAdapter(),
    debug: process.env.AUTH_DEBUG === "true",
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    providers,
    pages: {
      signIn: "/sign-in",
      error: "/sign-in",
    },
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === "google" && !user.email) {
          return false;
        }
        return true;
      },
      async jwt({ token, user, trigger, session }) {
        if (user) {
          token.sub = user.id ?? token.sub;
          token.name = user.name ?? token.name;
          token.email = user.email ?? token.email;
          token.picture = user.image ?? token.picture;
        }
        if (trigger === "update" && session?.user) {
          token.name = session.user.name ?? token.name;
          token.picture = session.user.image ?? token.picture;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = (token.sub as string) ?? session.user.id;
          session.user.name = (token.name as string) ?? session.user.name;
          session.user.email = (token.email as string) ?? session.user.email;
          session.user.image = (token.picture as string) ?? session.user.image;
        }
        return session;
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      },
    },
  };
});
