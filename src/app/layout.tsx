import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeScript from "@/components/ThemeScript";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://prisma-player.vercel.app").replace(/\/$/, "");

export const metadata: Metadata = {
  title: {
    default: "Player de VSL para aumentar conversões | Prisma Player",
    template: "%s | Prisma Player",
  },
  description:
    "Publique, personalize e otimize suas VSLs com analytics de retenção, testes A/B, proteção, automações e inteligência para aumentar conversões.",
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
  openGraph: {
    title: "Player de VSL para aumentar conversões | Prisma Player",
    description:
      "Analytics, testes A/B, proteção e inteligência para transformar sua VSL em uma operação de conversão.",
    url: siteUrl,
    siteName: "Prisma Player",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Prisma Player",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Player de VSL para aumentar conversões | Prisma Player",
    description:
      "Analytics, testes A/B, proteção e inteligência para transformar sua VSL em uma operação de conversão.",
    images: ["/opengraph-image"],
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
                "Player de vídeo para publicar, personalizar, proteger e otimizar VSLs com dados de conversão.",
              url: siteUrl,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "BRL",
                description: "Teste gratuito de 14 dias",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col"><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
