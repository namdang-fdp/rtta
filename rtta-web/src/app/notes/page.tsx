import type { Metadata } from "next"

import { NotesPage } from "@/components/notes/notes-page"

export const metadata: Metadata = {
  title: "Notes · RTTA Web",
  description: "Timestamp-linked research notes for RTTA meetings.",
}

export default function NotesRoute() {
  return <NotesPage />
}
