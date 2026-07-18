"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bell, CheckCircle2, ChevronRight, CircleUserRound, CreditCard, Database, HardDrive, KeyRound, Lock, Play, Shield, Smartphone, Sparkles, Trash2, User, UserPlus, Users } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { createClient } from "@/lib/supabase/client";

type Tab = "overview" | "profile" | "team" | "password" | "security";
type Profile = { email: string; full_name: string | null; phone: string | null; locale: string; email_notifications: boolean; security_notifications: boolean; created_at: string };
type Factor = { id: string; friendly_name?: string; status: string };
type Overview = { access: { trialStatus: string; trialEndsAt: string | null; subscriptionActive: boolean; hasAccess: boolean }; subscription: { status: string; currentPeriodEnd: string | null; billingMethod: string } | null; plan: { name: string; included_plays: number; storage_gb: number; prisma_ai_analyses: number; team_seats: number } | null; usage: { plays: number; storageBytes: number; videos: number; aiCredits: number; aiUsed: number } };

const tabs = [
  { id: "overview" as const, label: "Visão geral", icon: CircleUserRound },
  { id: "profile" as const, label: "Perfil e preferências", icon: User },
  { id: "team" as const, label: "Equipe", icon: Users },
  { id: "password" as const, label: "Senha", icon: Lock },
  { id: "security" as const, label: "Segurança", icon: Shield },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [adminMfaRequired, setAdminMfaRequired] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const navigationTimer = window.setTimeout(() => {
      if (search.get("section") === "security") setTab("security");
      setAdminMfaRequired(search.get("adminMfa") === "required");
    }, 0);
    void Promise.all([
    fetch("/api/account/profile", { cache: "no-store" }).then((response) => response.json()),
    fetch("/api/account/overview", { cache: "no-store" }).then((response) => response.json()),
  ]).then(([account, accountOverview]) => { setProfile(account.profile ?? null); setOverview(accountOverview.error ? null : accountOverview); });
    return () => window.clearTimeout(navigationTimer);
  }, []);

  return <><Header fullWidth /><main className="dashboard-content flex-1">
    <div className="mb-7"><Link href="/dashboard/videos" className="inline-flex min-h-10 items-center gap-2 rounded-full pr-3 text-[13px] font-medium text-prisma-blue"><ArrowLeft size={16} />Voltar ao painel</Link><p className="mt-3 text-[12px] font-semibold uppercase tracking-[.16em] text-prisma-blue">Central da conta</p><h1 className="mt-2 text-[30px] font-semibold tracking-[-.8px] themeable-text-ink">Configurações</h1><p className="mt-1 max-w-2xl text-[14px] themeable-text-ink-muted-48">Acompanhe sua capacidade, personalize sua conta e controle a segurança sem sair desta tela.</p></div>
    <div className="grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]">
      <nav className="h-fit rounded-[20px] border p-2 themeable-bg-canvas themeable-border-hairline xl:sticky xl:top-24">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setMessage(""); }} className={`flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] transition ${tab === item.id ? "bg-prisma-blue text-white shadow-sm" : "themeable-text-ink hover:bg-prisma-blue/8"}`}><Icon size={18} />{item.label}<ChevronRight size={15} className="ml-auto opacity-50" /></button>; })}</nav>
      <div className="min-w-0">{message && <div role="status" className="mb-4 rounded-[14px] border border-prisma-blue/25 bg-prisma-blue/5 px-4 py-3 text-[13px] text-prisma-blue">{message}</div>}
        {tab === "overview" && <OverviewPanel overview={overview} profile={profile} />}
        {tab === "profile" && (profile ? <ProfilePanel key={profile.email} profile={profile} setProfile={setProfile} setMessage={setMessage} /> : <Skeleton />)}
        {tab === "team" && <TeamPanel setMessage={setMessage} />}
        {tab === "password" && <PasswordPanel setMessage={setMessage} />}
        {tab === "security" && <SecurityPanelFixed setMessage={setMessage} adminMfaRequired={adminMfaRequired} />}
      </div>
    </div>
  </main></>;
}

