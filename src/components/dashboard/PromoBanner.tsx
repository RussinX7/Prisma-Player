"use client";

import { useState } from "react";
import { X, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PromoBannerProps {
  defaultVisible?: boolean;
}

export default function PromoBanner({ defaultVisible = true }: PromoBannerProps) {
  const [visible, setVisible] = useState(defaultVisible);

  if (!visible) return null;

  return (
    <div className="mx-6 lg:mx-8 mt-3">
      <Link
        href="#"
        className="group relative block overflow-hidden rounded-xl bg-gradient-to-r from-prisma-blue via-blue-600 to-blue-700"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold tracking-[-0.2px] text-white">
              Desbloqueie vídeos ilimitados
            </p>
            <p className="text-[13px] tracking-[-0.2px] text-white/80 mt-0.5">
              Faça upgrade para o plano Pro e remova todos os limites.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white text-[13px] font-medium tracking-[-0.2px] group-hover:bg-white/30 transition-colors">
            Ver planos
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setVisible(false);
            }}
            aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-90 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </Link>
    </div>
  );
}
