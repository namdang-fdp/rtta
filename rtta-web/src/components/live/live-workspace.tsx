"use client"

import { useEffect, useState } from "react"
import { CircleAlert, Clock3, PlugZap, RadioTower, WifiOff, X } from "lucide-react"

import { ConceptExplanationPanel } from "@/components/context/concept-explanation-panel"
import { LiveTranslationSurface } from "@/components/live/live-translation-surface"
import { NoteComposerSheet } from "@/components/notes/note-composer-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useLiveMeeting } from "@/hooks/use-live-meeting"
import { useConceptExplanation } from "@/hooks/use-concept-explanation"
import { useMeetingBookmarks } from "@/hooks/use-meeting-bookmarks"
import { useMeetingNotes } from "@/hooks/use-meeting-notes"
import { useMediaQuery } from "@/hooks/use-media-query"
import { formatElapsed } from "@/lib/format"
import type { LiveMeetingState, TranslationUtterance } from "@/types/live"

export function LiveWorkspace() {
  const { setFollowLive, clearError, ...state } = useLiveMeeting()
  const explanation = useConceptExplanation()
  const bookmarks = useMeetingBookmarks(state.activeMeetingId)
  const notes = useMeetingNotes(state.activeMeetingId)
  const useDockedConceptPanel = useMediaQuery("(min-width: 1320px)")

  return (
    <>
      <LiveWorkspaceView
        state={state}
        setFollowLive={setFollowLive}
        clearError={clearError}
        bookmarkedIds={bookmarks.bookmarkedIds}
        pendingBookmarkIds={bookmarks.pendingIds}
        notedIds={notes.notedIds}
        notesSaving={notes.saving}
        onBookmark={(utterance) => {
          if (utterance.utteranceId) {
            void bookmarks.toggle({ id: utterance.utteranceId, offsetMs: utterance.offsetMs })
          }
        }}
        onNote={(utterance) => {
          if (state.activeMeetingId && utterance.utteranceId) {
            notes.open({
              meetingId: state.activeMeetingId,
              utteranceId: utterance.utteranceId,
              sourceText: utterance.sourceText,
              translatedText: utterance.translatedText,
              offsetMs: utterance.offsetMs,
            })
          }
        }}
        onExplain={(utterance) => {
          if (state.activeMeetingId && utterance.utteranceId) {
            explanation.open({
              meetingId: state.activeMeetingId,
              utteranceId: utterance.utteranceId,
              sourceText: utterance.sourceText,
              translatedText: utterance.translatedText,
              offsetMs: utterance.offsetMs,
            })
          }
        }}
        explanationOpen={Boolean(explanation.target)}
        dockExplanation={useDockedConceptPanel}
        closeExplanation={explanation.close}
        explanationController={explanation}
        bookmarkError={bookmarks.error ?? notes.error}
        clearBookmarkError={() => {
          bookmarks.clearError()
          notes.clearError()
        }}
      />

      <NoteComposerSheet
        key={notes.target?.utteranceId ?? "closed"}
        target={notes.target}
        initialDraft={notes.target ? notes.noteByUtteranceId[notes.target.utteranceId]?.content : ""}
        saving={notes.saving}
        onClose={notes.close}
        onSave={(content) => void notes.saveTarget(content)}
      />
    </>
  )
}

interface LiveWorkspaceViewProps {
  state: LiveMeetingState
  setFollowLive: (followLive: boolean) => void
  clearError: () => void
  bookmarkedIds: Set<string>
  pendingBookmarkIds: Set<string>
  notedIds: Set<string>
  notesSaving: boolean
  onBookmark: (utterance: TranslationUtterance) => void
  onNote: (utterance: TranslationUtterance) => void
  onExplain: (utterance: TranslationUtterance) => void
  explanationOpen: boolean
  dockExplanation: boolean
  closeExplanation: () => void
  explanationController: ReturnType<typeof useConceptExplanation>
  bookmarkError: string | null
  clearBookmarkError: () => void
}

