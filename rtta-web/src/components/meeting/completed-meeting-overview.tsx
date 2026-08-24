"use client"

import Link from "next/link"
import {
  AlertCircle, Bookmark, CalendarCheck, Clock3, FileText, Languages,
  LoaderCircle, NotebookPen, PlayCircle, Sparkles,
} from "lucide-react"

import { MarkdownContent } from "@/components/ai/markdown-content"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMeetingBookmarks } from "@/hooks/use-meeting-bookmarks"
import { useMeetingNotes } from "@/hooks/use-meeting-notes"
import { useMeetingSelection } from "@/hooks/use-meeting-selection"
import { useMeetingSummary } from "@/hooks/use-meeting-summary"
import { formatOffset } from "@/lib/format"

export function CompletedMeetingOverview({ meetingId }: { meetingId?: string }) {
  const selection = useMeetingSelection(meetingId)
  const bookmarks = useMeetingBookmarks(selection.resolvedMeetingId)
  const notes = useMeetingNotes(selection.resolvedMeetingId)
  const summary = useMeetingSummary(selection.resolvedMeetingId)

  if (selection.loading) return <StatusMessage icon={<LoaderCircle className="animate-spin" />} title="Loading meeting…" />
  if (selection.error) return <StatusMessage icon={<AlertCircle />} title="Meeting unavailable" detail={selection.error} />
  if (!selection.meeting || !selection.resolvedMeetingId) {
    return <StatusMessage icon={<CalendarCheck />} title="No persisted meetings yet" detail="Start capture from the RTTA extension to create a meeting." />
  }

  const meeting = selection.meeting
  const id = selection.resolvedMeetingId
  const durationMs = meeting.endedAt
    ? Math.max(0, Date.parse(meeting.endedAt) - Date.parse(meeting.startedAt))
    : null

  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-6xl pb-20">
        <header className="mb-10 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-muted-foreground">
            <CalendarCheck className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Persisted research meeting</span>
            <Badge variant="outline" className="ml-1 text-primary">{meeting.status}</Badge>
          </div>
          <h1 className="editorial-title text-[clamp(2.15rem,5vw,3.75rem)] font-bold leading-[1.12]">{meeting.title}</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled title="No recording is stored for this meeting yet"><PlayCircle />Replay audio</Button>
            <Button asChild variant="outline"><Link href={`/meetings/${id}/transcript`}><FileText />Full transcript</Link></Button>
            <Button asChild variant="ghost"><Link href={`/meetings/${id}/notes`}><NotebookPen />Research notes</Link></Button>
          </div>
        </header>

        {(summary.error || bookmarks.error || notes.error) ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{summary.error ?? bookmarks.error ?? notes.error}</span>
          </div>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface-soft p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary"><Sparkles className="size-4" /></span>
                  <div>
                    <h2 className="editorial-title text-2xl">Research summary</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Generated only when you request it.</p>
                  </div>
                </div>
                <Button onClick={() => void summary.generate()} disabled={summary.generating || meeting.status === "LIVE"}>
                  {summary.generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                  {summary.summary ? "Generate new version" : "Generate Summary"}
                </Button>
              </div>
              {summary.loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin" />Loading persisted summary…</div>
              ) : summary.summary ? (
                <>
                  <MarkdownContent markdown={summary.summary.summaryMarkdown} className="p-6 sm:p-8" />
                  <p className="border-t px-6 py-4 text-xs text-muted-foreground">
                    {summary.summary.model} · saved {new Date(summary.summary.createdAt).toLocaleString()}
                  </p>
                </>
              ) : (
                <div className="p-10 text-center">
                  <Sparkles className="mx-auto mb-3 size-6 text-primary/60" />
                  <p className="font-medium">No summary has been generated</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">RTTA will synthesize the persisted transcript, giving extra weight to your bookmarks and research notes.</p>
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-6 sm:p-8">
              <h2 className="editorial-title mb-6 text-2xl">Bookmarked moments</h2>
              {bookmarks.bookmarks.length ? (
                <div className="space-y-6">
                  {bookmarks.bookmarks.map((item) => (
                    <article key={item.id} className="flex gap-4">
                      <Bookmark className="mt-1 size-5 shrink-0 text-primary/65" />
                      <div>
                        {item.translatedText ? <p lang="vi" className="font-serif text-lg leading-relaxed">{item.translatedText}</p> : null}
                        {item.sourceText ? <p lang="en" className="mt-2 text-sm italic leading-relaxed text-muted-foreground">{item.sourceText}</p> : null}
                        {item.label ? <p className="mt-2 text-sm font-medium">{item.label}</p> : null}
                        <span className="mt-3 inline-block rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{formatOffset(item.offsetMs ?? 0)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No bookmarked moments for this meeting.</p>}
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-xl border bg-surface-soft p-6">
              <div className="mb-5 flex items-center gap-3"><NotebookPen className="size-5 text-primary" /><h2 className="editorial-title text-2xl">Questions / Follow-up Thoughts</h2></div>
              {notes.notes.length ? (
                <ul className="space-y-4">
                  {notes.notes.map((note) => (
                    <li key={note.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <p className="text-sm leading-relaxed">{note.content}</p>
                      <span className="mt-2 block font-mono text-[0.7rem] text-muted-foreground">{note.offsetMs === null ? "Meeting note" : formatOffset(note.offsetMs)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm leading-relaxed text-muted-foreground">No research notes yet.</p>}
            </section>

            <section className="rounded-xl border bg-card p-6">
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Meeting metadata</h2>
              <dl className="space-y-4 text-sm">
                <MetadataRow icon={<Clock3 />} term="Duration" value={durationMs === null ? "In progress" : formatDuration(durationMs)} />
                <MetadataRow icon={<Languages />} term="Language" value={`${meeting.sourceLanguage} → ${meeting.targetLanguage}`} />
                <MetadataRow icon={<FileText />} term="Final utterances" value={String(meeting.transcriptUtteranceCount)} />
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </section>
  )
}

function MetadataRow({ icon, term, value }: { icon: React.ReactNode; term: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><dt className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">{icon}{term}</dt><dd className="text-right font-medium">{value}</dd></div>
}

function StatusMessage({ icon, title, detail }: { icon: React.ReactNode; title: string; detail?: string }) {
  return <section className="flex h-full items-center justify-center px-6"><div className="max-w-md text-center text-muted-foreground [&_svg]:mx-auto [&_svg]:mb-4 [&_svg]:size-7"><span>{icon}</span><h1 className="editorial-title text-2xl font-bold text-foreground">{title}</h1>{detail ? <p className="mt-3 text-sm leading-relaxed">{detail}</p> : null}</div></section>
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.round(milliseconds / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}
