import type { Metadata } from "next"

import { ResearchContextPage } from "@/components/context/research-context-page"

export const metadata: Metadata = {
  title: "Research context · RTTA Web",
  description: "Meeting-scoped papers and slides for contextual RTTA explanations.",
}

export default async function MeetingContextRoute({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  return <ResearchContextPage meetingId={meetingId} />
}
