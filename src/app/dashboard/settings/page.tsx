"use client";

import {
  CircleUserRound,
  Lock,
  Shield,
  User,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { OverviewPanel } from "@/features/account/components/OverviewPanel";
import { PasswordPanel } from "@/features/account/components/PasswordPanel";
import { ProfilePanel } from "@/features/account/components/ProfilePanel";
import { SecurityPanel } from "@/features/account/components/SecurityPanel";
import { SettingsSkeleton } from "@/features/account/components/SettingsUi";
import { TeamPanel } from "@/features/account/components/TeamPanel";
import type {
  AccountOverview,
  AccountProfile,
  SettingsSection,
} from "@/features/account/model/types";
import { cn } from "@/lib/utils";
import { accountSettingsService } from "@/services/account/settings";

const sections = [
  { id: "overview", label: "Visão geral", icon: CircleUserRound },
  { id: "profile", label: "Perfil", icon: User },
  { id: "team", label: "Equipe", icon: Users },
  { id: "password", label: "Senha", icon: Lock },
  { id: "security", label: "Segurança", icon: Shield },
] satisfies Array<{ id: SettingsSection; label: string; icon: typeof User }>;

function initialSection(): SettingsSection {
  if (typeof window === "undefined") return "overview";
  return new URLSearchParams(window.location.search).get("section") === "security"
    ? "security"
    : "overview";
}

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>(initialSection);
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

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">
          Conta Prisma
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Configurações
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Gerencie sua operação, equipe, preferências e segurança em um só lugar.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Seções das configurações"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2 lg:sticky lg:top-20 lg:h-fit lg:flex-col lg:overflow-visible"
        >
          {sections.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setNotice("");
                }}
                className={cn(
                  "relative flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors lg:w-full",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-active-section"
                    className="absolute inset-0 -z-0 rounded-xl bg-primary shadow-sm"
                    transition={{ type: "spring", stiffness: 430, damping: 35 }}
                  />
                )}
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0">
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary"
            >
              {notice}
            </motion.div>
          )}
          {loading ? (
            <SettingsSkeleton />
          ) : (
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {section === "overview" && <OverviewPanel overview={overview} profile={profile} />}
              {section === "profile" &&
                (profile ? (
                  <ProfilePanel profile={profile} onUpdated={setProfile} notify={notify} />
                ) : (
                  <SettingsSkeleton />
                ))}
              {section === "team" && <TeamPanel notify={notify} />}
              {section === "password" && <PasswordPanel notify={notify} />}
              {section === "security" && (
                <SecurityPanel notify={notify} adminMfaRequired={adminMfaRequired} />
              )}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
