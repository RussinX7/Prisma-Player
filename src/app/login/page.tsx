"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { clientRateMessage, consumeClientAttempt } from "@/lib/security/client-rate-limit";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard/videos";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const attempt = consumeClientAttempt({ 
      key: `login:${normalizedEmail}`, 
      maxAttempts: 8, 
      windowMs: 10 * 60_000 
    });
    
    if (!attempt.allowed) {
      setError(clientRateMessage(attempt.retryAfterSeconds));
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });
      
      if (authError) {
        throw new Error(authError.message || "Não foi possível entrar agora.");
      }
      
      if (data?.user) {
        posthog.identify(data.user.id, { email: data.user.email });
        posthog.capture("user_logged_in", { method: "email" });
      }
      
      const nextUrl = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.replace(nextUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function recoverPassword() {
    if (!email.trim()) { 
      setError("Informe seu e-mail para recuperar a senha."); 
      return; 
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const attempt = consumeClientAttempt({ 
      key: `recover:${normalizedEmail}`, 
      maxAttempts: 3, 
      windowMs: 15 * 60_000 
    });
    
    if (!attempt.allowed) {
      setError(clientRateMessage(attempt.retryAfterSeconds));
      return;
    }
    
    try {
      const { error: resetError } = await authClient.forgetPassword({
        email: normalizedEmail,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        throw new Error(resetError.message || "Não foi possível enviar o e-mail.");
      }
      
      setError("Enviamos o link de recuperação para seu e-mail.");
    } catch (err: any) {
      setError(err.message || "Não foi possível enviar o e-mail.");
    }
  }

  return (
    <div className="min-h-dvh themeable-bg-canvas-parchment flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center mb-7" aria-label="Voltar para o início">
              <BrandLogo className="h-12 w-[246px]" priority />
            </Link>
            <h1 className="text-display-lg themeable-text-ink mb-2">
              Entrar
            </h1>
            <p className="text-body themeable-text-ink-muted-48">
              Acesse sua conta do Prisma Player
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-caption themeable-text-ink-muted-80 mb-1.5 font-medium"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full h-[44px] px-4 themeable-bg-canvas border themeable-border-hairline rounded-pill text-[17px] themeable-text-ink placeholder:themeable-text-ink-muted-48 outline-none transition-colors focus:border-prisma-blue focus:ring-1 focus:ring-prisma-blue"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-caption themeable-text-ink-muted-80 font-medium"
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={recoverPassword}
                  className="text-caption text-prisma-blue hover:underline"
                >
                  Esqueceu?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full h-[44px] px-4 themeable-bg-canvas border themeable-border-hairline rounded-pill text-[17px] themeable-text-ink placeholder:themeable-text-ink-muted-48 outline-none transition-colors focus:border-prisma-blue focus:ring-1 focus:ring-prisma-blue"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] bg-prisma-blue text-white text-[17px] font-normal rounded-pill transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                "Entrar"
              )}
            </button>
            {error && (
              <p 
                role="status" 
                className="text-center text-[13px] text-red-500"
              >
                {error}
              </p>
            )}
          </form>

          <p className="text-center mt-8 text-caption themeable-text-ink-muted-48">
            Ainda não tem conta?{" "}
            <Link
              href="/signup"
              className="text-prisma-blue hover:underline font-medium"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
