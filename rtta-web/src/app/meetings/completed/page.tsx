import type { Metadata } from "next"

import { CompletedMeetingOverview } from "@/components/meeting/completed-meeting-overview"

export const metadata: Metadata = {
  title: "Completed Meeting · RTTA Web",
  description: "Latest persisted RTTA research meeting.",
}

export default function CompletedMeetingRoute() {
  return <CompletedMeetingOverview />
}
