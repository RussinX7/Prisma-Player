import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface AuthFieldProps extends ComponentProps<typeof Input> {
  label: string;
  hint?: string;
  trailing?: ReactNode;
}

export function AuthField({ label, hint, trailing, className, id, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between gap-4">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-[#191A23]">
          {label}
        </label>
        {trailing}
      </div>
      <Input
        id={id}
        className={cn(
          "h-12 rounded-2xl border-2 border-[#191A23] bg-white px-4 text-sm font-medium text-[#191A23] shadow-[3px_3px_0px_#191A23] transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-[#B9FF66]/20 placeholder:text-[#191A23]/50",
          className,
        )}
        {...props}
      />
      {hint && <p className="text-xs font-medium text-[#191A23]/70">{hint}</p>}
    </div>
  );
}
