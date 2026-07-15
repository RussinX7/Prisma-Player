import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-black h-11">
      <div className="container-section h-full flex items-center justify-between px-5 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2">
            <Image
              src="/assets/logo.png"
              alt="Prisma Player"
              width={20}
              height={20}
              className="rounded-sm brightness-0 invert"
            />
            <span className="text-white text-xs font-semibold tracking-[-0.12px]">
              Prisma
            </span>
          </a>
          <div className="hidden md:flex items-center gap-5">
            {[
              ["Funcionalidades", "#features"],
              ["Planos", "#pricing"],
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
          <ThemeToggle />
          <a
            href="/login"
            className="text-white/80 hover:text-white text-xs tracking-[-0.12px] transition-colors hidden sm:block"
          >
            Login
          </a>
          <a
            href="#pricing"
            className="bg-prisma-blue hover:opacity-90 text-white text-xs tracking-[-0.12px] rounded-sm px-3.5 py-2 transition-all active:scale-95"
          >
            Comece seu teste grátis
          </a>
        </div>
      </div>
    </nav>
  );
}
