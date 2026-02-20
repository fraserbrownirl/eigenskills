import { cn } from "@/lib/utils";
import Image from "next/image";

export function SealLogo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center", className)}>
      <Image
        src="/images/skillseal_logo.png"
        alt="SkillSeal"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  );
}
