"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillCard } from "./SkillCard";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillCatalogEntry } from "@/lib/api";

interface SkillsPanelProps {
  skills: SkillCatalogEntry[];
  onMissingVarClick?: (varName: string) => void;
}

interface DomainConfig {
  label: string;
  description: string;
}

const DOMAIN_CONFIG: Record<string, DomainConfig> = {
  defi: {
    label: "DeFi",
    description: "Lending, swaps, pools, token prices",
  },
  social: {
    label: "Social",
    description: "Twitter search, post, lookup",
  },
  ai: {
    label: "AI",
    description: "LLM access via Anthropic, Google, OpenAI",
  },
  identity: {
    label: "Identity",
    description: "ENS names, wallet validation",
  },
  "text-tools": {
    label: "Text Tools",
    description: "Summarize, translate, humanize",
  },
};

function getSkillDomain(skillId: string): string {
  if (
    skillId.startsWith("paytoll-aave-") ||
    skillId.startsWith("paytoll-swap-") ||
    skillId.startsWith("paytoll-search-pools") ||
    skillId.startsWith("paytoll-trending-pools") ||
    skillId.startsWith("paytoll-crypto-price") ||
    skillId.startsWith("paytoll-onchain-") ||
    skillId.startsWith("paytoll-token-balance")
  ) {
    return "defi";
  }
  if (skillId.startsWith("paytoll-twitter-")) {
    return "social";
  }
  if (skillId.startsWith("paytoll-llm-")) {
    return "ai";
  }
  if (skillId.startsWith("paytoll-ens-") || skillId === "paytoll-wallet-validator") {
    return "identity";
  }
  if (
    skillId === "humanize-ai-text" ||
    skillId === "summarize-text" ||
    skillId === "translate-text"
  ) {
    return "text-tools";
  }
  return "other";
}

function groupSkillsByDomain(skills: SkillCatalogEntry[]): Map<string, SkillCatalogEntry[]> {
  const groups = new Map<string, SkillCatalogEntry[]>();

  for (const skill of skills) {
    const domain = getSkillDomain(skill.id);
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(skill);
  }

  return groups;
}

interface DomainGroupProps {
  domain: string;
  skills: SkillCatalogEntry[];
  onMissingVarClick?: (varName: string) => void;
}

function DomainGroup({ domain, skills, onMissingVarClick }: DomainGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const config = DOMAIN_CONFIG[domain] ?? { label: domain, description: "" };
  const enabledCount = skills.filter((s) => s.status === "enabled").length;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{config.label}</span>
          <span className="text-sm text-muted-foreground">{config.description}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {enabledCount}/{skills.length} enabled
          </span>
        </div>
      </button>

      <div
        className={cn(
          "grid gap-3 p-3 transition-all",
          expanded ? "grid-cols-1 md:grid-cols-2" : "hidden"
        )}
      >
        {skills
          .sort((a, b) => {
            if (a.status === "enabled" && b.status !== "enabled") return -1;
            if (a.status !== "enabled" && b.status === "enabled") return 1;
            return a.id.localeCompare(b.id);
          })
          .map((skill) => (
            <SkillCard key={skill.id} skill={skill} onMissingVarClick={onMissingVarClick} />
          ))}
      </div>
    </div>
  );
}

export function SkillsPanel({ skills, onMissingVarClick }: SkillsPanelProps) {
  const enabledSkills = skills.filter((s) => s.status === "enabled");
  const disabledSkills = skills.filter((s) => s.status === "disabled");
  const groupedSkills = groupSkillsByDomain(skills);

  const domainOrder = ["defi", "social", "ai", "identity", "text-tools", "other"];
  const sortedDomains = [...groupedSkills.keys()].sort(
    (a, b) => domainOrder.indexOf(a) - domainOrder.indexOf(b)
  );

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Skills Catalog</CardTitle>
        <CardDescription>
          Available skills organized by domain.{" "}
          {enabledSkills.length > 0 && (
            <span className="text-emerald-500">{enabledSkills.length} enabled</span>
          )}
          {enabledSkills.length > 0 && disabledSkills.length > 0 && ", "}
          {disabledSkills.length > 0 && (
            <span className="text-amber-500">
              {disabledSkills.length} disabled (missing env vars)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {skills.length > 0 ? (
          <div className="space-y-4">
            {sortedDomains.map((domain) => (
              <DomainGroup
                key={domain}
                domain={domain}
                skills={groupedSkills.get(domain)!}
                onMissingVarClick={onMissingVarClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No skills available in the registry.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
