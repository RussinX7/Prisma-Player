"use client";

import { useState } from "react";
import { Moon, Globe, Bell, Volume2, Calendar, LogOut, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-8">
      {savedNotice && (
        <div className="rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] p-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#191A23]" />
          <span>Preferências salvas com sucesso!</span>
        </div>
      )}

      {/* Personalization Section (Matching Screenshot 2) */}
      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[4px_4px_0px_#191A23] space-y-6">
        <div>
          <h2 className="text-2xl font-black text-[#191A23]">Personalização & Aparência</h2>
          <p className="text-xs font-medium text-[#191A23]/70 mt-1">
            Ajuste o tema visual e idioma da sua conta Prisma Player.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {/* Dark Mode Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]">
                <Moon className="h-5 w-5 text-[#191A23]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#191A23]">Modo Escuro / Tema Dark</p>
                <p className="text-xs font-medium text-[#191A23]/70">Ativar contraste escuro no painel de controle</p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative h-8 w-14 rounded-full border-2 border-[#191A23] p-1 transition-colors cursor-pointer ${
                darkMode ? "bg-[#B9FF66]" : "bg-white"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#191A23] transition-transform ${
                  darkMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Language Select Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]">
                <Globe className="h-5 w-5 text-[#191A23]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#191A23]">Idioma da Plataforma</p>
                <p className="text-xs font-medium text-[#191A23]/70">Selecione o idioma de exibição do painel</p>
              </div>
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-xl border-2 border-[#191A23] bg-white px-3 py-2 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23]"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications & Activity Section (Matching Screenshot 2) */}
      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[4px_4px_0px_#191A23] space-y-6">
        <div>
          <h2 className="text-2xl font-black text-[#191A23]">Notificações & Atividade</h2>
          <p className="text-xs font-medium text-[#191A23]/70 mt-1">
            Escolha quando e como você quer receber alertas das suas VSLs.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {/* Email Notifications Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]">
                <Bell className="h-5 w-5 text-[#191A23]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#191A23]">Alertas por E-mail</p>
                <p className="text-xs font-medium text-[#191A23]/70">Relatório semanal de retenção e alertas de pico</p>
              </div>
            </div>

            <button
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`relative h-8 w-14 rounded-full border-2 border-[#191A23] p-1 transition-colors cursor-pointer ${
                emailAlerts ? "bg-[#B9FF66]" : "bg-white"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#191A23] transition-transform ${
                  emailAlerts ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Sound Effects Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]">
                <Volume2 className="h-5 w-5 text-[#191A23]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#191A23]">Efeitos Sonoros do Studio</p>
                <p className="text-xs font-medium text-[#191A23]/70">Sons de confirmação ao publicar e salvar vídeos</p>
              </div>
            </div>

            <button
              onClick={() => setSoundEffects(!soundEffects)}
              className={`relative h-8 w-14 rounded-full border-2 border-[#191A23] p-1 transition-colors cursor-pointer ${
                soundEffects ? "bg-[#B9FF66]" : "bg-white"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-[#191A23] transition-transform ${
                  soundEffects ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSave}
            className="h-11 rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] font-black text-sm shadow-[3px_3px_0px_#191A23] hover:bg-[#B9FF66]/90 cursor-pointer"
          >
            Salvar Preferências
          </Button>
        </div>
      </div>
    </div>
  );
}
