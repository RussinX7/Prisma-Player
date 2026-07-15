"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import Link from "next/link";

interface InfoBannerProps {
  defaultVisible?: boolean;
}

export default function InfoBanner({ defaultVisible = true }: InfoBannerProps) {
  const [visible, setVisible] = useState(defaultVisible);

  if (!visible) return null;

  return (
    <div className="mx-6 lg:mx-8 mt-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-prisma-blue/5 border border-prisma-blue/10">
        <div className="w-8 h-8 rounded-full bg-prisma-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info size={16} className="text-prisma-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] tracking-[-0.224px] themeable-text-ink leading-relaxed">
            Configure seu player de vídeo para começar a capturar leads.{" "}
            <Link
              href="#"
              className="text-prisma-blue font-medium hover:underline"
            >
              Ver tutorial
            </Link>
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label="Fechar"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:themeable-bg-surface-pearl themeable-text-ink-muted-48 transition-all active:scale-90 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
