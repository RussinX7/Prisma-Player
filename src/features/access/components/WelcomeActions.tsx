"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";

export default function WelcomeActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<"activate" | "later" | null>(null);
  const [error, setError] = useState("");
  async function submit(action: "activate" | "later") {
    setLoading(action); setError("");
    const response = await fetch("/api/account/trial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    if (!response.ok) { setError("Nao foi possivel concluir agora. Tente novamente."); setLoading(null); return; }
    router.replace(action === "activate" ? "/dashboard/videos" : "/dashboard/billing"); router.refresh();
  }
  return <div className="mt-8 space-y-3">
    <button onClick={() => submit("activate")} disabled={Boolean(loading)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-prisma-blue px-6 text-[14px] font-semibold text-white disabled:opacity-60">{loading === "activate" ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}Ativar meus 14 dias agora</button>
    <button onClick={() => submit("later")} disabled={Boolean(loading)} className="min-h-12 w-full rounded-full border px-6 text-[14px] font-semibold themeable-border-hairline themeable-text-ink">Ativar depois pelo inbox</button>
    {error && <p className="text-center text-[12px] text-red-500">{error}</p>}
  </div>;
}
