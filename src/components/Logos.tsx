const logos = [
  "Fórmula Negócio Online",
  "G4 Educação",
  "O Novo Mercado",
  "Método Venda Todo Santo Dia",
  "Mindvalley",
  "Rico na Internet",
];

export default function Logos() {
  return (
    <section className="py-12 bg-canvas-parchment border-y border-divider-soft">
      <div className="container-section max-w-[980px] mx-auto px-6">
        <p className="text-caption text-ink-muted-48 text-center mb-6 uppercase tracking-wider">
          Utilizado por empreendedores dos maiores players do mercado
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-ink-muted-48 text-sm font-medium tracking-[-0.12px] whitespace-nowrap"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
