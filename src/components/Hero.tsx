export default function Hero() {
  return (
    <section className="pt-28 pb-20 md:pt-32 md:pb-24 bg-canvas overflow-hidden">
      <div className="container-section text-center max-w-[980px] mx-auto px-6">
        <h1 className="text-hero mb-4 text-ink">
          Transforme qualquer vídeo
          <br />
          em uma <span className="text-prisma-blue">máquina de vendas</span>
        </h1>
        <p className="text-lead text-ink-muted-48 max-w-[700px] mx-auto mb-8">
          O Prisma Player é o único player de vídeo do mundo construído para um
          único propósito: fazer seu vídeo de vendas converter mais. VSLs,
          webinários, CPLs — todos vendem mais no Prisma.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="#pricing"
            className="bg-prisma-blue text-white text-[17px] font-normal leading-none rounded-pill px-[22px] py-[11px] inline-flex items-center justify-center transition-all active:scale-95 hover:opacity-90"
          >
            Comece seu teste grátis
          </a>
          <a
            href="#features"
            className="text-prisma-blue text-[17px] font-normal leading-none rounded-pill px-[22px] py-[11px] inline-flex items-center justify-center border border-prisma-blue transition-all active:scale-95 hover:bg-prisma-blue/5"
          >
            Ver funcionalidades
          </a>
        </div>
      </div>

      <div className="mt-16 max-w-[900px] mx-auto px-6">
        <div className="bg-gradient-to-b from-surface-tile-1 to-surface-black rounded-lg aspect-[16/9] w-full product-shadow flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white ml-0.5"
              >
                <path
                  d="M8 5.14V19.14L19 12.14L8 5.14Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <p className="text-body-muted text-sm">
              Veja o Prisma Player em ação
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
