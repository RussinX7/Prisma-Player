import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-black h-11">
      <div className="container-section h-full flex items-center justify-between px-5 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Prisma Player">
            <BrandLogo className="h-[26px] w-[132px]" priority darkSurface />
          </Link>
          <div className="hidden md:flex items-center gap-5">
            {[
              ["Funcionalidades", "#features"],
              ["Parcerias", "#"],
              ["Ajuda", "#"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-white/80 hover:text-white text-xs tracking-[-0.12px] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle onDarkSurface />
          <a
            href="/login"
            className="text-white/80 hover:text-white text-xs tracking-[-0.12px] transition-colors hidden sm:block"
          >
            Login
          </a>
          <a
            href="/signup"
            className="bg-prisma-blue hover:opacity-90 text-white text-xs tracking-[-0.12px] rounded-sm px-3.5 py-2 transition-all active:scale-95"
          >
            Comece seu teste grátis
          </a>
        </div>
      </div>
    </nav>
  );
}
