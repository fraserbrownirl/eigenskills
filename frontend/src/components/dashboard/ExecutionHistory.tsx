import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface ExecutionHistoryProps {
  history: any[];
  onRefresh: () => void;
}

export function ExecutionHistory({ history, onRefresh }: ExecutionHistoryProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
        <CardDescription>
          Recent tasks performed by your agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="mt-1">
                  {item.status === "success" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{item.task || "Unknown Task"}</p>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">
                    {JSON.stringify(item.result)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No history available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
