"use client"

import Link from "next/link"
import { useDeferredValue, useState } from "react"
import { AlertCircle, Bookmark, FileText, LoaderCircle, NotebookPen, Search, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NoteComposerSheet } from "@/components/notes/note-composer-sheet"
import { ConceptExplanationPanel } from "@/components/context/concept-explanation-panel"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useConceptExplanation } from "@/hooks/use-concept-explanation"
import { useTranscriptHistory } from "@/hooks/use-transcript-history"
import { useMeetingBookmarks } from "@/hooks/use-meeting-bookmarks"
import { useMeetingNotes } from "@/hooks/use-meeting-notes"
import { formatOffset } from "@/lib/format"
import { cn } from "@/lib/utils"

interface TranscriptPageProps {
  meetingId?: string
}

const statusLabel = {
  LIVE: "Đang diễn ra",
  COMPLETED: "Đã kết thúc",
  FAILED: "Bị gián đoạn",
} as const

export function TranscriptPage({ meetingId }: TranscriptPageProps) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim())
  const history = useTranscriptHistory(meetingId, deferredQuery)
  const bookmarks = useMeetingBookmarks(history.resolvedMeetingId)
  const notes = useMeetingNotes(history.resolvedMeetingId)
  const explanation = useConceptExplanation()

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b px-4 py-5 sm:px-6 md:px-8 xl:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {history.meeting ? (
                <Badge variant="outline" className="text-primary">
                  {statusLabel[history.meeting.status]}
                </Badge>
              ) : null}
              <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {history.meeting
                  ? `${history.meeting.sourceLanguage} → ${history.meeting.targetLanguage}`
                  : "Meeting archive"}
              </span>
            </div>
            <h1 className="editorial-title truncate text-[clamp(1.65rem,3vw,2.7rem)] font-bold leading-tight">
              {history.meeting?.title ?? "Transcript"}
            </h1>
            {history.meeting ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {history.meeting.transcriptUtteranceCount.toLocaleString()} finalized utterances
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search English or Vietnamese…"
                className="h-10 rounded-full bg-muted pl-9"
                aria-label="Search transcript"
                disabled={!history.meeting}
              />
            </label>
            <Link href="/" className="text-center text-sm font-medium text-primary hover:underline">
              Live workspace
            </Link>
          </div>
        </div>
      </header>

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-8 xl:px-10">
        <div className="mx-auto max-w-4xl space-y-10 pb-24" aria-live="polite">
          {bookmarks.error ? (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{bookmarks.error}</span>
              <Button variant="ghost" size="sm" onClick={bookmarks.clearError}>Dismiss</Button>
            </div>
          ) : null}
          {notes.error ? (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{notes.error}</span>
              <Button variant="ghost" size="sm" onClick={notes.clearError}>Dismiss</Button>
            </div>
          ) : null}
          {history.loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin text-primary" />
              Loading transcript…
            </div>
          ) : history.error ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-5 py-12 text-center">
              <AlertCircle className="mx-auto mb-4 size-7 text-destructive" />
              <h2 className="font-serif text-xl font-bold">Transcript unavailable</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{history.error}</p>
            </div>
          ) : history.utterances.length ? (
            <>
              {history.utterances.map((utterance) => (
                <article
                  key={utterance.id}
                  className="group grid gap-4 border-b border-border/55 pb-9 sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-6"
                >
                  <div className="flex items-center gap-2 text-xs sm:flex-col sm:items-end sm:gap-1 sm:pt-1 sm:text-right">
                    <span className="font-mono text-muted-foreground">{formatOffset(utterance.offsetMs)}</span>
                    <span className="font-medium text-foreground">Speaker</span>
                  </div>

                  <div className="relative min-w-0 space-y-3">
                    <p
                      lang="vi"
                      data-language-priority="primary"
                      className="reading-column text-[clamp(1.08rem,1.8vw,1.35rem)] font-medium leading-[1.65]"
                    >
                      {utterance.translatedText}
                    </p>
                    <div className="rounded-lg border-l-2 border-primary/20 bg-surface-soft px-4 py-3">
                      <p
                        lang="en"
                        data-language-priority="secondary"
                        className="text-sm italic leading-relaxed text-muted-foreground sm:text-[0.95rem]"
                      >
                        {utterance.sourceText}
                      </p>
                    </div>
                    {notes.noteByUtteranceId[utterance.id] ? (
                      <div className="flex items-start gap-2 rounded-lg bg-secondary/55 px-3 py-2.5 text-sm text-secondary-foreground">
                        <NotebookPen className="mt-0.5 size-4 shrink-0" />
                        <span>{notes.noteByUtteranceId[utterance.id].content}</span>
                      </div>
                    ) : null}

                    <div className="flex gap-1 sm:absolute sm:-right-1 sm:top-0 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void bookmarks.toggle({ id: utterance.id, offsetMs: utterance.offsetMs })}
                        disabled={bookmarks.pendingIds.has(utterance.id)}
                        aria-label={bookmarks.bookmarkedIds.has(utterance.id) ? "Remove bookmark" : "Bookmark utterance"}
                        aria-pressed={bookmarks.bookmarkedIds.has(utterance.id)}
                        className={bookmarks.bookmarkedIds.has(utterance.id) ? "bg-accent text-primary" : "text-muted-foreground"}
                      >
                        <Bookmark className={cn(bookmarks.bookmarkedIds.has(utterance.id) && "fill-current")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!history.resolvedMeetingId || notes.saving}
                        aria-label={notes.notedIds.has(utterance.id) ? "Edit research note" : "Add research note"}
                        className={notes.notedIds.has(utterance.id) ? "bg-accent text-primary" : "text-muted-foreground"}
                        onClick={() => history.resolvedMeetingId && notes.open({
                          meetingId: history.resolvedMeetingId,
                          utteranceId: utterance.id,
                          sourceText: utterance.sourceText,
                          translatedText: utterance.translatedText,
                          offsetMs: utterance.offsetMs,
                        })}
                      >
                        <NotebookPen />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!history.resolvedMeetingId}
                        aria-label="Explain a concept from this utterance"
                        onClick={() => history.resolvedMeetingId && explanation.open({
                          meetingId: history.resolvedMeetingId,
                          utteranceId: utterance.id,
                          sourceText: utterance.sourceText,
                          translatedText: utterance.translatedText,
                          offsetMs: utterance.offsetMs,
                        })}
                      >
                        <Sparkles />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}

              {history.hasMore ? (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => void history.loadMore()} disabled={history.loadingMore}>
                    {history.loadingMore ? <LoaderCircle className="animate-spin" /> : null}
                    Load earlier transcript
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <FileText className="mx-auto mb-4 size-7 text-primary" />
              <h2 className="font-serif text-xl font-bold">
                {history.meeting
                  ? deferredQuery ? "No matching moments" : "No finalized transcript yet"
                  : "No meetings yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {history.meeting
                  ? deferredQuery
                    ? "Try a different scientific term or phrase."
                    : "Final translations will appear here even when the web workspace is closed."
                  : "Start capture from the RTTA extension to create the first meeting."}
              </p>
            </div>
          )}
        </div>
      </div>

      <NoteComposerSheet
        key={notes.target?.utteranceId ?? "closed"}
        target={notes.target}
        initialDraft={notes.target ? notes.noteByUtteranceId[notes.target.utteranceId]?.content : ""}
        saving={notes.saving}
        onClose={notes.close}
        onSave={(content) => void notes.saveTarget(content)}
      />

      <Sheet open={Boolean(explanation.target)} onOpenChange={(open) => !open && explanation.close()}>
        <SheetContent side="right" showCloseButton={false} className="w-[min(94vw,470px)] gap-0 p-0 sm:max-w-[470px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Concept explanation</SheetTitle>
            <SheetDescription>Contextual Vietnamese explanation for a selected scientific term.</SheetDescription>
          </SheetHeader>
          <ConceptExplanationPanel controller={explanation} onClose={explanation.close} />
        </SheetContent>
      </Sheet>
    </section>
  )
}
