import type { Metadata } from "next"

import { ResearchContextPage } from "@/components/context/research-context-page"

export const metadata: Metadata = {
  title: "Tài liệu nghiên cứu · RTTA",
  description: "Paper, slide và tài liệu giúp RTTA giải thích sát với cuộc họp.",
}

export default async function MeetingContextRoute({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  return <ResearchContextPage meetingId={meetingId} />
}
