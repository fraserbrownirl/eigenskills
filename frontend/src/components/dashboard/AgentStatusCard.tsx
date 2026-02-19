import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trash2, Loader2, Activity, Server, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentStatusCardProps {
  agent: any; // Using any for now as I don't have the full type definition handy
  address: string;
  actionLoading: string | null;
  onAction: (action: "stop" | "start" | "terminate") => void;
  onTerminateClick: () => void;
}

export function AgentStatusCard({ agent, address, actionLoading, onAction, onTerminateClick }: AgentStatusCardProps) {
  const isRunning = agent.status === "running";
  const isStopped = agent.status === "stopped";
  const isTerminated = agent.status === "terminated";

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">{agent.name}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{address.slice(0, 6)}...{address.slice(-4)}</span>
            {agent.persona && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {agent.persona.slice(0, 20)}...
              </span>
            )}
          </CardDescription>
        </div>
        <Badge 
          variant={isRunning ? "success" : isStopped ? "warning" : "destructive"}
          className={cn(
            "px-3 py-1 text-sm capitalize",
            isRunning && "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20",
            isStopped && "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20",
            isTerminated && "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20"
          )}
        >
          {agent.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              Health
            </div>
            <div className="font-medium text-foreground">
              {agent.healthy ? "Healthy" : "Unhealthy"}
            </div>
          </div>
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Globe className="h-4 w-4" />
              Instance IP
            </div>
            <div className="font-mono text-sm text-foreground">
              {agent.instanceIp || "N/A"}
            </div>
          </div>
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Server className="h-4 w-4" />
              Runtime
            </div>
            <div className="font-medium text-foreground">
              EigenCompute TEE
            </div>
          </div>
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Shield className="h-4 w-4" />
              Security
            </div>
            <div className="font-medium text-foreground">
              Intel TDX
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 p-4">
        {isRunning ? (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => onAction("stop")}
            disabled={!!actionLoading}
          >
            {actionLoading === "stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
            Stop Agent
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => onAction("start")}
            disabled={!!actionLoading || isTerminated}
          >
            {actionLoading === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start Agent
          </Button>
        )}
        
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onTerminateClick}
          disabled={!!actionLoading || isTerminated}
        >
          {actionLoading === "terminate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Terminate
        </Button>
      </CardFooter>
    </Card>
  );
}
