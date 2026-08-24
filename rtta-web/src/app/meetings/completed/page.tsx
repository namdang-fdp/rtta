import type { Metadata } from "next"

import { CompletedMeetingOverview } from "@/components/meeting/completed-meeting-overview"

export const metadata: Metadata = {
  title: "Completed Meeting · RTTA Web",
  description: "Future completed-meeting research artifact for RTTA Web.",
}

export default function CompletedMeetingRoute() {
  return <CompletedMeetingOverview />
}
