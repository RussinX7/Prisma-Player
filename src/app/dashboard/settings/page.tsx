"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CircleUserRound,
  User,
  Lock,
  Users,
  CreditCard,
  Sliders,
  Shield,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { OverviewPanel } from "@/features/account/components/OverviewPanel";
import { ProfilePanel } from "@/features/account/components/ProfilePanel";
import { PasswordPanel } from "@/features/account/components/PasswordPanel";
import { TeamPanel } from "@/features/account/components/TeamPanel";
import { SecurityPanel } from "@/features/account/components/SecurityPanel";
import { BillingSettingsTab } from "@/features/account/components/BillingSettingsTab";
import { PreferencesSettingsTab } from "@/features/account/components/PreferencesSettingsTab";
import { SettingsSkeleton } from "@/features/account/components/SettingsUi";
import type { AccountOverview, AccountProfile } from "@/features/account/model/types";
import { accountSettingsService } from "@/services/account/settings";

type TabType = "overview" | "profile" | "password" | "team" | "billing" | "preferences" | "security";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const adminMfaRequired =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("adminMfa") === "required";

  useEffect(() => {
    void Promise.allSettled([
      accountSettingsService.getProfile(),
      accountSettingsService.getOverview(),
    ]).then(([profileResult, overviewResult]) => {
      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.profile);
      }
      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
      }
      setLoading(false);
    });
  }, []);

  const notify = useCallback((message: string) => setNotice(message), []);

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: CircleUserRound },
    { id: "profile", label: "Perfil", icon: User },
    { id: "password", label: "Senha", icon: Lock },
    { id: "team", label: "Equipe", icon: Users },
    { id: "billing", label: "Faturamento & Planos", icon: CreditCard },
    { id: "preferences", label: "Preferências & Notificações", icon: Sliders },
    { id: "security", label: "Segurança", icon: Shield },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      
      {/* Header Positivus Style */}
      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[6px_6px_0px_#191A23]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-xl border-2 border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-xs font-black uppercase text-[#191A23] shadow-[2px_2px_0px_#191A23]">
              <Sparkles className="h-4 w-4" />
              Configurações SaaS
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#191A23] tracking-tight">
              Configurações do Sistema
            </h1>
            <p className="text-sm font-medium text-[#191A23]/70">
              Gerencie seus dados de conta, equipe, cartões de crédito, recibos e preferências.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Tabs Bar (Matching Screenshot 1) */}
      <div className="overflow-x-auto pb-2">
        <nav
          aria-label="Abas de configurações"
          className="flex gap-2 min-w-max rounded-2xl border-2 border-[#191A23] bg-white p-2 shadow-[4px_4px_0px_#191A23]"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setNotice("");
                }}
                className={`relative inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-2 border-[#191A23] ${
                  isActive
                    ? "bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]"
                    : "bg-white text-[#191A23] hover:bg-[#B9FF66]/20 shadow-[1px_1px_0px_#191A23]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-[#191A23]" />
                <span className="text-[#191A23] font-black">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Notice Banner */}
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] p-4 text-xs font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23]"
        >
          {notice}
        </motion.div>
      )}

      {/* Tab Content Section */}
      <main className="min-w-0">
        {loading ? (
          <SettingsSkeleton />
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && <OverviewPanel overview={overview} profile={profile} />}
            {activeTab === "profile" &&
              (profile ? (
                <ProfilePanel profile={profile} onUpdated={setProfile} notify={notify} />
              ) : (
                <SettingsSkeleton />
              ))}
            {activeTab === "password" && <PasswordPanel notify={notify} />}
            {activeTab === "team" && <TeamPanel notify={notify} />}
            {activeTab === "billing" && <BillingSettingsTab />}
            {activeTab === "preferences" && <PreferencesSettingsTab />}
            {activeTab === "security" && (
              <SecurityPanel notify={notify} adminMfaRequired={adminMfaRequired} />
            )}
          </motion.div>
        )}
      </main>

    </div>
  );
}
