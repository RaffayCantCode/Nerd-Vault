import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { credentialsSignInSchema, normalizeEmail } from "@/lib/auth-credentials";
import { prisma } from "@/lib/prisma";

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const secureCookie = process.env.NODE_ENV === "production";

const providers: Provider[] = [
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

      const email = normalizeEmail(parsed.data.email);
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = await compare(parsed.data.password, user.passwordHash);

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

if (googleConfigured) {
  providers.unshift(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/sign-in",
  },
  cookies: {
    pkceCodeVerifier: {
      name: `${secureCookie ? "__Secure-" : ""}authjs.pkce.code_verifier`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 5, secure: secureCookie },
    },
    callbackUrl: {
      name: `${secureCookie ? "__Secure-" : ""}authjs.callback-url`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 5, secure: secureCookie },
    },
    csrfToken: {
      name: `${secureCookie ? "__Host-" : ""}authjs.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 5, secure: secureCookie },
    },
    state: {
      name: `${secureCookie ? "__Secure-" : ""}authjs.state`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 5, secure: secureCookie },
    },
    nonce: {
      name: `${secureCookie ? "__Secure-" : ""}authjs.nonce`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 5, secure: secureCookie },
    },
    sessionToken: {
      name: `${secureCookie ? "__Secure-" : ""}authjs.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: secureCookie },
    },
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? "";
      }

      return session;
    },
  },
});
