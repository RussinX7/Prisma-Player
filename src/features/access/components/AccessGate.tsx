"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, LoaderCircle, Sparkles } from "lucide-react";

const freeRoutes = ["/dashboard/billing", "/dashboard/settings"];
export default function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const unrestricted = freeRoutes.some((route) => pathname.startsWith(route));
  const [state, setState] = useState<{ loading: boolean; access: boolean; trial: boolean }>({ loading: !unrestricted, access: unrestricted, trial: false });
  useEffect(() => {
    if (unrestricted) return;
    fetch("/api/account/access", { cache: "no-store" }).then((r) => r.json()).then((data) => setState({ loading: false, access: Boolean(data.hasAccess), trial: data.trialStatus === "available" })).catch(() => setState({ loading: false, access: false, trial: false }));
  }, [unrestricted]);
  if (state.loading) return <div className="flex min-h-[70vh] items-center justify-center"><LoaderCircle className="animate-spin text-prisma-blue" /></div>;
  if (!state.access) return <div className="flex min-h-[75vh] items-center justify-center p-5"><section className="max-w-md rounded-[24px] border p-7 text-center themeable-bg-canvas themeable-border-hairline"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-prisma-blue/10 text-prisma-blue"><LockKeyhole size={26} /></div><h1 className="mt-5 text-[26px] font-semibold themeable-text-ink">Ative seu acesso para continuar</h1><p className="mt-2 text-[14px] leading-relaxed themeable-text-ink-muted-48">Seu projeto continua seguro. Ative os 14 dias gratis ou escolha um plano para liberar esta area.</p><Link href={state.trial ? "/welcome" : "/dashboard/billing"} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-prisma-blue px-6 text-[14px] font-semibold text-white"><Sparkles size={17} />{state.trial ? "Ativar teste gratis" : "Ver planos"}</Link></section></div>;
  return children;
}
