"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { AuthNoticeState } from "@/features/auth/model/types";
import { cn } from "@/lib/utils";

const toneStyles = {
  error: "border-red-500/20 bg-red-500/8 text-red-700 dark:text-red-300",
  success: "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  info: "border-prisma-blue/20 bg-prisma-blue/8 text-prisma-blue dark:text-blue-300",
};

const toneIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function AuthNotice({ notice }: { notice: AuthNoticeState | null }) {
  return (
    <AnimatePresence mode="wait">
      {notice && (
        <motion.div
          key={`${notice.tone}:${notice.message}`}
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn("flex items-start gap-2.5 overflow-hidden rounded-xl border px-3.5 py-3 text-sm leading-5", toneStyles[notice.tone])}
        >
          {(() => {
            const Icon = toneIcons[notice.tone];
            return <Icon size={17} className="mt-0.5 shrink-0" aria-hidden />;
          })()}
          <span>{notice.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
