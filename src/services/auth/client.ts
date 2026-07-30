"use client";

import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import {
  getAuthErrorMessage,
  oauthEnabled,
  withAuthTimeout,
} from "@/lib/supabase/auth-errors";
import type { AuthProvider } from "@/features/auth/model/types";

export class AuthServiceError extends Error {
  constructor(error: unknown, fallback: string) {
    super(getAuthErrorMessage(error, fallback));
    this.name = "AuthServiceError";
  }
}

export function safeAuthRedirect(value: string | null, fallback = "/dashboard/videos") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export const authService = {
  isProviderEnabled(provider: AuthProvider) {
    return oauthEnabled(provider);
  },

  async signInWithEmail(email: string, password: string) {
    try {
      const supabase = createClient();
      const result = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
      );
      if (result.error) throw result.error;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        posthog.identify(data.user.id, { email: data.user.email });
        posthog.capture("user_logged_in", { method: "email" });
      }
      return data.user;
    } catch (error) {
      throw new AuthServiceError(error, "Não foi possível entrar agora. Tente novamente.");
    }
  },

  async signUpWithEmail(input: { name: string; email: string; password: string }) {
    try {
      const supabase = createClient();
      const result = await withAuthTimeout(supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: { full_name: input.name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
        },
      }));
      if (result.error) throw result.error;
      if (result.data.user) {
        posthog.identify(result.data.user.id, { email: result.data.user.email });
        posthog.capture("user_signed_up", { method: "email" });
      }
      return result.data;
    } catch (error) {
      throw new AuthServiceError(error, "Não foi possível criar a conta. Tente novamente.");
    }
  },

  async continueWithProvider(provider: AuthProvider, next: string, event: "login" | "signup") {
    if (!oauthEnabled(provider)) {
      throw new AuthServiceError(
        null,
        `${provider === "google" ? "Google" : "Apple"} ainda não foi ativado.`,
      );
    }
    try {
      posthog.capture(event === "login" ? "user_logged_in" : "user_signed_up", { method: provider });
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      throw new AuthServiceError(error, "Não foi possível abrir o provedor de acesso.");
    }
  },

  async requestPasswordReset(email: string) {
    try {
      const result = await withAuthTimeout(createClient().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
      ));
      if (result.error) throw result.error;
    } catch (error) {
      throw new AuthServiceError(error, "Não foi possível enviar o e-mail.");
    }
  },

  async updatePassword(password: string) {
    const { error } = await createClient().auth.updateUser({ password });
    if (error) throw new AuthServiceError(error, "O link expirou ou a senha não foi aceita.");
  },

  async signOut() {
    await createClient().auth.signOut({ scope: "local" });
  },
};
