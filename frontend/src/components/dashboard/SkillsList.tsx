import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2 } from "lucide-react";
import type { Skill } from "@/lib/api";

interface SkillsListProps {
  skills: Skill[];
}

export function SkillsList({ skills }: SkillsListProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Agent Skills</CardTitle>
        <CardDescription>Capabilities currently loaded into your agent.</CardDescription>
      </CardHeader>
      <CardContent>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill.id} variant="secondary" className="px-3 py-1.5 text-sm gap-2">
                <Code2 className="h-3 w-3" />
                {skill.id}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No skills detected.</div>
        )}
      </CardContent>
    </Card>
  );
}
