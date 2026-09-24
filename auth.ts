import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkLoginRateLimit } from "@/lib/ratelimit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        identifier: {},
        password: {},
      },
      authorize: async (credentials) => {
        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        if (!identifier || !password) return null;

        // Rate limit BEFORE touching the database - protects against brute force
        const { success } = await checkLoginRateLimit(identifier);
        if (!success) {
          throw new Error("Too many login attempts. Please wait a minute and try again.");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, identifier))
          .limit(1);

        const foundUser =
          user ||
          (
            await db
              .select()
              .from(users)
              .where(eq(users.regNumber, identifier))
              .limit(1)
          )[0];

        if (!foundUser) return null;

        const passwordValid = await bcrypt.compare(password, foundUser.passwordHash);
        if (!passwordValid) return null;

        return {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.fullName,
          role: foundUser.role,
          mustChangePassword: foundUser.mustChangePassword,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});