type TeamData = { team: { name: string }; currentRole: string; seats: number; members: Array<{ id: string; role: string; user_id: string; profile: { email: string; full_name: string | null } | null }>; invites: Array<{ id: string; email: string; role: string; expires_at: string }> };
const roleLabels: Record<string, string> = { owner: "Proprietário", admin: "Administrador", editor: "Editor", analyst: "Analista", viewer: "Visualizador" };

function TeamPanel({ setMessage }: { setMessage: (value: string) => void }) {
  const [data, setData] = useState<TeamData | null>(null), [email, setEmail] = useState(""), [role, setRole] = useState("viewer"), [busy, setBusy] = useState(false);
  async function load() { const response = await fetch("/api/account/team", { cache: "no-store" }); const result = await response.json(); if (response.ok) setData(result); else setMessage("Não foi possível carregar a equipe."); }
  useEffect(() => { void fetch("/api/account/team", { cache: "no-store" }).then((response) => response.json().then((result) => ({ response, result }))).then(({ response, result }) => { if (response.ok) setData(result); else setMessage("Não foi possível carregar a equipe."); }); }, [setMessage]);
  async function invite() { setBusy(true); const response = await fetch("/api/account/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) }); const result = await response.json(); setBusy(false); if (response.ok) { setEmail(""); setMessage(result.joined ? "Membro adicionado à equipe." : "Convite enviado por e-mail."); void load(); } else setMessage(result.error === "seat_limit_reached" ? "O limite de membros do seu plano foi atingido." : result.error === "team_not_in_plan" ? "Equipes estão disponíveis a partir do Prime Growth." : "Não foi possível enviar o convite."); }
  async function changeRole(memberId: string, nextRole: string) { await fetch("/api/account/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId, role: nextRole }) }); void load(); }
  async function remove(payload: { memberId?: string; inviteId?: string }) { if (!confirm("Deseja realmente remover este acesso?")) return; await fetch("/api/account/team", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); setMessage("Acesso removido."); void load(); }
  if (!data) return <Skeleton />;
  const used = data.members.length + data.invites.length, canManage = ["owner", "admin"].includes(data.currentRole), teamEnabled = data.seats > 1;
  return <div className="space-y-5"><section className="overflow-hidden rounded-[22px] border themeable-bg-canvas themeable-border-hairline"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 themeable-border-hairline"><div><p className="text-[12px] font-semibold uppercase tracking-[.14em] text-prisma-blue">Colaboração</p><h2 className="mt-1 text-[21px] font-semibold themeable-text-ink">{data.team.name}</h2><p className="mt-1 text-[13px] themeable-text-ink-muted-48">{used} de {data.seats} acessos utilizados, incluindo o titular.</p></div><span className="rounded-full bg-prisma-blue/10 px-3 py-1.5 text-[12px] font-semibold text-prisma-blue">{Math.max(data.seats - used, 0)} vagas livres</span></div><div className="p-5"><div className="h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"><div className="h-full rounded-full bg-prisma-blue" style={{ width: `${Math.min(used / data.seats * 100, 100)}%` }} /></div></div></section>
    {canManage && <Card title="Convidar membro" description={teamEnabled ? "Escolha o nível de acesso. O convite expira em sete dias." : "Equipes estão disponíveis no Prime Growth e no Prime Scale."}><div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pessoa@empresa.com" disabled={!teamEnabled} className="h-11 rounded-[13px] border bg-transparent px-4 text-[14px] outline-none themeable-border-hairline themeable-text-ink" /><select value={role} onChange={(event) => setRole(event.target.value)} disabled={!teamEnabled} className="h-11 rounded-[13px] border bg-transparent px-3 text-[13px] themeable-border-hairline themeable-text-ink"><option value="admin">Administrador</option><option value="editor">Editor</option><option value="analyst">Analista</option><option value="viewer">Visualizador</option></select><button onClick={invite} disabled={!teamEnabled || !email || busy} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-prisma-blue px-5 text-[13px] font-semibold text-white disabled:opacity-40"><UserPlus size={16} />{busy ? "Enviando…" : "Convidar"}</button></div></Card>}
    <Card title="Membros" description="Controle quem pode editar, analisar ou apenas visualizar a operação."><div className="space-y-2">{data.members.map((member) => <div key={member.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border p-4 themeable-border-hairline"><span className="grid h-10 w-10 place-items-center rounded-full bg-prisma-blue/10 font-semibold text-prisma-blue">{(member.profile?.full_name || member.profile?.email || "U").slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium themeable-text-ink">{member.profile?.full_name || member.profile?.email || "Membro"}</p><p className="truncate text-[12px] themeable-text-ink-muted-48">{member.profile?.email}</p></div>{member.role === "owner" ? <span className="text-[12px] font-medium themeable-text-ink-muted-48">Proprietário</span> : <><select value={member.role} onChange={(event) => changeRole(member.id, event.target.value)} disabled={!canManage} className="h-9 rounded-[11px] border bg-transparent px-3 text-[12px] themeable-border-hairline themeable-text-ink">{Object.entries(roleLabels).filter(([key]) => key !== "owner").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{canManage && <button onClick={() => remove({ memberId: member.id })} aria-label="Remover membro" className="grid h-9 w-9 place-items-center rounded-full text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>}</>}</div>)}{data.invites.map((invite) => <div key={invite.id} className="flex items-center gap-3 rounded-[14px] border border-dashed p-4 themeable-border-hairline"><span className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/10 text-amber-600"><UserPlus size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium themeable-text-ink">{invite.email}</p><p className="text-[12px] themeable-text-ink-muted-48">Convite pendente · {roleLabels[invite.role]}</p></div>{canManage && <button onClick={() => remove({ inviteId: invite.id })} className="grid h-9 w-9 place-items-center rounded-full text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>}</div>)}</div></Card>
  </div>;
}

function OverviewPanel({ overview, profile }: { overview: Overview | null; profile: Profile | null }) {
  if (!overview) return <Skeleton />;
  const rawStorageBytes = Number(overview.usage.storageBytes);
  const storageGb = (Number.isFinite(rawStorageBytes) && rawStorageBytes > 0 ? rawStorageBytes : 0) / 1024 ** 3;
  const plan = overview.plan;
  const playPercent = plan?.included_plays ? overview.usage.plays / plan.included_plays * 100 : 0;
  const storagePercent = plan?.storage_gb ? storageGb / plan.storage_gb * 100 : 0;
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[22px] border themeable-bg-canvas themeable-border-hairline"><div className="bg-gradient-to-br from-prisma-blue to-[#4b8fff] p-6 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[12px] font-semibold uppercase tracking-[.14em] text-white/70">Sua operação</p><h2 className="mt-2 text-[25px] font-semibold">{profile?.full_name || "Conta Prisma"}</h2><p className="mt-1 text-[13px] text-white/75">{plan ? `${plan.name} ativo` : overview.access.trialStatus === "active" ? "Teste gratuito ativo" : "Escolha um plano para publicar"}</p></div><Link href="/dashboard/billing" className="rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-prisma-blue">Gerenciar plano</Link></div></div>
      <div className="grid gap-px bg-black/5 sm:grid-cols-2 xl:grid-cols-4">{[
        { icon: Play, label: "Plays neste mês", value: overview.usage.plays.toLocaleString("pt-BR"), detail: plan ? `de ${plan.included_plays.toLocaleString("pt-BR")}` : "sem plano", percent: playPercent },
        { icon: HardDrive, label: "Biblioteca", value: `${storageGb.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} GB`, detail: plan ? `de ${plan.storage_gb} GB` : `${overview.usage.videos} vídeos`, percent: storagePercent },
        { icon: Sparkles, label: "Créditos Prisma IA", value: overview.usage.aiCredits.toLocaleString("pt-BR"), detail: `${overview.usage.aiUsed} utilizados`, percent: 0 },
        { icon: Database, label: "VSLs na conta", value: overview.usage.videos.toLocaleString("pt-BR"), detail: "organizadas na biblioteca", percent: 0 },
      ].map((item) => { const Icon = item.icon; return <article key={item.label} className="themeable-bg-canvas p-5"><div className="flex items-center gap-2 text-prisma-blue"><Icon size={17} /><span className="text-[12px] font-medium themeable-text-ink-muted-48">{item.label}</span></div><strong className="mt-3 block text-[25px] tracking-[-.4px] themeable-text-ink">{item.value}</strong><p className="mt-1 text-[12px] themeable-text-ink-muted-48">{item.detail}</p>{item.percent > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"><div className={`h-full rounded-full ${item.percent >= 90 ? "bg-amber-500" : "bg-prisma-blue"}`} style={{ width: `${Math.min(item.percent, 100)}%` }} /></div>}</article>; })}</div>
    </section>
    <div className="grid gap-5 lg:grid-cols-2"><Card title="Acesso e cobrança" description="Status atual da assinatura e do período de acesso."><div className="space-y-3"><Info icon={CreditCard} title={plan?.name ?? "Sem assinatura"} detail={overview.subscription?.currentPeriodEnd ? `Válido até ${new Date(overview.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}` : overview.access.trialEndsAt ? `Teste até ${new Date(overview.access.trialEndsAt).toLocaleDateString("pt-BR")}` : "Ative o teste ou escolha um plano"} /><Info icon={Sparkles} title="Prisma IA" detail={`${overview.usage.aiCredits} créditos disponíveis para análises`} /></div></Card><Card title="Proteção da conta" description="Resumo das camadas que protegem sua operação."><div className="space-y-3"><Info icon={Shield} title="Sessão protegida" detail="Autenticação e cookies seguros do Supabase" /><Info icon={Bell} title="Alertas de segurança" detail={profile?.security_notifications ? "Ativados" : "Desativados nas preferências"} /></div></Card></div>
  </div>;
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="rounded-[20px] border themeable-bg-canvas themeable-border-hairline"><div className="border-b px-5 py-4 themeable-border-hairline"><h2 className="text-[17px] font-semibold themeable-text-ink">{title}</h2>{description && <p className="mt-1 text-[13px] themeable-text-ink-muted-48">{description}</p>}</div><div className="p-5">{children}</div></section>; }
function Skeleton() { return <div className="grid min-h-72 animate-pulse place-items-center rounded-[20px] border themeable-bg-canvas themeable-border-hairline"><p className="text-[14px] themeable-text-ink-muted-48">Carregando sua conta…</p></div>; }
function Info({ icon: Icon, title, detail }: { icon: typeof Shield; title: string; detail: string }) { return <div className="flex gap-3 rounded-[14px] border p-4 themeable-border-hairline"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-prisma-blue/10 text-prisma-blue"><Icon size={18} /></span><div><p className="text-[14px] font-medium themeable-text-ink">{title}</p><p className="mt-1 text-[12px] themeable-text-ink-muted-48">{detail}</p></div></div>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className="mt-2 h-11 w-full rounded-[13px] border bg-transparent px-4 text-[14px] outline-none themeable-border-hairline themeable-text-ink focus:border-prisma-blue" />; }
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full p-1 transition ${checked ? "bg-prisma-blue" : "bg-black/20 dark:bg-white/20"}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} /></button>; }

function ProfilePanel({ profile, setProfile, setMessage }: { profile: Profile; setProfile: (profile: Profile) => void; setMessage: (value: string) => void }) {
  const [name, setName] = useState(profile.full_name ?? ""), [phone, setPhone] = useState(profile.phone ?? ""), [locale, setLocale] = useState(profile.locale), [emailNotifications, setEmailNotifications] = useState(profile.email_notifications), [securityNotifications, setSecurityNotifications] = useState(profile.security_notifications);
  async function save() { const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: name, phone, locale, emailNotifications, securityNotifications }) }); const data = await response.json(); if (response.ok) { setProfile(data.profile); setMessage("Perfil e preferências atualizados."); } else setMessage("Não foi possível atualizar o perfil."); }
  return <div className="space-y-5"><Card title="Dados pessoais" description="Informações usadas na sua conta e nos checkouts."><div className="grid gap-5 sm:grid-cols-2"><label className="text-[13px] font-medium themeable-text-ink">Nome completo<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="text-[13px] font-medium themeable-text-ink">Telefone<Input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="text-[13px] font-medium themeable-text-ink">E-mail<Input value={profile.email} readOnly /></label><label className="text-[13px] font-medium themeable-text-ink">Idioma<select value={locale} onChange={(event) => setLocale(event.target.value)} className="mt-2 h-11 w-full rounded-[13px] border bg-transparent px-4 themeable-border-hairline themeable-text-ink"><option value="pt-BR">Português</option><option value="es">Español</option><option value="en">English</option></select></label></div></Card><Card title="Notificações" description="Escolha como deseja receber informações importantes."><div className="space-y-3"><Preference icon={Bell} title="E-mails do produto" detail="Processamento, limites e novidades" checked={emailNotifications} onChange={setEmailNotifications} /><Preference icon={Shield} title="Alertas de segurança" detail="Senha, MFA e acessos importantes" checked={securityNotifications} onChange={setSecurityNotifications} /></div><button onClick={save} className="mt-5 min-h-11 rounded-full bg-prisma-blue px-5 text-[14px] font-medium text-white">Salvar alterações</button></Card></div>;
}
function Preference({ icon: Icon, title, detail, checked, onChange }: { icon: typeof Bell; title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-[14px] border p-4 themeable-border-hairline"><div className="flex gap-3"><Icon size={18} className="mt-0.5 text-prisma-blue" /><div><p className="text-[14px] font-medium themeable-text-ink">{title}</p><p className="text-[12px] themeable-text-ink-muted-48">{detail}</p></div></div><Toggle checked={checked} onChange={onChange} /></div>; }

function PasswordPanel({ setMessage }: { setMessage: (value: string) => void }) { const [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""); async function update() { if (password !== confirm) return setMessage("As senhas não coincidem."); const response = await fetch("/api/account/password", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); setMessage(response.ok ? "Senha atualizada com sucesso." : "Use pelo menos 10 caracteres, com letras e números."); if (response.ok) { setPassword(""); setConfirm(""); } } return <Card title="Alterar senha" description="A senha é processada pelo Supabase Auth e nunca é armazenada pela Prisma."><div className="grid gap-5 sm:grid-cols-2"><label className="text-[13px] font-medium themeable-text-ink">Nova senha<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label><label className="text-[13px] font-medium themeable-text-ink">Confirmar senha<Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></label></div><div className="mt-4 flex flex-wrap gap-4 text-[12px] themeable-text-ink-muted-48"><span className="flex gap-1"><CheckCircle2 size={15} />10 caracteres</span><span className="flex gap-1"><CheckCircle2 size={15} />Letras e números</span></div><button onClick={update} disabled={!password || !confirm} className="mt-5 min-h-11 rounded-full bg-prisma-blue px-5 text-[14px] text-white disabled:opacity-40">Atualizar senha</button></Card>; }

function SecurityPanelFixed({ setMessage, adminMfaRequired }: { setMessage: (value: string) => void; adminMfaRequired: boolean }) {
  const [factors, setFactors] = useState<Factor[]>([]), [qr, setQr] = useState(""), [secret, setSecret] = useState(""), [factorId, setFactorId] = useState(""), [code, setCode] = useState(""), [busy, setBusy] = useState(false);
  async function refresh() { const result = await createClient().auth.mfa.listFactors(); if (!result.error) setFactors(result.data.all ?? []); return result; }
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function enroll() {
    if (busy) return; setBusy(true); const supabase = createClient();
    try {
      const listed = await supabase.auth.mfa.listFactors(); if (listed.error) throw listed.error;
      if (listed.data.all.some((factor) => factor.status === "verified")) { setFactors(listed.data.all); setMessage("O MFA já está ativo nesta conta."); return; }
      const stale = listed.data.all.filter((factor) => factor.status === "unverified" && factor.friendly_name === "Prisma Player");
      await Promise.all(stale.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })));
      const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Prisma Player" }); if (result.error) throw result.error;
      setFactorId(result.data.id); setQr(result.data.totp.qr_code); setSecret(result.data.totp.secret); setMessage("Escaneie o QR Code e informe o código de seis dígitos.");
    } catch (error) { const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : ""; setMessage(errorCode === "mfa_factor_name_conflict" ? "Existe uma configuração pendente. Recarregue a página e tente novamente." : "Não foi possível iniciar o MFA. Entre novamente e tente outra vez."); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (busy || code.length !== 6 || !factorId) return; setBusy(true); const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) { setMessage("O desafio expirou. Gere um novo QR Code."); setBusy(false); return; }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
    if (result.error) { setMessage("Código inválido ou expirado. Aguarde o próximo código."); setBusy(false); return; }
    await supabase.auth.refreshSession(); setQr(""); setSecret(""); setCode(""); setFactorId(""); await refresh(); setMessage("Autenticação em dois fatores ativada."); setBusy(false);
  }
  const verified = factors.some((factor) => factor.status === "verified");
  return <div className="space-y-5">{adminMfaRequired && !verified && <div role="alert" className="rounded-[18px] border border-amber-500/30 bg-amber-500/10 p-4 text-[13px] text-amber-700 dark:text-amber-300"><strong className="block text-[14px]">MFA obrigatório para administradores</strong>Confirme um aplicativo autenticador para liberar o painel administrativo.</div>}<Card title="Autenticação em dois fatores" description={adminMfaRequired ? "Obrigatória para administradores e opcional para os demais usuários." : "Proteja sua operação com um aplicativo autenticador TOTP."}>{verified ? <div className="flex items-center gap-3 rounded-[14px] border border-green-500/25 bg-green-500/5 p-4 text-[14px] text-green-600"><Shield size={20} />MFA ativo nesta conta</div> : qr ? <div className="grid gap-5 sm:grid-cols-[180px_1fr]"><div className="overflow-hidden rounded-[14px] bg-white p-3"><Image src={qr} alt="QR Code para configurar o autenticador" width={156} height={156} unoptimized className="h-auto w-full" /></div><div><label className="text-[13px] font-medium themeable-text-ink">Código de 6 dígitos<Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" /></label><button onClick={verify} disabled={busy || code.length !== 6} className="mt-4 min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">{busy ? "Confirmando…" : "Confirmar e ativar"}</button>{secret && <details className="mt-4 text-[12px] themeable-text-ink-muted-48"><summary className="cursor-pointer">Não consigo escanear</summary><code className="mt-2 block break-all rounded-[10px] bg-black/5 p-3 dark:bg-white/10">{secret}</code></details>}</div></div> : <button onClick={enroll} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-full bg-prisma-blue px-5 text-[14px] text-white disabled:opacity-50"><Smartphone size={17} />{busy ? "Preparando…" : "Configurar aplicativo"}</button>}</Card><Card title="Sessão e privacidade"><div className="space-y-3"><Info icon={KeyRound} title="Cookie HttpOnly" detail="Tokens de sessão não ficam acessíveis ao JavaScript da página" /><Info icon={Shield} title="Dados isolados" detail="RLS impede acesso aos vídeos e métricas de outras contas" /></div></Card></div>;
}
