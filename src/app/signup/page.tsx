"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDivider } from "@/features/auth/components/AuthDivider";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import type { AuthNoticeState, AuthProvider } from "@/features/auth/model/types";
import { authService } from "@/services/auth/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<AuthNoticeState | null>(null);
  const submittingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !agreed) return;
    submittingRef.current = true;
    setLoading(true);
    setNotice(null);
    try {
      const data = await authService.signUpWithEmail({ name, email, password });
      if (data.session) {
        setNotice({ tone: "success", message: "Conta criada. Preparando seu espaço…" });
        window.location.assign("/welcome");
      } else {
        setNotice({
          tone: "success",
          message: "Cadastro recebido. Confira seu e-mail para confirmar a conta.",
        });
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Não foi possível criar a conta.",
      });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function signUpWith(provider: AuthProvider) {
    setNotice(null);
    try {
      await authService.continueWithProvider(provider, "/welcome", "signup");
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Não foi possível continuar.",
      });
    }
  }

  return (
    <AuthLayout
      eyebrow="14 dias grátis"
      title="Crie sua conta Prisma"
      description="Teste a operação completa, sem cartão e sem cobrança automática."
      footer={<>Já possui uma conta? <Link href="/login" className="font-medium text-prisma-blue hover:underline">Fazer login</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="name"
          label="Nome completo"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Como podemos chamar você?"
          autoComplete="name"
          maxLength={120}
          required
        />
        <AuthField
          id="email"
          type="email"
          label="E-mail profissional"
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
          placeholder="Crie uma senha segura"
          autoComplete="new-password"
          minLength={8}
          required
          hint="Use pelo menos 8 caracteres."
        />

        <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-1 text-sm leading-5 text-muted-foreground focus-within:border-prisma-blue/30">
          <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              required
              className="peer size-5 appearance-none rounded-md border border-input bg-background outline-none transition checked:border-prisma-blue checked:bg-prisma-blue focus-visible:ring-2 focus-visible:ring-prisma-blue/25"
            />
            <Check aria-hidden size={14} className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
          </span>
          <span>
            Concordo com os <Link href="/terms" target="_blank" className="font-medium text-prisma-blue hover:underline">Termos de Uso</Link> e a{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-prisma-blue hover:underline">Política de Privacidade</Link>.
          </span>
        </label>

        <AuthNotice notice={notice} />
        <Button type="submit" size="lg" disabled={loading || !agreed} className="h-12 w-full rounded-xl bg-prisma-blue text-white hover:bg-prisma-blue/90">
          {loading ? <><LoaderCircle className="animate-spin" /> Criando conta</> : "Começar meus 14 dias"}
        </Button>
      </form>
      <AuthDivider />
      <SocialAuthButtons
        disabled={{
          google: !authService.isProviderEnabled("google"),
          apple: !authService.isProviderEnabled("apple"),
        }}
        onSelect={(provider) => void signUpWith(provider)}
      />
    </AuthLayout>
  );
}
