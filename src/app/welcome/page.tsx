import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PartyPopper, ShieldCheck, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import WelcomeActions from "@/features/access/components/WelcomeActions";
import { requireUser } from "@/lib/auth/server";
import { getAccountAccess } from "@/lib/access/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Boas-vindas", robots: { index: false, follow: false } };
export default async function WelcomePage() {
  const userId = await requireUser("/welcome");
  const access = await getAccountAccess(userId);
  if (access.onboardingCompleted && access.trialStatus !== "available") redirect("/dashboard/videos");
  return <main className="flex min-h-dvh items-center justify-center themeable-bg-canvas-parchment p-5"><section className="w-full max-w-lg rounded-[28px] border p-7 text-center shadow-xl shadow-black/5 themeable-bg-canvas themeable-border-hairline sm:p-10"><BrandLogo className="mx-auto h-9 w-[180px]" /><div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-[22px] bg-prisma-blue/10 text-prisma-blue"><PartyPopper size={30} /></div><h1 className="mt-5 text-[34px] font-semibold tracking-[-1.2px] themeable-text-ink">Sua conta Prisma esta pronta.</h1><p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed themeable-text-ink-muted-48">Parabens! Voce ganhou 14 dias de acesso completo, sem cartao e sem cobranca automatica.</p><div className="mt-7 grid gap-3 text-left sm:grid-cols-2"><div className="rounded-[18px] themeable-bg-surface-pearl p-4"><Sparkles size={19} className="text-prisma-blue" /><p className="mt-2 text-[13px] font-semibold themeable-text-ink">Todas as ferramentas</p><p className="mt-1 text-[12px] themeable-text-ink-muted-48">Publique, personalize e analise VSLs reais.</p></div><div className="rounded-[18px] themeable-bg-surface-pearl p-4"><ShieldCheck size={19} className="text-green-500" /><p className="mt-2 text-[13px] font-semibold themeable-text-ink">Sem compromisso</p><p className="mt-1 text-[12px] themeable-text-ink-muted-48">O teste termina sozinho e nunca gera cobranca.</p></div></div><WelcomeActions /></section></main>;
}
