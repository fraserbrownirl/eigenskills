"use client";

import { type Skill } from "@/lib/api";

interface SkillsListProps {
  skills: Skill[];
}

export function SkillsList({ skills }: SkillsListProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-lg font-bold text-white">Available Skills</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Skills your agent can use, filtered by your configured API keys.
      </p>

      {skills.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No skills available. Make sure you have the required API keys configured.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {skills.map((skill) => (
            <div key={skill.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-white">{skill.id}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{skill.description}</p>
                </div>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  v{skill.version}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {skill.requiresEnv.map((env) => (
                  <span
                    key={env}
                    className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400"
                  >
                    {env}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-zinc-600">
                Hash: {skill.contentHash.slice(0, 16)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
