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
    <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex min-h-9 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border
              ${
                isActive
                  ? "bg-[#B9FF66] text-[#191A23] font-bold border-black/5 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:text-[#191A23] hover:bg-slate-50"
              }
            `}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  text-[10px] px-2 py-0.5 rounded-full font-bold
                  ${isActive ? "bg-[#191A23] text-[#B9FF66]" : "bg-slate-100 text-slate-700"}
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
