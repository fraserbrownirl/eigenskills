import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitTask, type TaskResult } from "@/lib/api";
import { Loader2, Send, CheckCircle2, Cpu, ShieldCheck, AlertTriangle } from "lucide-react";

interface TaskInterfaceProps {
  token: string;
  canSubmit: boolean;
  agentStartingUp?: boolean;
  healthy?: boolean;
  onError: (error: string) => void;
}

export function TaskInterface({
  token,
  canSubmit,
  agentStartingUp,
  healthy,
  onError,
}: TaskInterfaceProps) {
  const [task, setTask] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);

  async function handleSubmit() {
    if (!task.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await submitTask(token, task);
      setResult(res);
      setTask("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Task submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border bg-card shadow-sm h-full">
        <CardHeader>
          <CardTitle>Submit Task</CardTitle>
          <CardDescription>
            Your agent routes tasks to the best skill via EigenAI, then executes securely in the
            TEE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentStartingUp && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Agent is starting up. Waiting for instance IP...
            </div>
          )}
          {!agentStartingUp && canSubmit && !healthy && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Agent health check pending — you can still submit tasks.
            </div>
          )}
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., Analyze the sentiment of the latest Ethereum news..."
            className="min-h-[200px] w-full resize-none rounded-lg border border-border bg-secondary/50 p-4 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            disabled={!canSubmit || submitting}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || !task.trim()}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Task
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border bg-card shadow-sm h-full flex flex-col">
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>Output from your agent&apos;s execution.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {result ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Execution Successful</span>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                  {result.result}
                </pre>
              </div>

              {result.skillsUsed.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Skills Used
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.skillsUsed.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(result.agentSignature || result.routingSignature) && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Verifiable Signatures
                    </span>
                  </div>
                  {result.agentSignature && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">
                        Agent
                      </span>
                      <p className="mt-0.5 break-all font-mono text-xs text-foreground/70">
                        {result.agentSignature}
                      </p>
                    </div>
                  )}
                  {result.routingSignature && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">
                        Routing
                      </span>
                      <p className="mt-0.5 break-all font-mono text-xs text-foreground/70">
                        {result.routingSignature}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>No result yet. Submit a task to see output.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
