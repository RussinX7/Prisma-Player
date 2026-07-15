import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Prisma Player — O player de vídeo que transforma viewers em customers",
  description:
    "Prisma Player é o player de vídeo focado em conversão. Aumente sua play rate, engajamento e vendas com recursos inteligentes de vídeo.",
  openGraph: {
    title: "Prisma Player — Vídeo que vende",
    description:
      "O player de vídeo que transforma viewers em customers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
