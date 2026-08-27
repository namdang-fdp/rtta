import type { Metadata } from "next"

import { TranscriptPage } from "@/components/transcript/transcript-page"

export const metadata: Metadata = {
  title: "Bản ghi cuộc họp · RTTA",
  description: "Bản ghi song ngữ của cuộc họp nghiên cứu.",
}

export default async function MeetingTranscriptRoute({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  return <TranscriptPage meetingId={meetingId} />
}
