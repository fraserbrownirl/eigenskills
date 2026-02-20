import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ContainerLogsProps {
  logs: string;
  loading: boolean;
  onRefresh: () => void;
}

export function ContainerLogs({ logs, loading, onRefresh }: ContainerLogsProps) {
  const lines = logs ? logs.split("\n") : [];
  return (
    <Card className="border-border bg-card shadow-sm h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Live logs from the TEE container.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-700">
          {lines.length > 0 ? (
            lines.map((log, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap border-b border-slate-200 py-1 last:border-0"
              >
                {log}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">No logs available.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
