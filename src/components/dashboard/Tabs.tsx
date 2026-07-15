"use client";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex gap-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium tracking-[-0.2px] transition-all active:scale-[0.97]
              ${
                isActive
                  ? "bg-prisma-blue text-white shadow-sm"
                  : "themeable-text-ink-muted-48 hover:themeable-bg-surface-pearl hover:themeable-text-ink"
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`
                  text-[11px] px-1.5 py-0.5 rounded-full font-medium
                  ${isActive ? "bg-white/20 text-white" : "themeable-bg-surface-pearl themeable-text-ink-muted-48"}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
