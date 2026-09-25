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

        // console.log("LOGIN DEBUG — identifier typed:", identifier);
        // console.log("LOGIN DEBUG — user found in DB?", !!foundUser);
        if (foundUser) {
          // console.log("LOGIN DEBUG — foundUser email:", foundUser.email, "regNumber:", foundUser.regNumber);
        }

        if (!foundUser) return null;

        const passwordValid = await bcrypt.compare(password, foundUser.passwordHash);
        // console.log("LOGIN DEBUG — password valid?", passwordValid);

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
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword;
      }

      // When the client calls update() (e.g. after changing password),
      // re-fetch the latest value from the database instead of trusting
      // the stale value already baked into the token.
      if (trigger === "update" && token.id) {
        const [freshUser] = await db
          .select({ mustChangePassword: users.mustChangePassword })
          .from(users)
          .where(eq(users.id, token.id as string));

        if (freshUser) {
          token.mustChangePassword = freshUser.mustChangePassword;
        }
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