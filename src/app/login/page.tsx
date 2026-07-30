"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDivider } from "@/features/auth/components/AuthDivider";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import type { AuthNoticeState, AuthProvider } from "@/features/auth/model/types";
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

  async function signInWith(provider: AuthProvider) {
    setNotice(null);
    try {
      await authService.continueWithProvider(provider, "/dashboard/videos", "login");
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Não foi possível continuar.",
      });
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
      description="Acompanhe suas VSLs, encontre oportunidades e continue de onde parou."
      footer={<>Ainda não tem conta? <Link href="/signup" className="font-medium text-prisma-blue hover:underline">Criar conta</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          trailing={<button type="button" onClick={recoverPassword} className="text-xs font-medium text-prisma-blue hover:underline">Esqueci a senha</button>}
        />
        <AuthNotice notice={notice} />
        <Button type="submit" size="lg" disabled={loading} className="h-12 w-full rounded-xl bg-prisma-blue text-white hover:bg-prisma-blue/90">
          {loading ? <><LoaderCircle className="animate-spin" /> Entrando</> : "Entrar"}
        </Button>
      </form>
      <AuthDivider />
      <SocialAuthButtons
        disabled={{
          google: !authService.isProviderEnabled("google"),
          apple: !authService.isProviderEnabled("apple"),
        }}
        onSelect={(provider) => void signInWith(provider)}
      />
    </AuthLayout>
  );
}
