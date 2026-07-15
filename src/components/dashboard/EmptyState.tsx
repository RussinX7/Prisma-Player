"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel = "Adicionar primeiro vídeo",
  onAction,
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      <div className="mb-6">
        {icon || (
          <div className="w-20 h-20 rounded-2xl themeable-bg-surface-pearl flex items-center justify-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="themeable-text-ink-muted-48"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
      </div>
      <h3 className="text-center text-[21px] font-semibold tracking-[-0.35px] themeable-text-ink mb-2 sm:text-[22px]">
        {title}
      </h3>
      <p className="text-[15px] tracking-[-0.224px] themeable-text-ink-muted-48 text-center max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAction}
          className="flex min-h-11 items-center gap-2 rounded-full bg-prisma-blue px-5 py-2.5 text-[14px] font-normal tracking-[-0.2px] text-white transition-transform active:scale-95"
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      </div>
    </div>
  );

  return content;
}
