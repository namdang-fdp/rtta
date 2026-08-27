import type { Metadata } from "next"

import { NotesPage } from "@/components/notes/notes-page"

export const metadata: Metadata = {
  title: "Ghi chú cuộc họp · RTTA",
  description: "Ghi chú nghiên cứu gắn với cuộc họp và từng đoạn bản ghi.",
}

export default async function MeetingNotesRoute({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  return <NotesPage meetingId={meetingId} />
}
