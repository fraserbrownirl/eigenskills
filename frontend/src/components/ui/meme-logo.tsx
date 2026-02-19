import { cn } from "@/lib/utils";

export function MemeLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25",
        className
      )}
    >
      <span className="text-lg leading-none select-none" role="img" aria-label="EigenSkills logo">
        🦞
      </span>
    </div>
  );
}
