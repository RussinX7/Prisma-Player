"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { AuthNoticeState } from "@/features/auth/model/types";
import { cn } from "@/lib/utils";

const toneStyles = {
  error: "border-2 border-[#191A23] bg-red-100 text-red-900 shadow-[2px_2px_0px_#191A23]",
  success: "border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]",
  info: "border-2 border-[#191A23] bg-white text-[#191A23] shadow-[2px_2px_0px_#191A23]",
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
          className={cn("flex items-start gap-3 overflow-hidden rounded-2xl p-4 text-xs font-bold leading-relaxed", toneStyles[notice.tone])}
        >
          {(() => {
            const Icon = toneIcons[notice.tone];
            return <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />;
          })()}
          <span>{notice.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
