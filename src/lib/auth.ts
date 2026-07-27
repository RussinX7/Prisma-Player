import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { dash } from "@better-auth/infra";
import { Pool } from "pg";

// Lazy initialization to avoid build-time errors
let authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuthInstance() {
  if (authInstance) return authInstance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  authInstance = betterAuth({
    database: new Pool({
      connectionString: databaseUrl,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: false, // Habilite quando tiver SMTP configurado
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID || "",
        clientSecret: process.env.APPLE_CLIENT_SECRET || "",
        enabled: Boolean(process.env.APPLE_CLIENT_ID),
      },
    },
    user: {
      additionalFields: {
        full_name: {
          type: "string",
          required: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    plugins: [
      nextCookies(), // Must be last - handles cookie setting for server actions
      dash(),
    ],
  });

  return authInstance;
}

// Export a proxy that lazily initializes the auth instance
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_, prop) {
    const instance = getAuthInstance();
    return (instance as any)[prop];
  },
});
