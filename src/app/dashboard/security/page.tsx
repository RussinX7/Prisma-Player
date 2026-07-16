"use client";

import { useEffect, useState } from "react";
import { Globe2, Plus, Shield, Trash2 } from "lucide-react";
import Header from "@/components/dashboard/Header";

export default function SecurityPage() {
  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch("/api/dashboard-security", { cache: "no-store" }).then((response) => response.json()).then((data) => setDomains(data.domains ?? [])); }, []);

  function addDomain() {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!clean || domains.includes(clean)) return;
    setDomains((items) => [...items, clean]);
    setDomain("");
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/dashboard-security", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ domains }) });
    setSaving(false); setSaved(response.ok); if (response.ok) setTimeout(() => setSaved(false), 1800);
  }

  return (
    <>
      <Header title="Segurança" description="Proteja embeds, domínios e acesso aos vídeos" />
      <section className="dashboard-content flex flex-1 flex-col">
        <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-prisma-blue/10 text-prisma-blue"><Shield size={21} /></div><div><h2 className="text-[22px] font-semibold themeable-text-ink">Domínios permitidos</h2><p className="text-[13px] themeable-text-ink-muted-48">Defina onde seus players podem ser executados</p></div></div>
        <div className="rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline sm:p-6 lg:p-8">
          <div className="max-w-3xl">
            <h3 className="text-[17px] font-semibold themeable-text-ink">Lista de proteção</h3>
            <p className="mt-2 text-[15px] leading-relaxed themeable-text-ink-muted-48">Cadastre domínios sem protocolo. Use <code className="rounded bg-prisma-blue/10 px-1.5 py-0.5 text-prisma-blue">*.exemplo.com</code> para permitir todos os subdomínios.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <label className="flex min-h-11 flex-1 items-center gap-3 rounded-full border px-4 themeable-border-hairline"><Globe2 size={17} className="themeable-text-ink-muted-48" /><input value={domain} onChange={(event) => setDomain(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addDomain()} placeholder="checkout.seudominio.com" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none themeable-text-ink" /></label>
              <button type="button" onClick={addDomain} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-prisma-blue px-5 text-[14px] text-white"><Plus size={16} />Adicionar domínio</button>
            </div>
            <div className="mt-6 space-y-2">
              {domains.length === 0 ? <div className="rounded-[11px] border border-dashed p-6 text-center text-[14px] themeable-border-hairline themeable-text-ink-muted-48">Nenhum domínio cadastrado. Enquanto a lista estiver vazia, o MVP não bloqueia embeds.</div> : domains.map((item) => <div key={item} className="flex min-h-12 items-center gap-3 rounded-[11px] themeable-bg-surface-pearl px-4"><Globe2 size={16} className="text-prisma-blue" /><span className="min-w-0 flex-1 truncate text-[14px] themeable-text-ink">{item}</span><button type="button" onClick={() => setDomains((values) => values.filter((value) => value !== item))} aria-label={`Remover ${item}`} className="flex h-11 w-11 items-center justify-center themeable-text-ink-muted-48"><Trash2 size={16} /></button></div>)}
            </div>
            <div className="mt-8 border-t pt-6 themeable-border-hairline"><button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 rounded-full bg-prisma-blue px-6 text-[14px] text-white disabled:opacity-50">{saving ? "Salvando…" : saved ? "Alterações salvas" : "Salvar alterações"}</button></div>
          </div>
        </div>
      </section>
    </>
  );
}
