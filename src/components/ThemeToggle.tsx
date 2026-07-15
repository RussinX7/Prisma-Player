"use client";

import { useSyncExternalStore } from "react";

interface ThemeToggleProps {
  onDarkSurface?: boolean;
}

function subscribe(callback: () => void) {
  window.addEventListener("prisma-theme-change", callback);
  return () => window.removeEventListener("prisma-theme-change", callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export default function ThemeToggle({ onDarkSurface = false }: ThemeToggleProps) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("prisma-theme-change"));
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95 ${
        onDarkSurface
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "themeable-bg-surface-pearl themeable-text-ink-muted-48"
      }`}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M6.34 17.66l-1.41 1.41" />
          <path d="M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
