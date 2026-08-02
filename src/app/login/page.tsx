"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import type { AuthNoticeState } from "@/features/auth/model/types";
import { clientRateMessage, consumeClientAttempt } from "@/lib/security/client-rate-limit";
import { authService, safeAuthRedirect } from "@/services/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<AuthNoticeState | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const attempt = consumeClientAttempt({
      key: `login:${normalizedEmail}`,
      maxAttempts: 8,
      windowMs: 10 * 60_000,
    });
    if (!attempt.allowed) {
      setNotice({ tone: "error", message: clientRateMessage(attempt.retryAfterSeconds) });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      await authService.signInWithEmail(normalizedEmail, password);
      router.replace(safeAuthRedirect(new URLSearchParams(window.location.search).get("next")));
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Não foi possível entrar agora.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function recoverPassword() {
    if (!email.trim()) {
      setNotice({ tone: "info", message: "Informe seu e-mail para recuperar a senha." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const attempt = consumeClientAttempt({
      key: `recover:${normalizedEmail}`,
      maxAttempts: 3,
      windowMs: 15 * 60_000,
    });
    if (!attempt.allowed) {
      setNotice({ tone: "error", message: clientRateMessage(attempt.retryAfterSeconds) });
      return;
    }
    try {
      await authService.requestPasswordReset(normalizedEmail);
      setNotice({ tone: "success", message: "Enviamos o link de recuperação para seu e-mail." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Não foi possível enviar o e-mail.",
      });
    }
  }

  return (
    <AuthLayout
      eyebrow="Bem-vindo de volta"
      title="Entre na sua operação"
      description="Acompanhe suas VSLs, analise retenção e continue de onde parou."
      footer={<>Ainda não tem conta? <Link href="/signup" className="font-bold text-[#191A23] underline underline-offset-4 decoration-2">Criar conta grátis</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField
          id="email"
          type="email"
          label="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@empresa.com"
          autoComplete="email"
          required
        />
        <AuthField
          id="password"
          type="password"
          label="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          autoComplete="current-password"
          required
          trailing={<button type="button" onClick={recoverPassword} className="text-xs font-bold text-[#191A23] underline underline-offset-2">Esqueci a senha</button>}
        />
        <AuthNotice notice={notice} />
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-13 w-full rounded-2xl border-2 border-[#191A23] bg-[#191A23] text-[#B9FF66] font-black text-base shadow-[4px_4px_0px_#B9FF66] hover:bg-[#191A23]/90 hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
        >
          {loading ? <><LoaderCircle className="animate-spin h-5 w-5 mr-2 text-[#B9FF66]" /> Entrando...</> : "Entrar no Painel"}
        </Button>
      </form>
    </AuthLayout>
  );
}
