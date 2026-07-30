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
        <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
        {trailing}
      </div>
      <Input
        id={id}
        className={cn(
          "h-12 rounded-xl border-border bg-background px-3.5 text-[15px] shadow-none transition focus-visible:border-prisma-blue focus-visible:ring-2 focus-visible:ring-prisma-blue/18",
          className,
        )}
        {...props}
      />
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}
