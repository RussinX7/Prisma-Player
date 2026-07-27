import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  plugins: [
    sentinelClient(),
  ],
});

// Export common methods for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
