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
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-tight transition-all cursor-pointer border-2 border-[#191A23]
              ${
                isActive
                  ? "bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]"
                  : "bg-white text-[#191A23]/80 hover:text-[#191A23] hover:bg-[#B9FF66]/20 shadow-[1px_1px_0px_#191A23]"
              }
            `}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`
                  text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-[#191A23]
                  ${isActive ? "bg-[#191A23] text-[#B9FF66]" : "bg-[#F3F3F3] text-[#191A23]"}
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
