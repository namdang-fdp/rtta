import type { Metadata } from "next"

import { NotesPage } from "@/components/notes/notes-page"

export const metadata: Metadata = {
  title: "Meeting notes · RTTA Web",
  description: "Persisted timestamp-linked research notes for an RTTA meeting.",
}

export default async function MeetingNotesRoute({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  return <NotesPage meetingId={meetingId} />
}
