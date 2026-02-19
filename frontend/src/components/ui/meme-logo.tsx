import { cn } from "@/lib/utils";

export function MemeLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-red-600 shadow-lg shadow-orange-500/20",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-white drop-shadow-md"
      >
        {/* Stylized Lobster Claw */}
        <path
          d="M6.5 19C6.5 12 9.5 4 15 4C17.5 4 19.5 5.5 19.5 8C19.5 9.5 18.5 10.5 17 10.5C16 10.5 15.5 10 15 9.5C13.5 9.5 11.5 11 11.5 14.5C11.5 16 12 17.5 12.5 19H6.5Z"
          fill="currentColor"
        />
        <path
          d="M14.5 19C14.5 16.5 15.5 13.5 18 13.5C19.5 13.5 20.5 14.5 20.5 16.5C20.5 18 19.5 19 19.5 19H14.5Z"
          fill="currentColor"
        />
        {/* Shine effect */}
        <path
          d="M15 5C13 5 11 8 10 12"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="opacity-40"
        />
      </svg>
      {/* Pixel/Glitch overlay for "meme" feel */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-30" />
    </div>
  );
}
