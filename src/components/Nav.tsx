export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-black h-11">
      <div className="container-section h-full flex items-center justify-between px-5 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-6">
          <span className="text-white text-xs font-semibold tracking-[-0.12px]">
            Prisma
          </span>
          <div className="hidden md:flex items-center gap-5">
            {[
              "Funcionalidades",
              "Resultados",
              "Planos",
              "Parcerias",
              "Ajuda",
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="text-white/80 hover:text-white text-xs tracking-[-0.12px] transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#"
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
