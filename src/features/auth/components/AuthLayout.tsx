"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const highlights = [
  { icon: BarChart3, text: "Veja exatamente onde sua VSL ganha ou perde atenção." },
  { icon: Sparkles, text: "Transforme métricas em próximos testes objetivos." },
  { icon: ShieldCheck, text: "Proteja seu conteúdo e mantenha a operação sob controle." },
];

export function AuthLayout({ eyebrow, title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-[440px]"
        >
          <Link href="/" aria-label="Voltar para a página inicial" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLogo className="h-9 w-[184px]" priority />
          </Link>
          <div className="mb-8 mt-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-prisma-blue">{eyebrow}</p>
            <h1 className="text-balance text-[clamp(2rem,5vw,2.7rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-foreground">
              {title}
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-6 text-muted-foreground">{description}</p>
          </div>
          {children}
          <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>
        </motion.div>
      </section>

      <aside className="relative hidden overflow-hidden border-l border-border bg-[#101319] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 opacity-90 [background:radial-gradient(circle_at_18%_18%,rgba(0,113,227,.3),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(41,151,255,.18),transparent_35%)]" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            Operação de VSL em um só lugar
          </span>
          <h2 className="mt-8 max-w-lg text-[clamp(2.35rem,4vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.06em]">
            Sua VSL fala. A Prisma mostra o que ela está dizendo.
          </h2>
        </div>
        <div className="relative grid gap-3">
          {highlights.map(({ icon: Icon, text }, index) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + index * 0.07, duration: 0.3 }}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-prisma-blue text-white">
                <Icon size={17} aria-hidden />
              </span>
              <p className="pt-1 text-sm leading-5 text-white/78">{text}</p>
            </motion.div>
          ))}
        </div>
      </aside>
    </main>
  );
}
