import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
  darkSurface?: boolean;
}

export default function BrandLogo({
  className = "h-8 w-[154px]",
  priority = false,
  darkSurface = false,
}: BrandLogoProps) {
  return (
    <span
      className={`brand-logo-stack ${darkSurface ? "brand-logo-stack-dark" : ""} ${className}`}
      role="img"
      aria-label="Prisma Player"
    >
      <Image src="/assets/logo.png" alt="" fill sizes="246px" priority={priority} className="object-contain" />
      <Image
        src="/assets/logo.png"
        alt=""
        fill
        sizes="246px"
        priority={priority}
        aria-hidden="true"
        className="brand-logo-light-text object-contain"
      />
    </span>
  );
}
