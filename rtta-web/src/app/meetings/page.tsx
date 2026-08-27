import type { Metadata } from "next"

import { MeetingHistoryPage } from "@/components/meeting/meeting-history-page"

export const metadata: Metadata = {
  title: "Cuộc họp · RTTA",
  description: "Lịch sử các cuộc họp nghiên cứu đã lưu trong RTTA.",
}

export default function MeetingsRoute() {
  return <MeetingHistoryPage />
}
