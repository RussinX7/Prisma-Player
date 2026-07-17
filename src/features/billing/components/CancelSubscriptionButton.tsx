"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  async function cancel() {
    if (!window.confirm("Cancelar a renovacao automatica agora? A AbacatePay aplica o cancelamento imediatamente.")) return;
    setLoading(true);
    const response = await fetch("/api/billing/cancel", { method: "POST" });
    setLoading(false);
    if (response.ok) window.location.reload(); else window.alert("Nao foi possivel cancelar agora.");
  }
  return <button onClick={cancel} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-full border border-red-500/30 px-5 text-[13px] font-semibold text-red-500 disabled:opacity-60">{loading && <LoaderCircle size={16} className="animate-spin" />}Cancelar assinatura</button>;
}
