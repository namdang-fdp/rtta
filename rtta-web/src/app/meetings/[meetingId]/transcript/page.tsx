import type { Metadata } from "next"

import { TranscriptPage } from "@/components/transcript/transcript-page"

export const metadata: Metadata = {
  title: "Meeting transcript · RTTA Web",
  description: "Persisted English-to-Vietnamese research meeting transcript.",
}

export default async function MeetingTranscriptRoute({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  return <TranscriptPage meetingId={meetingId} />
}
