"use client";

import { useState } from "react";
import { Moon, Globe, Bell, Volume2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PreferencesSettingsTab() {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("pt-BR");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {savedNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Preferências salvas com sucesso!</span>
        </div>
      )}

      {/* Personalization Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#191A23]">Personalização & Aparência</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Ajuste o tema visual e idioma da sua conta Prisma Player.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Dark Mode Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Moon className="h-4 w-4 text-[#191A23]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#191A23]">Modo Escuro / Tema Dark</p>
                <p className="text-[11px] font-medium text-slate-500">Ativar contraste escuro no painel de controle</p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer ${
                darkMode ? "bg-[#B9FF66]" : "bg-slate-300"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#191A23] transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Language Select Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Globe className="h-4 w-4 text-[#191A23]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#191A23]">Idioma da Plataforma</p>
                <p className="text-[11px] font-medium text-slate-500">Selecione o idioma de exibição do painel</p>
              </div>
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#191A23]"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications & Activity Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#191A23]">Notificações & Atividade</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Escolha quando e como você quer receber alertas das suas VSLs.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Email Notifications Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Bell className="h-4 w-4 text-[#191A23]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#191A23]">Alertas por E-mail</p>
                <p className="text-[11px] font-medium text-slate-500">Relatório semanal de retenção e alertas de pico</p>
              </div>
            </div>

            <button
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`relative h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer ${
                emailAlerts ? "bg-[#B9FF66]" : "bg-slate-300"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#191A23] transition-transform ${
                  emailAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Sound Effects Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Volume2 className="h-4 w-4 text-[#191A23]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#191A23]">Efeitos Sonoros do Studio</p>
                <p className="text-[11px] font-medium text-slate-500">Sons de confirmação ao publicar e salvar vídeos</p>
              </div>
            </div>

            <button
              onClick={() => setSoundEffects(!soundEffects)}
              className={`relative h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer ${
                soundEffects ? "bg-[#B9FF66]" : "bg-slate-300"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#191A23] transition-transform ${
                  soundEffects ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-1">
          <Button
            onClick={handleSave}
            className="h-10 rounded-xl bg-[#B9FF66] hover:bg-[#a6ee50] text-[#191A23] font-bold text-xs shadow-xs border border-black/5 cursor-pointer"
          >
            Salvar Preferências
          </Button>
        </div>
      </div>
    </div>
  );
}
