import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        identifier: {}, // email OR reg number
        password: {},
      },
      authorize: async (credentials) => {
        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        if (!identifier || !password) return null;

        // Try matching by email first, then reg number
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

        const passwordValid = await bcrypt.compare(
          password,
          foundUser.passwordHash
        );

        if (!passwordValid) return null;

        return {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.fullName,
          role: foundUser.role,
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
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});