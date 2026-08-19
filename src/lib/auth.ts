import NextAuth, { type NextAuthConfig } from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { credentialsSignInSchema, normalizeEmail } from "@/lib/auth-credentials";
import { getAuthBaseUrl, getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/auth-env";
import { getD1Database } from "@/lib/cloudflare-env";
import { ensureDatabaseReady, queryOne } from "@/lib/d1";

const googleConfigured = Boolean(getGoogleClientId() && getGoogleClientSecret() && getAuthSecret());

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

if (googleConfigured) {
  providers.unshift(
    Google({
      clientId: getGoogleClientId()!,
      clientSecret: getGoogleClientSecret()!,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const authSecret = getAuthSecret();
  const authBaseUrl = getAuthBaseUrl();
  if (!authSecret) {
    throw new Error("AUTH_SECRET is required. Configure it in Cloudflare Pages.");
  }

  await ensureDatabaseReady();
  const database = await getD1Database();

  return {
    secret: authSecret,
    trustHost: true,
    adapter: D1Adapter(database as any),
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
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: authBaseUrl
      ? undefined
      : {
          sessionToken: {
            name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
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
        return {
          sub: user?.id ?? token.sub,
          name: user?.name ?? token.name,
          email: user?.email ?? token.email,
          picture: user?.image ?? token.picture,
          iat: token.iat,
          exp: token.exp,
          jti: token.jti,
        };
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? session.user.id;
          session.user.name = token.name ?? session.user.name;
          session.user.email = token.email ?? session.user.email;
          session.user.image = token.picture ?? session.user.image;
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
