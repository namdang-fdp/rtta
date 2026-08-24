import type { Metadata } from "next"

import { TranscriptPage } from "@/components/transcript/transcript-page"

export const metadata: Metadata = {
  title: "Transcript · RTTA Web",
  description: "Future transcript workspace for English to Vietnamese research meetings.",
}

export default function TranscriptRoute() {
  return <TranscriptPage />
}
