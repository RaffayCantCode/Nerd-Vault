import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { credentialsSignInSchema, normalizeEmail } from "@/lib/auth-credentials";
import { getAuthBaseUrl, getAuthSecret } from "@/lib/auth-env";
import { prisma } from "@/lib/prisma";

const authSecret = getAuthSecret();
const authBaseUrl = getAuthBaseUrl();

if (process.env.NODE_ENV === "production" && !authSecret) {
  console.error(
    "[auth] Missing AUTH_SECRET (or NEXTAUTH_SECRET) in the Netlify runtime environment. Google sign-in will fail with error=Configuration.",
  );
}

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID?.trim() &&
    process.env.AUTH_GOOGLE_SECRET?.trim() &&
    authSecret,
);

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
      // Link Google to an existing email/password account instead of failing the callback.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  ...(authBaseUrl ? { basePath: "/api/auth", url: authBaseUrl } : {}),
  adapter: PrismaAdapter(prisma),
  debug: process.env.AUTH_DEBUG === "true",
  session: {
    // Credentials auth is most reliable with JWT strategy.
    // Keep token payload intentionally tiny to avoid cookie bloat.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers,
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  // Let NextAuth use its default compact cookies. Custom overrides were
  // contributing to REQUEST_HEADER_TOO_LARGE by inflating cookie names.
  // The sessionToken default already respects __Secure- prefix in production.
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-authjs.session-token" 
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (process.env.AUTH_DEBUG === "true") {
        console.info("[auth] signIn", {
          provider: account?.provider,
          userId: user.id,
          isNewUser,
        });
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && !user.email) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      // IMPORTANT: Return ONLY the minimal fields needed to identify the session.
      // NextAuth v5 + Google automatically populates `token` with name, email,
      // picture, and the full Google account object (access_token, id_token,
      // refresh_token, etc.). Returning the full token causes the JWT to exceed
      // a single cookie's size limit (~4KB), forcing NextAuth to chunk it across
      // 20+ cookies and blowing past Vercel's REQUEST_HEADER_TOO_LARGE limit.
      return {
        sub: user?.id ?? token.sub,
        iat: token.iat,
        exp: token.exp,
        jti: token.jti,
      };
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
