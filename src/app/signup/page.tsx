"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
  }

  return (
    <div className="min-h-dvh bg-surface-black flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center mb-7" aria-label="Voltar para o início">
              <Image
                src="/assets/logo.png"
                alt="Prisma Player"
                width={246}
                height={56}
                priority
                className="h-12 w-auto object-contain"
              />
            </Link>
            <h1 className="text-display-lg text-on-dark mb-2">
              Criar conta
            </h1>
            <p className="text-body text-body-muted">
              Comece seu teste grátis de 14 dias
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-caption text-body-muted mb-1.5 font-medium"
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
                className="w-full h-[44px] px-4 bg-surface-tile-1 border border-white/10 rounded-pill text-[17px] text-on-dark placeholder:text-body-muted outline-none transition-colors focus:border-prisma-blue-on-dark focus:ring-1 focus:ring-prisma-blue-on-dark"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-caption text-body-muted mb-1.5 font-medium"
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
                className="w-full h-[44px] px-4 bg-surface-tile-1 border border-white/10 rounded-pill text-[17px] text-on-dark placeholder:text-body-muted outline-none transition-colors focus:border-prisma-blue-on-dark focus:ring-1 focus:ring-prisma-blue-on-dark"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-caption text-body-muted mb-1.5 font-medium"
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
                className="w-full h-[44px] px-4 bg-surface-tile-1 border border-white/10 rounded-pill text-[17px] text-on-dark placeholder:text-body-muted outline-none transition-colors focus:border-prisma-blue-on-dark focus:ring-1 focus:ring-prisma-blue-on-dark"
              />
              <p className="text-fine text-body-muted mt-1.5">
                Mínimo de 8 caracteres
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-surface-tile-1 accent-prisma-blue-on-dark"
              />
              <span className="text-caption text-body-muted leading-relaxed">
                Ao criar a conta, você aceita nossos{" "}
                <a href="#" className="text-prisma-blue-on-dark hover:underline">
                  Termos de Uso
                </a>{" "}
                e{" "}
                <a href="#" className="text-prisma-blue-on-dark hover:underline">
                  Política de Privacidade
                </a>
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
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-surface-black text-caption text-body-muted">
                ou continue com
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="h-[44px] flex items-center justify-center gap-2 bg-surface-tile-1 border border-white/10 rounded-pill text-caption text-body-muted transition-all hover:bg-surface-tile-2 active:scale-[0.98]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#cccccc">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button className="h-[44px] flex items-center justify-center gap-2 bg-white text-ink border border-white/10 rounded-pill text-caption transition-all hover:opacity-90 active:scale-[0.98]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d1d1f">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>

          <p className="text-center mt-8 text-caption text-body-muted">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-prisma-blue-on-dark hover:underline font-medium"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
