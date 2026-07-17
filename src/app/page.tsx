import Nav from "@/features/marketing/components/Nav";
import Hero from "@/features/marketing/components/Hero";
import Logos from "@/features/marketing/components/Logos";
import Testimonials from "@/features/marketing/components/Testimonials";
import Features from "@/features/marketing/components/Features";
import CTA from "@/features/marketing/components/CTA";
import Footer from "@/features/marketing/components/Footer";

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
        <CTA />
      </main>
      <Footer />
    </>
  );
}
