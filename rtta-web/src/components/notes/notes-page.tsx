"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertCircle, ArrowLeft, Clock3, FileText, LoaderCircle, NotebookPen, Pencil, Save, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMeetingNotes } from "@/hooks/use-meeting-notes"
import { useMeetingSelection } from "@/hooks/use-meeting-selection"
import { formatOffset } from "@/lib/format"

interface NotesPageProps {
  meetingId?: string
}

export function NotesPage({ meetingId }: NotesPageProps) {
  const selection = useMeetingSelection(meetingId)
  const notes = useMeetingNotes(selection.resolvedMeetingId)
  const [generalDraft, setGeneralDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)

  const addGeneralNote = async () => {
    if (await notes.addGeneral(generalDraft)) setGeneralDraft("")
  }

  const saveEdit = async (noteId: string) => {
    if (await notes.edit(noteId, editDraft)) {
      setEditingId(null)
      setEditDraft("")
    }
  }

  if (selection.loading) {
    return (
      <CenteredMessage icon={<LoaderCircle className="size-6 animate-spin" />} title="Loading research notes…" />
    )
  }

  if (selection.error) {
    return (
      <CenteredMessage
        icon={<AlertCircle className="size-6" />}
        title="Notes unavailable"
        description={selection.error}
      />
    )
  }

  if (!selection.meeting || !selection.resolvedMeetingId) {
    return (
      <CenteredMessage
        icon={<NotebookPen className="size-6" />}
        title="No meetings yet"
        description="Start capture from the RTTA extension before creating meeting-context notes."
      />
    )
  }

  const transcriptHref = `/meetings/${selection.resolvedMeetingId}/transcript`

  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-border pb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-primary">{selection.meeting.status}</Badge>
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {selection.meeting.sourceLanguage} → {selection.meeting.targetLanguage}
            </span>
          </div>
          <h1 className="editorial-title text-[clamp(2rem,5vw,3.35rem)] font-bold">Research Notes</h1>
          <p className="mt-2 text-lg font-medium">{selection.meeting.title}</p>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Notes remain attached to this meeting and, when captured from a transcript moment, preserve its bilingual context.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={transcriptHref}><FileText />View transcript</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/"><ArrowLeft />Live workspace</Link>
            </Button>
          </div>
        </header>

        {notes.error ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{notes.error}</span>
            <Button variant="ghost" size="sm" onClick={notes.clearError}>Dismiss</Button>
          </div>
        ) : null}

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {notes.notes.length ? notes.notes.map((note) => (
              <article key={note.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  <span>{note.offsetMs === null ? "Meeting note" : formatOffset(note.offsetMs)}</span>
                  {note.utteranceId ? <Badge variant="secondary">Transcript linked</Badge> : null}
                </div>

                {note.translatedText ? (
                  <div className="mb-4 rounded-lg border-l-2 border-primary/25 bg-surface-soft px-4 py-3">
                    <p lang="vi" className="font-medium leading-relaxed">{note.translatedText}</p>
                    {note.sourceText ? (
                      <p lang="en" className="mt-2 text-sm leading-relaxed text-muted-foreground">{note.sourceText}</p>
                    ) : null}
                  </div>
                ) : null}

                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      className="min-h-28"
                      aria-label="Edit research note"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditingId(null)}><X />Cancel</Button>
                      <Button
                        onClick={() => void saveEdit(note.id)}
                        disabled={notes.saving || !editDraft.trim()}
                      >
                        {notes.saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <div className="mt-4 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(note.id)
                          setEditDraft(note.content)
                          setDeleteCandidate(null)
                        }}
                      >
                        <Pencil />Edit
                      </Button>
                      <Button
                        variant={deleteCandidate === note.id ? "destructive" : "ghost"}
                        size="sm"
                        disabled={notes.saving}
                        onClick={() => {
                          if (deleteCandidate === note.id) {
                            void notes.remove(note.id)
                            setDeleteCandidate(null)
                          } else {
                            setDeleteCandidate(note.id)
                          }
                        }}
                      >
                        <Trash2 />{deleteCandidate === note.id ? "Confirm delete" : "Delete"}
                      </Button>
                    </div>
                  </>
                )}
              </article>
            )) : (
              <div className="rounded-xl border border-dashed bg-surface-soft/45 px-6 py-14 text-center">
                <NotebookPen className="mx-auto mb-4 size-7 text-primary" />
                <h2 className="editorial-title text-2xl font-bold">No notes for this meeting</h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  Add one here, or use the note action beside a finalized Live or Transcript utterance.
                </p>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-xl border bg-surface-soft/45 p-5">
            <div className="flex items-center gap-2 text-primary">
              <NotebookPen className="size-4" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Meeting-level note</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Capture a thought about the meeting as a whole. For timestamp context, add the note from Live or Transcript.
            </p>
            <Textarea
              value={generalDraft}
              onChange={(event) => setGeneralDraft(event.target.value)}
              placeholder="What should you remember?"
              className="mt-4 min-h-32 bg-background"
              aria-label="New meeting-level note"
            />
            <Button
              className="mt-3 w-full"
              onClick={() => void addGeneralNote()}
              disabled={notes.saving || !generalDraft.trim()}
            >
              {notes.saving ? <LoaderCircle className="animate-spin" /> : <NotebookPen />}
              Save note
            </Button>
          </aside>
        </div>
      </div>
    </section>
  )
}

function CenteredMessage({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <section className="flex h-full items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent text-primary">{icon}</div>
        <h1 className="editorial-title text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  )
}
