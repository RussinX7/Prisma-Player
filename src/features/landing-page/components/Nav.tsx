"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Play } from "lucide-react";

interface NavProps {
  account?: { firstName: string } | null;
}

export default function Nav({ account }: NavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Serviços", href: "/services" },
    { name: "Sobre Nós", href: "/about" },
    { name: "Casos de Uso", href: "/#casos-de-uso" },
    { name: "Preços", href: "/#precos" },
    { name: "Como Funciona", href: "/#processo" },
    { name: "Depoimentos", href: "/#depoimentos" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#F3F3F3]/95 backdrop-blur-md border-b-2 border-[#191A23]/10 transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#191A23] text-[#B9FF66] shadow-[2px_2px_0px_#191A23] group-hover:scale-105 transition-transform">
              <Play className="h-5 w-5 fill-[#B9FF66] ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#191A23] font-sans">
                Prisma<span className="text-[#191A23] font-light">Player</span>
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-[#191A23]/60 uppercase -mt-1">
                VSL Tech
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-base font-medium text-[#191A23] hover:text-[#191A23] hover:bg-[#B9FF66] px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#191A23]"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {account ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] px-5 py-2.5 text-sm font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#191A23] transition-all"
              >
                Olá, {account.firstName} (Painel)
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-[#191A23] bg-white px-4 py-2 text-sm font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#191A23] transition-all"
                >
                  Entrar
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] px-5 py-2.5 text-sm font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#191A23] transition-all"
                >
                  Testar 14 Dias Grátis
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-xl border-2 border-[#191A23] bg-white p-2 text-[#191A23] shadow-[2px_2px_0px_#191A23]"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b-2 border-[#191A23] bg-[#F3F3F3] px-4 pt-4 pb-6 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-[#191A23]/20 bg-white px-4 py-3 text-base font-bold text-[#191A23]"
            >
              {link.name}
            </a>
          ))}
          <div className="pt-2 space-y-2">
            {account ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] py-3 text-base font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23]"
              >
                Acessar Painel ({account.firstName})
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border-2 border-[#191A23] bg-white py-3 text-base font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23]"
                >
                  Fazer Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] py-3 text-base font-bold text-[#191A23] shadow-[3px_3px_0px_#191A23]"
                >
                  Testar 14 Dias Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
