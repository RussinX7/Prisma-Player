"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export default function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = "md",
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[18px] border themeable-bg-canvas themeable-border-hairline sm:rounded-[18px] ${sizes[size]}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4 themeable-border-hairline sm:px-6">
          <div>
            <h2 id="dialog-title" className="text-[17px] font-semibold tracking-[-0.374px] themeable-text-ink">{title}</h2>
            {description && <p className="mt-1 text-[13px] themeable-text-ink-muted-48">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full themeable-bg-surface-pearl themeable-text-ink-muted-48">
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-3 border-t px-5 py-4 themeable-border-hairline sm:px-6">{footer}</footer>}
      </section>
    </div>
  );
}
