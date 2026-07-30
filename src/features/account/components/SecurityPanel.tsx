"use client";

import { KeyRound, Shield, Smartphone, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MfaFactor } from "@/features/account/model/types";
import { createClient } from "@/lib/supabase/client";
import { InfoRow, SettingsCard } from "./SettingsUi";

export function SecurityPanel({
  notify,
  adminMfaRequired,
}: {
  notify: (message: string) => void;
  adminMfaRequired: boolean;
}) {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const result = await createClient().auth.mfa.listFactors();
    if (!result.error) setFactors(result.data.all ?? []);
    return result;
  }, []);

  useEffect(() => {
    void createClient()
      .auth.mfa.listFactors()
      .then((result) => {
        if (!result.error) setFactors(result.data.all ?? []);
      });
  }, []);

  async function enroll() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    try {
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      if (listed.data.all.some((factor) => factor.status === "verified")) {
        setFactors(listed.data.all);
        notify("O MFA já está ativo nesta conta.");
        return;
      }
      const stale = listed.data.all.filter((factor) => factor.status === "unverified" && factor.friendly_name === "Prisma Player");
      await Promise.all(stale.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })));
      const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Prisma Player" });
      if (result.error) throw result.error;
      setFactorId(result.data.id);
      setQr(result.data.totp.qr_code);
      setSecret(result.data.totp.secret);
      notify("Escaneie o QR Code e informe o código de seis dígitos.");
    } catch {
      notify("Não foi possível iniciar o MFA. Entre novamente e tente outra vez.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy || code.length !== 6 || !factorId) return;
    setBusy(true);
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      notify("O desafio expirou. Gere um novo QR Code.");
      setBusy(false);
      return;
    }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
    if (result.error) {
      notify("Código inválido ou expirado. Aguarde o próximo código.");
      setBusy(false);
      return;
    }
    await supabase.auth.refreshSession();
    setQr("");
    setSecret("");
    setCode("");
    setFactorId("");
    await refresh();
    notify("Autenticação em dois fatores ativada.");
    setBusy(false);
  }

  async function disableMfa() {
    if (adminMfaRequired) {
      notify("Administradores precisam manter o MFA ativo.");
      return;
    }
    const factor = factors.find((item) => item.status === "verified");
    if (!factor || busy || !window.confirm("Desativar a autenticação em dois fatores?")) return;
    setBusy(true);
    const supabase = createClient();
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data.currentLevel !== "aal2") {
      notify("Confirme o segundo fator nesta sessão antes de desativar o MFA.");
      setBusy(false);
      return;
    }
    const result = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (result.error) {
      notify("Não foi possível desativar o MFA.");
      setBusy(false);
      return;
    }
    await supabase.auth.refreshSession();
    await refresh();
    notify("Autenticação em dois fatores desativada.");
    setBusy(false);
  }

  const verified = factors.some((factor) => factor.status === "verified");
  return (
    <div className="space-y-5">
      {adminMfaRequired && !verified && (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <strong className="block">MFA obrigatório para administradores</strong>
          Confirme um aplicativo autenticador para liberar o painel administrativo.
        </div>
      )}
      <SettingsCard title="Autenticação em dois fatores" description="Proteja sua conta com um aplicativo autenticador TOTP.">
        {verified ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-500/25 bg-green-500/5 p-4">
            <div className="flex items-center gap-3 text-sm text-green-600"><Shield className="size-5" />MFA ativo nesta conta</div>
            {adminMfaRequired ? (
              <span className="text-xs font-medium text-amber-600">Obrigatório para administradores</span>
            ) : (
              <Button variant="outline" onClick={() => void disableMfa()} disabled={busy} className="rounded-full text-destructive">
                <Trash2 className="size-4" />{busy ? "Desativando…" : "Desativar MFA"}
              </Button>
            )}
          </div>
        ) : qr ? (
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded-xl bg-white p-3"><Image src={qr} alt="QR Code para configurar o autenticador" width={156} height={156} unoptimized className="h-auto w-full" /></div>
            <div>
              <label className="text-sm font-medium">Código de 6 dígitos
                <Input className="mt-2 h-11 rounded-xl" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" />
              </label>
              <Button className="mt-4 rounded-full" onClick={() => void verify()} disabled={busy || code.length !== 6}>{busy ? "Confirmando…" : "Confirmar e ativar"}</Button>
              {secret && <details className="mt-4 text-xs text-muted-foreground"><summary className="cursor-pointer">Não consigo escanear</summary><code className="mt-2 block break-all rounded-xl bg-muted p-3">{secret}</code></details>}
            </div>
          </div>
        ) : (
          <Button className="rounded-full" onClick={() => void enroll()} disabled={busy}><Smartphone className="size-4" />{busy ? "Preparando…" : "Configurar aplicativo"}</Button>
        )}
      </SettingsCard>
      <SettingsCard title="Sessão e privacidade">
        <div className="space-y-3">
          <InfoRow icon={KeyRound} title="Sessão protegida" detail="Suas credenciais permanecem protegidas durante a navegação." />
          <InfoRow icon={Shield} title="Conta isolada" detail="Seus vídeos e métricas não ficam acessíveis a outras contas." />
        </div>
      </SettingsCard>
    </div>
  );
}
