"use client";

import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (password !== confirm || password.length < 10 || !/\d/.test(password)) { setMessage("Use 10 caracteres com letras e números, e confirme igualmente."); return; } const { error } = await createClient().auth.updateUser({ password }); setMessage(error ? "O link expirou ou a senha não foi aceita." : "Senha atualizada. Você já pode acessar a dashboard."); }
  return <main className="flex min-h-dvh items-center justify-center px-6 themeable-bg-canvas-parchment"><div className="w-full max-w-[420px]"><BrandLogo className="mx-auto mb-8 h-10 w-[205px]" /><h1 className="text-center text-[32px] font-semibold themeable-text-ink">Criar nova senha</h1><p className="mt-2 text-center text-[14px] themeable-text-ink-muted-48">Finalize a recuperação da sua conta.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-[13px] font-medium themeable-text-ink">Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 themeable-border-hairline" /></label><label className="block text-[13px] font-medium themeable-text-ink">Confirmar senha<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 themeable-border-hairline" /></label><button className="h-11 w-full rounded-full bg-prisma-blue text-white">Atualizar senha</button>{message && <p role="status" className="text-center text-[13px] themeable-text-ink-muted-48">{message}</p>}</form></div></main>;
}
