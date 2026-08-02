"use client";

import { useEffect, useState } from "react";
import { Globe2, Plus, Shield, Trash2, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";

export default function SecurityPage() {
  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/dashboard-security", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setDomains(data.domains ?? []));
  }, []);

  function addDomain() {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!clean || domains.includes(clean)) return;
    setDomains((items) => [...items, clean]);
    setDomain("");
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/dashboard-security", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domains }),
    });
    setSaving(false);
    setSaved(response.ok);
    if (response.ok) setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section className="dashboard-content flex flex-1 flex-col space-y-6">
      <PageHeader
        icon={<Shield size={20} />}
        title="Segurança & Proteção de Domínios"
      />

      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[6px_6px_0px_#191A23]">
        <div className="max-w-3xl space-y-6">
          <div>
            <h3 className="text-2xl font-black text-[#191A23]">Lista de Domínios Autorizados</h3>
            <p className="mt-1 text-xs font-medium text-[#191A23]/70 leading-relaxed">
              Cadastre domínios sem protocolo (ex: <code className="rounded-md border border-[#191A23] bg-[#B9FF66] px-2 py-0.5 font-bold text-[#191A23]">checkout.seudominio.com</code>).
              Use <code className="rounded-md border border-[#191A23] bg-[#F3F3F3] px-2 py-0.5 font-bold text-[#191A23]">*.exemplo.com</code> para autorizar todos os subdomínios.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex min-h-12 flex-1 items-center gap-3 rounded-2xl border-2 border-[#191A23] bg-white px-4 shadow-[2px_2px_0px_#191A23]">
              <Globe2 size={18} className="text-[#191A23]/60" />
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addDomain()}
                placeholder="checkout.seudominio.com"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#191A23] outline-none"
              />
            </label>
            <button
              type="button"
              onClick={addDomain}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] px-6 text-xs font-black text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:bg-[#B9FF66]/90 transition-all cursor-pointer"
            >
              <Plus size={16} />
              Adicionar domínio
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {domains.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#191A23]/40 p-6 text-center text-xs font-bold text-[#191A23]/70 bg-[#F3F3F3]">
                Nenhum domínio cadastrado. Enquanto a lista estiver vazia, seus players podem ser reproduzidos em qualquer site.
              </div>
            ) : (
              domains.map((item) => (
                <div
                  key={item}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3] px-4 shadow-[2px_2px_0px_#191A23]"
                >
                  <div className="flex items-center gap-3">
                    <Globe2 size={18} className="text-[#191A23]" />
                    <span className="font-bold text-sm text-[#191A23]">{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDomains((values) => values.filter((value) => value !== item))}
                    aria-label={`Remover ${item}`}
                    className="flex h-9 w-9 items-center justify-center text-[#191A23] hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {saved && (
            <div className="rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] p-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#191A23]" />
              <span>Regras de proteção atualizadas com sucesso!</span>
            </div>
          )}

          <div className="pt-4 border-t-2 border-[#191A23]/10">
            <Button
              onClick={() => void save()}
              disabled={saving}
              className="h-12 rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] font-black text-sm shadow-[3px_3px_0px_#191A23] hover:bg-[#B9FF66]/90 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Salvando alterações..." : saved ? "Salvo com sucesso!" : "Salvar Configurações de Segurança"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
