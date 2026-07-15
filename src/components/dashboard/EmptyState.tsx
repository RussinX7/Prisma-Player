"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel = "Adicionar primeiro vídeo",
  actionHref,
  onAction,
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center py-16 px-6">
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
      <h3 className="text-[22px] font-semibold tracking-[-0.35px] themeable-text-ink mb-2">
        {title}
      </h3>
      <p className="text-[15px] tracking-[-0.224px] themeable-text-ink-muted-48 text-center max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onAction}
          className="flex items-center gap-2 bg-prisma-blue text-white rounded-full px-5 py-2.5 text-[14px] font-medium tracking-[-0.2px] transition-all hover:opacity-90 active:scale-[0.97]"
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      </div>
    </div>
  );

  if (actionHref) {
    return <Link href={actionHref}>{content}</Link>;
  }

  return content;
}
