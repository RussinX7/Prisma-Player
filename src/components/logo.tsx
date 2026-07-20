import type React from "react";
import Image from "next/image";

export const LogoIcon = (props: React.ComponentProps<"div">) => (
  <div className="relative size-6 select-none shrink-0" {...props}>
    <Image 
      src="/assets/logo.png" 
      alt="Prisma Icon" 
      fill 
      sizes="24px"
      priority 
      className="object-contain" 
    />
  </div>
);

export const Logo = (props: React.ComponentProps<"div">) => (
  <div className="flex items-center gap-2 select-none" {...props}>
    <div className="relative h-8 w-[154px] shrink-0">
      <Image 
        src="/assets/logo.png" 
        alt="Prisma Player" 
        fill 
        sizes="154px"
        priority 
        className="object-contain" 
      />
    </div>
  </div>
);
