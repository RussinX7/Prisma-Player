"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CreditCard,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Moon,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import { Button } from "@/components/ui/button";
import { BillingSettingsTab } from "@/features/account/components/BillingSettingsTab";
import { PreferencesSettingsTab } from "@/features/account/components/PreferencesSettingsTab";

const tabs = [
  { id: "overview", label: "Visão Geral" },
  { id: "profile", label: "Perfil" },
  { id: "password", label: "Senha" },
  { id: "team", label: "Equipe" },
  { id: "billing", label: "Faturamento & Planos" },
  { id: "preferences", label: "Preferências & Notificações" },
  { id: "security", label: "Segurança" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Profile Form States
  const [name, setName] = useState("Raynan");
  const [email, setEmail] = useState("raynan@empresa.com");
  const [company, setCompany] = useState("Empresa VSL Ltda");
  const [phone, setPhone] = useState("+55 (11) 99999-8888");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  // Team States
  const [teamMembers, setTeamMembers] = useState([
    { id: "1", name: "Raynan (Você)", email: "raynan@empresa.com", role: "Proprietário", status: "Ativo" },
    { id: "2", name: "Carlos Gestor", email: "carlos@empresa.com", role: "Gestor de Tráfego", status: "Ativo" },
    { id: "3", name: "Ana Copawriter", email: "ana@empresa.com", role: "Editor", status: "Convidado" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Gestor de Tráfego");

  // Security 2FA
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    void fetch("/api/account/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name ?? "Raynan");
          setEmail(data.user.email ?? "raynan@empresa.com");
          if (data.user.phone) setPhone(data.user.phone);
          if (data.user.company) setCompany(data.user.company);
        }
      })
      .catch(() => null);
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, company, phone }),
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2500);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordFeedback("As senhas não coincidem.");
      return;
    }
    setUpdatingPassword(true);
    setPasswordFeedback("");
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordFeedback("Senha alterada com sucesso!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordFeedback(data.error ?? "Erro ao alterar a senha.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  }

  function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setTeamMembers((prev) => [
      ...prev,
      { id: Date.now().toString(), name: inviteEmail.split("@")[0] ?? "Membro", email: inviteEmail, role: inviteRole, status: "Convidado" },
    ]);
    setInviteEmail("");
  }

  function handleRemoveMember(id: string) {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <main className="dashboard-content pb-16 space-y-5">
      <PageHeader icon={<Layers size={20} />} title="Configurações da Conta SaaS">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </PageHeader>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B9FF66] text-[#191A23] shadow-xs font-bold text-lg">
                {name[0] ?? "U"}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191A23]">{name}</h3>
                <p className="text-xs font-medium text-slate-500">{email}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs font-medium text-slate-600">
              <p><b>Empresa:</b> {company || "Não informada"}</p>
              <p><b>Telefone:</b> {phone || "Não informado"}</p>
              <p><b>Plano Atual:</b> Pro Scale (Ativo)</p>
            </div>
            <Button onClick={() => setActiveTab("profile")} className="w-full h-9 rounded-xl text-xs font-bold">
              Editar Perfil
            </Button>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#191A23] flex items-center gap-2">
              <Shield size={18} /> Resumo de Segurança
            </h3>
            <div className="space-y-2 text-xs font-medium text-slate-600">
              <p className="flex justify-between"><span>Autenticação em 2 etapas (2FA):</span> <b>{twoFactor ? "Ativada" : "Desativada"}</b></p>
              <p className="flex justify-between"><span>Membros na Equipe:</span> <b>{teamMembers.length} pessoas</b></p>
              <p className="flex justify-between"><span>Sessões Ativas:</span> <b>1 dispositivo</b></p>
            </div>
            <Button onClick={() => setActiveTab("security")} variant="outline" className="w-full h-9 rounded-xl text-xs font-semibold">
              Gerenciar Segurança
            </Button>
          </section>
        </div>
      )}

      {/* TAB 2: PERFIL */}
      {activeTab === "profile" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <form onSubmit={handleSaveProfile} className="max-w-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#191A23]">Informações do Perfil</h3>
            <p className="text-xs font-medium text-slate-500">Atualize seus dados pessoais e organizacionais.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[#191A23]">
                Nome Completo
                <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
              </label>
              <label className="block text-xs font-semibold text-[#191A23]">
                E-mail Profissional
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
              </label>
              <label className="block text-xs font-semibold text-[#191A23]">
                Empresa / Marca
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Sua empresa" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
              </label>
              <label className="block text-xs font-semibold text-[#191A23]">
                Telefone / WhatsApp
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
              </label>
            </div>

            {profileSaved && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">Perfil salvo com sucesso!</p>}

            <Button type="submit" disabled={savingProfile} className="h-10 px-6 rounded-xl text-xs font-bold">
              {savingProfile ? "Salvando..." : "Salvar Alterações do Perfil"}
            </Button>
          </form>
        </section>
      )}

      {/* TAB 3: SENHA */}
      {activeTab === "password" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
            <h3 className="text-lg font-bold text-[#191A23]">Alterar Senha</h3>
            <p className="text-xs font-medium text-slate-500">Escolha uma senha forte com pelo menos 8 caracteres.</p>

            <label className="block text-xs font-semibold text-[#191A23]">
              Senha Atual
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
            </label>

            <label className="block text-xs font-semibold text-[#191A23]">
              Nova Senha
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
            </label>

            <label className="block text-xs font-semibold text-[#191A23]">
              Confirmar Nova Senha
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
            </label>

            {passwordFeedback && <p className="text-xs font-semibold text-slate-800 bg-slate-100 p-2.5 rounded-lg border border-slate-200">{passwordFeedback}</p>}

            <Button type="submit" disabled={updatingPassword} className="h-10 px-6 rounded-xl text-xs font-bold">
              {updatingPassword ? "Atualizando..." : "Atualizar Senha"}
            </Button>
          </form>
        </section>
      )}

      {/* TAB 4: EQUIPE */}
      {activeTab === "team" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#191A23]">Membros da Equipe</h3>
              <p className="text-xs font-medium text-slate-500">Convide copys, gestores e editores para trabalharem nos seus players.</p>
            </div>
          </div>

          <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email.do.membro@empresa.com" required className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none">
              <option value="Gestor de Tráfego">Gestor de Tráfego</option>
              <option value="Editor">Editor</option>
              <option value="Administrador">Administrador</option>
            </select>
            <Button type="submit" className="h-10 px-4 rounded-xl text-xs font-bold shrink-0">
              <Plus size={15} className="mr-1" /> Convidar
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[550px] text-left text-xs font-medium text-[#191A23]">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Membro</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-semibold text-[#191A23]">
                      {member.name}
                      <span className="block text-[11px] font-normal text-slate-500">{member.email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{member.role}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{member.status}</td>
                    <td className="px-4 py-3 text-right">
                      {member.role !== "Proprietário" && (
                        <button type="button" onClick={() => handleRemoveMember(member.id)} className="text-slate-400 hover:text-red-600 p-1">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: BILLING */}
      {activeTab === "billing" && <BillingSettingsTab />}

      {/* TAB 6: PREFERÊNCIAS */}
      {activeTab === "preferences" && <PreferencesSettingsTab />}

      {/* TAB 7: SEGURANÇA */}
      {activeTab === "security" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5 max-w-2xl">
          <div>
            <h3 className="text-lg font-bold text-[#191A23]">Segurança da Conta</h3>
            <p className="text-xs font-medium text-slate-500">Proteja seu painel contra acessos não autorizados.</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div>
              <p className="text-xs font-bold text-[#191A23]">Autenticação em Dois Fatores (2FA)</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Exige um código temporário no seu celular ao fazer login.</p>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactor(!twoFactor)}
              className={`h-6 w-11 rounded-full p-0.5 transition-colors ${twoFactor ? "bg-[#B9FF66]" : "bg-slate-300"}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white transition-transform ${twoFactor ? "translate-x-5 bg-[#191A23]" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-[#191A23]">Sessões Ativas</h4>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 text-xs">
              <div>
                <p className="font-semibold text-[#191A23]">Navegador Atual (Windows)</p>
                <p className="text-[11px] font-medium text-slate-500">Último acesso: Agora mesmo</p>
              </div>
              <span className="text-xs font-bold text-emerald-600">Este dispositivo</span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
