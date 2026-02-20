"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillCard } from "./SkillCard";
import type { SkillCatalogEntry } from "@/lib/api";

interface SkillsPanelProps {
  skills: SkillCatalogEntry[];
  onMissingVarClick?: (varName: string) => void;
}

export function SkillsPanel({ skills, onMissingVarClick }: SkillsPanelProps) {
  const enabledSkills = skills.filter((s) => s.status === "enabled");
  const disabledSkills = skills.filter((s) => s.status === "disabled");

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Skills Catalog</CardTitle>
        <CardDescription>
          All available skills from the registry.{" "}
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
          <div className="grid gap-4 md:grid-cols-2">
            {enabledSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onMissingVarClick={onMissingVarClick} />
            ))}
            {disabledSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onMissingVarClick={onMissingVarClick} />
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
