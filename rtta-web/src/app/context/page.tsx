import type { Metadata } from "next"

import { ResearchContextPage } from "@/components/context/research-context-page"

export const metadata: Metadata = {
  title: "Research Context · RTTA Web",
  description: "Future research papers, slides, references, and terminology for the current RTTA meeting.",
}

export default function ContextRoute() {
  return <ResearchContextPage />
}
