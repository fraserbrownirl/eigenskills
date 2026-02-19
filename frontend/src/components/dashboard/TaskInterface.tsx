import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { submitTask } from "@/lib/api";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

interface TaskInterfaceProps {
  token: string;
  canSubmit: boolean;
  onError: (error: string) => void;
}

export function TaskInterface({ token, canSubmit, onError }: TaskInterfaceProps) {
  const [task, setTask] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

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
      <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl h-full">
        <CardHeader>
          <CardTitle>Submit Task</CardTitle>
          <CardDescription>
            Send instructions to your agent. It will execute them securely in the TEE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g., Analyze the sentiment of the latest Ethereum news..."
            className="min-h-[200px] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            disabled={!canSubmit || submitting}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || submitting || !task.trim()}
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Task
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>
            Output from your agent's execution.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {result ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Execution Successful</span>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
              
              {result.signatures && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Verifiable Signature</span>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-400">
                    {result.signatures[0] || "No signature returned"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              <p>No result yet. Submit a task to see output.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
