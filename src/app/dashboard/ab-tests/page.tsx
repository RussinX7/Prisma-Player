"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, FolderPlus, Plus, Search, Trash2 } from "lucide-react";
import Header from "@/components/dashboard/Header";
import Dialog from "@/components/ui/Dialog";

interface Experiment {
  id: string;
  name: string;
  status: "Rascunho" | "Ativo";
  variants: number;
}
interface TestFolder { id: string; name: string }

export default function AbTestsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [query, setQuery] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [name, setName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState<TestFolder[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/ab-tests", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setFolders(data.folders ?? []);
      setExperiments((data.tests ?? []).map((item: { id: string; name: string; status: string; ab_test_variants?: { count: number }[] }) => ({ id: item.id, name: item.name, status: item.status === "active" ? "Ativo" : "Rascunho", variants: item.ab_test_variants?.[0]?.count ?? 0 })));
    }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visibleExperiments = experiments.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

  async function createExperiment() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const response = await fetch("/api/ab-tests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "test", name: cleanName }) });
    if (response.ok) { setName(""); setTestOpen(false); await load(); }
  }

  async function createFolder() { const clean = folderName.trim(); if (!clean) return; const response = await fetch("/api/ab-tests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "folder", name: clean }) }); if (response.ok) { setFolderName(""); setFolderOpen(false); await load(); } }
  async function removeTest(id: string) { const response = await fetch(`/api/ab-tests/${id}`, { method: "DELETE" }); if (response.ok) await load(); }

  return (
    <>
      <Header title="Testes A/B" description="Compare vídeos e experiências com tráfego real" />
      <section className="dashboard-content flex flex-1 flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-prisma-blue/10 text-prisma-blue"><FlaskConical size={21} /></div>
            <div><h2 className="text-[22px] font-semibold themeable-text-ink">Testes A/B</h2><p className="text-[13px] themeable-text-ink-muted-48">Encontre a versão que mais converte</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setFolderOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[14px] themeable-border-hairline themeable-text-ink"><FolderPlus size={16} />Nova pasta</button>
            <button type="button" onClick={() => setTestOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-prisma-blue px-4 text-[14px] text-white"><Plus size={16} />Novo teste</button>
          </div>
        </div>

        <div className="mt-6 flex min-h-[400px] flex-1 flex-col rounded-[18px] border themeable-bg-canvas themeable-border-hairline">
          {folders.length > 0 && <div className="flex gap-2 overflow-x-auto border-b p-4 themeable-border-hairline">{folders.map((folder) => <span key={folder.id} className="flex min-h-10 shrink-0 items-center gap-2 rounded-full themeable-bg-surface-pearl px-4 text-[13px] themeable-text-ink"><FolderPlus size={15} className="text-prisma-blue" />{folder.name}</span>)}</div>}
          <div className="flex items-center gap-2 border-b p-4 themeable-border-hairline sm:justify-end">
            <label className="flex min-h-11 w-full items-center gap-2 rounded-full border px-4 themeable-border-hairline sm:max-w-xs">
              <Search size={16} className="themeable-text-ink-muted-48" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar testes" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none themeable-text-ink" />
            </label>
          </div>
          {visibleExperiments.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full themeable-bg-surface-pearl"><FlaskConical size={28} className="themeable-text-ink-muted-48" /></div>
              <h3 className="text-[21px] font-semibold themeable-text-ink">Nenhum teste A/B encontrado</h3>
              <p className="mt-2 max-w-md text-[15px] themeable-text-ink-muted-48">Crie um experimento e adicione pelo menos duas versões do seu vídeo ou player.</p>
              <button type="button" onClick={() => setTestOpen(true)} className="mt-6 min-h-11 rounded-full bg-prisma-blue px-5 text-[14px] text-white">Criar primeiro teste</button>
            </div>
          ) : (
            <div className="divide-y themeable-border-hairline">
              {visibleExperiments.map((experiment) => (
                <article key={experiment.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-prisma-blue/10 text-prisma-blue"><FlaskConical size={20} /></div>
                  <div className="min-w-0 flex-1"><h3 className="truncate text-[16px] font-semibold themeable-text-ink">{experiment.name}</h3><p className="mt-1 text-[13px] themeable-text-ink-muted-48">{experiment.variants} variantes · ainda sem tráfego</p></div>
                  <span className="w-fit rounded-full border px-3 py-1 text-[12px] themeable-border-hairline themeable-text-ink-muted-48">{experiment.status}</span>
                  <button type="button" onClick={() => void removeTest(experiment.id)} aria-label="Excluir teste" className="flex h-11 w-11 items-center justify-center rounded-full themeable-bg-surface-pearl themeable-text-ink-muted-48"><Trash2 size={16} /></button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={testOpen} onClose={() => setTestOpen(false)} title="Criar novo teste A/B" description="Comece pelo nome; as variantes serão adicionadas na próxima etapa." size="sm" footer={<><button type="button" onClick={() => setTestOpen(false)} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={createExperiment} disabled={!name.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar teste</button></>}>
        <label className="block text-[14px] font-semibold themeable-text-ink">Nome<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: VSL principal — headline" className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 font-normal outline-none themeable-border-hairline themeable-text-ink focus:border-prisma-blue" /></label>
      </Dialog>
      <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar nova pasta" description="Organize seus experimentos no banco de produção." size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar pasta</button>}>
        <label className="block text-[14px] font-semibold themeable-text-ink">Nome da pasta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Ex.: Lançamento Julho" className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 font-normal outline-none themeable-border-hairline themeable-text-ink focus:border-prisma-blue" /></label>
      </Dialog>
    </>
  );
}
