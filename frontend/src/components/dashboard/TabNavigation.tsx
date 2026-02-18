"use client";

import type { TabType } from "@/hooks/useAgentPolling";

const TABS: TabType[] = ["task", "skills", "history", "logs", "settings"];

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
            activeTab === tab ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
