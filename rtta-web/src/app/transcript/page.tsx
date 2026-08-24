import type { Metadata } from "next"

import { TranscriptPage } from "@/components/transcript/transcript-page"

export const metadata: Metadata = {
  title: "Transcript · RTTA Web",
  description: "Browse persisted English-to-Vietnamese research meeting transcripts.",
}

export default function TranscriptRoute() {
  return <TranscriptPage />
}
