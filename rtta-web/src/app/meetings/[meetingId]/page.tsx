import type { Metadata } from "next"

import { CompletedMeetingOverview } from "@/components/meeting/completed-meeting-overview"

export const metadata: Metadata = {
  title: "Meeting · RTTA Web",
  description: "Persisted RTTA research meeting workspace.",
}

export default async function MeetingRoute({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  return <CompletedMeetingOverview meetingId={meetingId} />
}
