"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Code2, ChevronDown, ChevronUp, Key, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillCatalogEntry } from "@/lib/api";

interface SkillCardProps {
  skill: SkillCatalogEntry;
  onMissingVarClick?: (varName: string) => void;
}

export function SkillCard({ skill, onMissingVarClick }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isEnabled = skill.status === "enabled";
  const hasX402 = skill.x402?.enabled;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-all hover:border-border/80",
        !isEnabled && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "rounded-md p-1.5",
              isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Code2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">{skill.id}</h3>
            <span className="text-xs text-muted-foreground">v{skill.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasX402 && (
            <Badge
              variant="outline"
              className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
              title={`~$${skill.x402!.costPerCall}/call on ${skill.x402!.network}`}
            >
              <Coins className="h-3 w-3" />
              {skill.x402!.currency}
            </Badge>
          )}
          <Badge
            variant={isEnabled ? "success" : "warning"}
            className={cn(
              "text-xs",
              isEnabled
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                : "bg-amber-500/15 text-amber-500 border-amber-500/20"
            )}
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </div>

      <p className={cn("mt-3 text-sm text-muted-foreground", !expanded && "line-clamp-2")}>
        {skill.description}
      </p>

      {skill.description.length > 100 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show more
            </>
          )}
        </button>
      )}

      {skill.requiresEnv.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Key className="h-3 w-3" />
            Required Environment Variables
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skill.requiresEnv.map((envVar) => {
              const isMissing = skill.missingEnvVars.includes(envVar);
              return (
                <Badge
                  key={envVar}
                  variant="secondary"
                  className={cn(
                    "text-xs font-mono cursor-default",
                    isMissing &&
                      "bg-destructive/15 text-destructive border-destructive/20 cursor-pointer hover:bg-destructive/25"
                  )}
                  onClick={
                    isMissing && onMissingVarClick ? () => onMissingVarClick(envVar) : undefined
                  }
                  title={isMissing ? `Click to add ${envVar} in Settings` : undefined}
                >
                  {envVar}
                  {isMissing && " (missing)"}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {hasX402 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Coins className="h-3 w-3" />
            <span>
              ~${skill.x402!.costPerCall}/call in {skill.x402!.currency} on {skill.x402!.network}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
