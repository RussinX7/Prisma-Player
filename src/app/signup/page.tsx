"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { authClient } from "@/lib/auth-client";
import posthog from "posthog-js";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "">("");
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    
    submittingRef.current = true;
    setLoading(true);
    setMessage("");
    setMessageTone("");
    
    try {
      const { data, error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      
      if (error) {
        throw new Error(error.message || "Não foi possível criar a conta.");
      }
      
      if (data?.user) {
        posthog.identify(data.user.id, { email: data.user.email });
        posthog.capture("user_signed_up", { method: "email" });
      }
      
      setMessageTone("success");
      setMessage("Conta criada. Redirecionando…");
      
      // Redirecionar após sucesso
      setTimeout(() => {
        window.location.assign("/welcome");
      }, 1000);
    } catch (err: any) {
      setMessageTone("error");
      setMessage(err.message || "Não foi possível criar a conta. Tente novamente.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
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
              Criar conta
            </h1>
            <p className="text-body themeable-text-ink-muted-48">
              Comece seu teste grátis de 14 dias
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-caption themeable-text-ink-muted-80 mb-1.5 font-medium"
              >
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full h-[44px] px-4 themeable-bg-canvas border themeable-border-hairline rounded-pill text-[17px] themeable-text-ink placeholder:themeable-text-ink-muted-48 outline-none transition-colors focus:border-prisma-blue focus:ring-1 focus:ring-prisma-blue"
              />
            </div>

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
              <label
                htmlFor="password"
                className="block text-caption themeable-text-ink-muted-80 mb-1.5 font-medium"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha segura"
                minLength={8}
                required
                className="w-full h-[44px] px-4 themeable-bg-canvas border themeable-border-hairline rounded-pill text-[17px] themeable-text-ink placeholder:themeable-text-ink-muted-48 outline-none transition-colors focus:border-prisma-blue focus:ring-1 focus:ring-prisma-blue"
              />
              <p className="text-fine themeable-text-ink-muted-48 mt-1.5">
                Mínimo de 8 caracteres
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 rounded border themeable-border-hairline themeable-bg-canvas accent-prisma-blue"
              />
              <span className="text-caption themeable-text-ink-muted-48 leading-relaxed">
                Ao criar a conta, você aceita nossos{" "}
                <Link href="/terms" target="_blank" className="text-prisma-blue hover:underline">
                  Termos de Uso
                </Link>{" "}
                e{" "}
                <Link href="/privacy" target="_blank" className="text-prisma-blue hover:underline">
                  Política de Privacidade
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
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
                "Criar conta gratuita"
              )}
            </button>
            {message && (
              <p 
                role={messageTone === "error" ? "alert" : "status"} 
                aria-live="polite" 
                className={`rounded-xl border px-4 py-3 text-center text-[13px] font-medium leading-relaxed ${
                  messageTone === "success" 
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300" 
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                }`}
              >
                {message}
              </p>
            )}
          </form>

          <p className="text-center mt-8 text-caption themeable-text-ink-muted-48">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-prisma-blue hover:underline font-medium"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
