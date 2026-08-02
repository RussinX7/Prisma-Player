"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Play, BarChart3, ShieldCheck, Sparkles } from "lucide-react";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const highlights = [
  { icon: BarChart3, text: "Veja exatamente onde sua VSL ganha ou perde atenção em tempo real." },
  { icon: Sparkles, text: "Transforme métricas de retenção em testes A/B altamente lucrativos." },
  { icon: ShieldCheck, text: "Proteja seu vídeo contra pirataria e downloads indevidos com DRM." },
];

export function AuthLayout({ eyebrow, title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#F3F3F3] text-[#191A23] font-sans antialiased flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Form Card (Left) */}
        <div className="lg:col-span-6 rounded-[40px] border-2 border-[#191A23] bg-white p-8 sm:p-12 shadow-[8px_8px_0px_#191A23] flex flex-col justify-between">
          <div>
            {/* Logo Positivus */}
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#191A23] text-[#B9FF66] shadow-[2px_2px_0px_#191A23] group-hover:scale-105 transition-transform">
                <Play className="h-5 w-5 fill-[#B9FF66] ml-0.5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#191A23]">
                Prisma<span className="font-light">Player</span>
              </span>
            </Link>

            <div className="mt-8 mb-6 space-y-3">
              <span className="inline-block rounded-xl border-2 border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-xs font-black uppercase text-[#191A23] shadow-[2px_2px_0px_#191A23]">
                {eyebrow}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#191A23] leading-tight">
                {title}
              </h1>
              <p className="text-sm font-medium text-[#191A23]/80 leading-relaxed">
                {description}
              </p>
            </div>

            {children}
          </div>

          <div className="mt-8 pt-6 border-t-2 border-[#191A23]/10 text-center text-sm font-bold text-[#191A23]">
            {footer}
          </div>
        </div>

        {/* Info Aside Card (Right) */}
        <div className="lg:col-span-6 rounded-[40px] border-2 border-[#191A23] bg-[#191A23] p-8 sm:p-12 text-white shadow-[8px_8px_0px_#B9FF66] hidden lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <span className="inline-block rounded-xl border-2 border-[#B9FF66] bg-[#B9FF66] px-3.5 py-1 text-xs font-black uppercase text-[#191A23] shadow-[2px_2px_0px_white]">
              Operação VSL de Alta Retenção
            </span>

            <h2 className="text-3xl lg:text-4xl font-black text-[#B9FF66] tracking-tight leading-tight">
              Sua VSL fala. O Prisma mostra o que ela está vendendo.
            </h2>

            <p className="text-sm font-medium text-white/80 leading-relaxed">
              Infraestrutura Turbo CDN de baixa latência, pitch delay ao segundo exato e análises detalhadas para multiplicar seu ROI.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-2xl border-2 border-white/20 bg-white/5 p-4 backdrop-blur-md shadow-[3px_3px_0px_#191A23]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_white]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="pt-1 text-xs font-semibold text-white/90 leading-snug">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
