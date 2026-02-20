import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2 } from "lucide-react";

interface TerminateConfirmationProps {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TerminateConfirmation({
  loading,
  onCancel,
  onConfirm,
}: TerminateConfirmationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-destructive/50 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle className="text-xl">Terminate Agent?</CardTitle>
          </div>
          <CardDescription>
            This action cannot be undone. This will permanently delete your agent instance and all
            its data.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Terminate Agent
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
