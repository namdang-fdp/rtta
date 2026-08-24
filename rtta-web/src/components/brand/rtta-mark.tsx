import Image from "next/image"

import { cn } from "@/lib/utils"

export function RttaMark({ className }: { className?: string }) {
  return (
    <Image
      src="/rtta-mark.svg"
      width={128}
      height={128}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0", className)}
      priority
    />
  )
}
