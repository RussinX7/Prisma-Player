import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Logos from "@/components/Logos";
import Testimonials from "@/components/Testimonials";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "O que é o Prisma Player?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Prisma Player é um player de vídeo focado em conversão de vendas. Ele aumenta a play rate, o engajamento e a taxa de conversão de VSLs, webinários e CPLs.",
                },
              },
              {
                "@type": "Question",
                name: "Como o Prisma Player aumenta a conversão?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Através de recursos como Headlines AI, Smart Autoplay, Turbo Playback, Mini-Gancho e Thumbnail de Recuperação, que trabalham juntos para manter a audiência engajada até o final do vídeo.",
                },
              },
              {
                "@type": "Question",
                name: "O Prisma Player tem limite de players?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Não. Os planos Pro e Enterprise não têm limite de players. Você pode criar quantos players quiser.",
                },
              },
              {
                "@type": "Question",
                name: "Quanto custa o Prisma Player?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "O plano Essential custa R$ 49/mês, o Pro custa R$ 99/mês, e o Enterprise é sob consulta. Todos incluem 14 dias de teste grátis.",
                },
              },
            ],
          }),
        }}
      />
      <Nav />
      <main className="flex-1">
        <Hero />
        <Logos />
        <Testimonials />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
