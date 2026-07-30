"use client";

import { apiRequest } from "@/services/http/client";
import { createClient } from "@/lib/supabase/client";

export interface AccountIdentity {
  name: string;
  email: string;
}

export const accountService = {
  async getIdentity(): Promise<AccountIdentity> {
    const { data } = await createClient().auth.getUser();
    const user = data.user;
    return {
      name: String(user?.user_metadata.full_name ?? user?.email ?? "Conta Prisma"),
      email: user?.email ?? "",
    };
  },

  getAccess() {
    return apiRequest<{ isAdmin: boolean; hasAccess: boolean }>("/api/account/access", {
      cache: "no-store",
    });
  },
};