export function LiveWorkspaceView({
  state,
  setFollowLive,
  clearError,
  bookmarkedIds,
  pendingBookmarkIds,
  notedIds,
  notesSaving,
  onBookmark,
  onNote,
  onExplain,
  explanationOpen,
  dockExplanation,
  closeExplanation,
  explanationController,
  bookmarkError,
  clearBookmarkError,
}: LiveWorkspaceViewProps) {
  const elapsed = useMeetingElapsed(state.sessionStartedAt, state.sessionState === "live")
  const showLiveCanvas = state.sessionState === "live"
  const connectionInterrupted = showLiveCanvas && (
    state.connectionState === "reconnecting" || state.connectionState === "disconnected"
  )

  return (
    <div className="flex h-full min-h-0 bg-background">
      <section className="flex min-w-0 flex-1 flex-col">
        <LiveHeader state={state} elapsed={elapsed} />

        {state.lastError ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive/7 px-4 py-2.5 text-sm text-destructive md:px-8">
            <CircleAlert className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{state.lastError}</span>
            <Button variant="ghost" size="icon-xs" onClick={clearError} aria-label="Dismiss error">
              <X />
            </Button>
          </div>
        ) : null}

        {bookmarkError ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive/7 px-4 py-2.5 text-sm text-destructive md:px-8">
            <CircleAlert className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{bookmarkError}</span>
            <Button variant="ghost" size="icon-xs" onClick={clearBookmarkError} aria-label="Dismiss bookmark error">
              <X />
            </Button>
          </div>
        ) : null}

        {connectionInterrupted ? (
          <div
            className="flex shrink-0 items-center gap-3 border-b bg-muted/65 px-4 py-2.5 text-sm text-muted-foreground md:px-8"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="size-4 shrink-0 text-primary" />
            <span>
              <strong className="font-medium text-foreground">Translation connection lost.</strong>{" "}
              {state.connectionState === "reconnecting"
                ? "Trying to reconnect…"
                : "Check that the Spring service is running, then refresh this page."}
            </span>
          </div>
        ) : null}

        {showLiveCanvas ? (
          <LiveTranslationSurface
            recentFinals={state.recentFinals}
            currentPartial={state.currentPartial}
            followLive={state.followLive}
            onFollowLiveChange={setFollowLive}
            bookmarkedIds={bookmarkedIds}
            pendingBookmarkIds={pendingBookmarkIds}
            notedIds={notedIds}
            notesSaving={notesSaving}
            onBookmark={onBookmark}
            onNote={onNote}
            onExplain={onExplain}
          />
        ) : (
          <ConnectionStateSurface state={state} />
        )}
      </section>

      {explanationOpen && dockExplanation ? (
        <aside className="hidden h-full w-[400px] shrink-0 border-l min-[1320px]:block">
          <ConceptExplanationPanel controller={explanationController} onClose={closeExplanation} compactHeader />
        </aside>
      ) : null}

      {!dockExplanation ? (
        <Sheet open={explanationOpen} onOpenChange={(open) => !open && closeExplanation()}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(94vw,450px)] gap-0 p-0 sm:max-w-[450px]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Concept explanation</SheetTitle>
              <SheetDescription>Contextual Vietnamese explanation for a selected scientific term.</SheetDescription>
            </SheetHeader>
            <ConceptExplanationPanel controller={explanationController} onClose={closeExplanation} />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}

function LiveHeader({ state, elapsed }: { state: LiveMeetingState; elapsed: string }) {
  const live = state.sessionState === "live"
  const interrupted = state.connectionState === "reconnecting" || state.connectionState === "disconnected"

  return (
    <>
      <header className="shrink-0 border-b bg-background/92 px-4 py-4 backdrop-blur-md sm:px-6 md:px-8 md:py-5 xl:px-10">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="editorial-title truncate text-[clamp(1.45rem,2.7vw,2.35rem)] font-bold leading-tight">
              {live ? "Quantum Physics Seminar" : "RTTA Live"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground sm:text-sm">
              {live ? (
                <span className={`inline-flex items-center gap-2 font-medium ${interrupted ? "text-muted-foreground" : "text-primary"}`}>
                  <span className={`size-2 rounded-full ${interrupted ? "bg-muted-foreground" : "bg-primary"}`} />
                  {state.connectionState === "reconnecting"
                    ? "Reconnecting…"
                    : state.connectionState === "disconnected"
                      ? "Connection lost"
                      : "Live"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-success" />
                  Ready
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-medium">EN → VI</span>
              {live ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[0.78rem]">
                    <Clock3 className="size-3.5" />
                    {elapsed}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border bg-surface-soft px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <RadioTower className="size-3.5" />
            English speech · Vietnamese reading
          </div>
        </div>
      </header>
      <div className="h-[3px] shrink-0 bg-muted">
        <div className={`h-full transition-all duration-500 ${live && !interrupted ? "w-full bg-success" : "w-0 bg-success"}`} />
      </div>
    </>
  )
}

function ConnectionStateSurface({ state }: { state: LiveMeetingState }) {
  const reconnecting = state.connectionState === "reconnecting"
  const disconnected = state.connectionState === "disconnected"
  const connecting = state.connectionState === "connecting"

  if (connecting) {
    return (
      <CenteredState
        icon={<PlugZap className="size-6" />}
        eyebrow="Preparing live translation"
        title="Connecting to RTTA…"
        description="The workspace will be ready as soon as the local translation service responds."
      />
    )
  }

  if (reconnecting || disconnected) {
    return (
      <CenteredState
        icon={<WifiOff className="size-6" />}
        eyebrow="Connection interrupted"
        title="Translation connection lost"
        description={
          reconnecting
            ? "Trying to reconnect… You can keep this workspace open."
            : "RTTA could not reconnect. Check that the Spring service is running, then refresh this page."
        }
      />
    )
  }

  if (state.sessionState === "stopped") {
    return (
      <CenteredState
        icon={<RadioTower className="size-6" />}
        eyebrow="Meeting ended"
        title="Translation session complete"
        description="RTTA is ready to attach automatically when you begin the next meeting."
      />
    )
  }

  return (
    <CenteredState
      icon={<RadioTower className="size-6" />}
      eyebrow="Waiting for meeting"
      title="Ready for your meeting"
      description="Start the RTTA extension and begin translation. This page will attach automatically."
    />
  )
}

function CenteredState({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-primary/20 bg-accent/55 text-primary">
          {icon}
        </div>
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        <h2 className="editorial-title text-[clamp(1.75rem,4vw,2.65rem)] font-bold">{title}</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      </div>
    </div>
  )
}

function useMeetingElapsed(startedAt: string | null, running: boolean): string {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [running, startedAt])

  return formatElapsed(startedAt, now)
}
