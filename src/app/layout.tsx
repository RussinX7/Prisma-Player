import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeScript from "@/components/ThemeScript";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

const siteUrl = "https://prismaplayer.com.br";

export const metadata: Metadata = {
  title: {
    default: "Prisma Player — O player de vídeo que transforma viewers em customers",
    template: "%s | Prisma Player",
  },
  description:
    "Prisma Player é o player de vídeo focado em conversão. Aumente sua play rate, engajamento e vendas com recursos inteligentes como Headlines AI, Smart Autoplay e Turbo Playback.",
  keywords: [
    "player de vídeo",
    "conversão de vendas",
    "VSL",
    "video sales letter",
    "aumentar conversão",
    "player VSL",
    "otimização de vídeo",
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Prisma Player — O player de vídeo que vende mais",
    description:
      "Transforme qualquer vídeo em uma máquina de vendas. Teste grátis por 14 dias.",
    url: siteUrl,
    siteName: "Prisma Player",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prisma Player",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prisma Player — Vídeo que vende",
    description:
      "Transforme qualquer vídeo em uma máquina de vendas. Teste grátis por 14 dias.",
    images: ["/assets/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
        <link rel="canonical" href={siteUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Prisma Player",
              applicationCategory: "Multimedia",
              operatingSystem: "Web",
              description:
                "Player de vídeo focado em conversão de vendas. Aumente play rate, engajamento e vendas.",
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
