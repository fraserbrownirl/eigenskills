"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Trash2,
  RefreshCw,
  Brain,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Database,
} from "lucide-react";
import {
  getLearnings,
  getMemory,
  deleteLearning,
  deleteMemory,
  LearningEntry,
  MemoryEntry,
} from "@/lib/api";

interface MemoryPanelProps {
  token: string;
  onError: (error: string | null) => void;
}

function LearningTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "LRN":
      return <Lightbulb className="h-4 w-4 text-blue-400" />;
    case "ERR":
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case "FEAT":
      return <Sparkles className="h-4 w-4 text-purple-400" />;
    default:
      return <Brain className="h-4 w-4 text-muted-foreground" />;
  }
}

function LearningTypeBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    LRN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    ERR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    FEAT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <Badge variant="outline" className={variants[type] ?? ""}>
      {type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isConfirmed = status === "confirmed" || status === "promoted";
  return (
    <Badge
      variant="outline"
      className={
        isConfirmed
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
      }
    >
      {status}
    </Badge>
  );
}

export function MemoryPanel({ token, onError }: MemoryPanelProps) {
  const [learnings, setLearnings] = useState<LearningEntry[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const [l, m] = await Promise.all([getLearnings(token), getMemory(token)]);
      setLearnings(l);
      setMemory(m);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load memory data");
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteLearning(entryId: string) {
    setDeleting(entryId);
    onError(null);
    try {
      await deleteLearning(token, entryId);
      setLearnings((prev) => prev.filter((l) => l.entryId !== entryId));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete learning");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteMemory(key: string) {
    setDeleting(`mem:${key}`);
    onError(null);
    try {
      await deleteMemory(token, key);
      setMemory((prev) => prev.filter((m) => m.key !== key));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete memory");
    } finally {
      setDeleting(null);
    }
  }

  const confirmedCount = learnings.filter(
    (l) => l.status === "confirmed" || l.status === "promoted"
  ).length;
  const pendingCount = learnings.filter((l) => l.status === "pending").length;

  if (loading) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading memory...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Memory Stats
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{learnings.length}</div>
              <div className="text-xs text-muted-foreground">Total Learnings</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{confirmedCount}</div>
              <div className="text-xs text-muted-foreground">Confirmed</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{memory.length}</div>
              <div className="text-xs text-muted-foreground">Memory Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learnings Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Learnings
          </CardTitle>
          <CardDescription>
            Insights, errors, and feature requests logged by your agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learnings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No learnings recorded yet. Your agent will log insights as it works.
            </div>
          ) : (
            <div className="space-y-3">
              {learnings.map((learning) => (
                <div
                  key={learning.entryId}
                  className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <LearningTypeIcon type={learning.entryType} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <LearningTypeBadge type={learning.entryType} />
                      <StatusBadge status={learning.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(learning.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{learning.summary}</p>
                    {learning.content && learning.content !== learning.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {learning.content}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {learning.entryId}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteLearning(learning.entryId)}
                    disabled={deleting === learning.entryId}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    title="Delete learning"
                  >
                    {deleting === learning.entryId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Entries Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Memory Entries
          </CardTitle>
          <CardDescription>
            Long-term knowledge stored by your agent that survives session resets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No memory entries yet. Your agent will save important information here.
            </div>
          ) : (
            <div className="space-y-3">
              {memory.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <Database className="h-4 w-4 mt-0.5 text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground">
                        {entry.key}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {entry.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMemory(entry.key)}
                    disabled={deleting === `mem:${entry.key}`}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    title="Delete memory entry"
                  >
                    {deleting === `mem:${entry.key}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
