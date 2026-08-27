import type { Metadata } from "next"

import { CompletedMeetingOverview } from "@/components/meeting/completed-meeting-overview"

export const metadata: Metadata = {
  title: "Tổng quan cuộc họp · RTTA",
  description: "Tổng quan cuộc họp nghiên cứu đã lưu trong RTTA.",
}

export default async function MeetingRoute({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  return <CompletedMeetingOverview meetingId={meetingId} />
}
