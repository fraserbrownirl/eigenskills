import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Terminal, List, Activity, Settings, Code } from "lucide-react";

type TabType = "task" | "skills" | "history" | "logs" | "settings";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: "task", label: "Task", icon: Terminal },
    { id: "skills", label: "Skills", icon: Code },
    { id: "history", label: "History", icon: List },
    { id: "logs", label: "Logs", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "gap-2",
              activeTab === tab.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
