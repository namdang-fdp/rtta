"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CircleAlert, CircleStop, Clock3, LoaderCircle, Mic, PlugZap, RadioTower, WifiOff, X } from "lucide-react"

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
import { useMeetingRecordings } from "@/hooks/use-meeting-recordings"
import { useMediaQuery } from "@/hooks/use-media-query"
import { formatElapsed } from "@/lib/format"
import type { LiveMeetingState, TranslationUtterance } from "@/types/live"

export function LiveWorkspace() {
  const { setFollowLive, clearError, ...state } = useLiveMeeting()
  const explanation = useConceptExplanation()
  const bookmarks = useMeetingBookmarks(state.activeMeetingId)
  const notes = useMeetingNotes(state.activeMeetingId)
  const recordings = useMeetingRecordings(state.activeMeetingId)
  const useDockedConceptPanel = useMediaQuery("(min-width: 1500px)")

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
        recordingActive={Boolean(recordings.activeRecording)}
        recordingPending={recordings.pending}
        onRecordingToggle={() => void (recordings.activeRecording ? recordings.stop() : recordings.start())}
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
              bookmarked: bookmarks.bookmarkedIds.has(utterance.utteranceId),
              noteContent: notes.noteByUtteranceId[utterance.utteranceId]?.content ?? null,
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
        bookmarkError={bookmarks.error ?? notes.error ?? recordings.error}
        clearBookmarkError={() => {
          bookmarks.clearError()
          notes.clearError()
          recordings.clearError()
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
  recordingActive: boolean
  recordingPending: boolean
  onRecordingToggle: () => void
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
  recordingActive,
  recordingPending,
  onRecordingToggle,
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
        <LiveHeader
          state={state}
          elapsed={elapsed}
          recordingActive={recordingActive}
          recordingPending={recordingPending}
          onRecordingToggle={onRecordingToggle}
        />

        {state.lastError ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive/7 px-4 py-2.5 text-sm text-destructive md:px-8">
            <CircleAlert className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{state.lastError}</span>
            <Button variant="ghost" size="icon-xs" onClick={clearError} aria-label="Đóng thông báo lỗi">
              <X />
            </Button>
          </div>
        ) : null}

        {bookmarkError ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive/7 px-4 py-2.5 text-sm text-destructive md:px-8">
            <CircleAlert className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{bookmarkError}</span>
            <Button variant="ghost" size="icon-xs" onClick={clearBookmarkError} aria-label="Đóng thông báo">
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
              <strong className="font-medium text-foreground">Kết nối dịch trực tiếp bị gián đoạn.</strong>{" "}
              {state.connectionState === "reconnecting"
                ? "RTTA đang thử kết nối lại…"
                : "Vui lòng làm mới trang để kết nối lại."}
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
        <aside className="hidden h-full w-[520px] shrink-0 bg-surface-canvas p-3 pl-0 min-[1500px]:block">
          <ConceptExplanationPanel
            controller={explanationController}
            onClose={closeExplanation}
            compactHeader
            className="surface-panel overflow-hidden"
          />
        </aside>
      ) : null}

      {!dockExplanation ? (
        <Sheet open={explanationOpen} onOpenChange={(open) => !open && closeExplanation()}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(96vw,540px)] gap-0 p-0 sm:max-w-[540px]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Giải thích đoạn này</SheetTitle>
              <SheetDescription>Lịch sử hỏi đáp bằng tiếng Việt gắn với đoạn bản ghi đã chọn.</SheetDescription>
            </SheetHeader>
            <ConceptExplanationPanel controller={explanationController} onClose={closeExplanation} />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}

function LiveHeader({
  state,
  elapsed,
  recordingActive,
  recordingPending,
  onRecordingToggle,
}: {
  state: LiveMeetingState
  elapsed: string
  recordingActive: boolean
  recordingPending: boolean
  onRecordingToggle: () => void
}) {
  const live = state.sessionState === "live"
  const interrupted = state.connectionState === "reconnecting" || state.connectionState === "disconnected"

  return (
    <>
      <header className="shrink-0 border-b bg-background/92 px-4 py-4 backdrop-blur-md sm:px-6 md:px-8 md:py-5 xl:px-10">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="editorial-title truncate text-[clamp(1.45rem,2.7vw,2.35rem)] font-bold leading-tight">
              {live ? "Cuộc họp nghiên cứu" : "RTTA Trực tiếp"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground sm:text-sm">
              {live ? (
                <span className={`inline-flex items-center gap-2 font-medium ${interrupted ? "text-muted-foreground" : "text-primary"}`}>
                  <span className={`size-2 rounded-full ${interrupted ? "bg-muted-foreground" : "bg-primary"}`} />
                  {state.connectionState === "reconnecting"
                    ? "Đang kết nối lại…"
                    : state.connectionState === "disconnected"
                      ? "Mất kết nối"
                      : "Trực tiếp"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-success" />
                  Sẵn sàng
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
          {live ? (
            <Button
              variant={recordingActive ? "destructive" : "outline"}
              size="sm"
              onClick={onRecordingToggle}
              disabled={recordingPending || interrupted || !state.activeMeetingId}
              aria-label={recordingActive ? "Dừng ghi âm cuộc họp" : "Bắt đầu ghi âm cuộc họp"}
            >
              {recordingPending ? <LoaderCircle className="animate-spin" /> : recordingActive ? <CircleStop /> : <Mic />}
              {recordingActive ? "Dừng ghi âm" : "Ghi âm"}
            </Button>
          ) : (
            <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-surface-soft px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <RadioTower className="size-3.5" />Nghe tiếng Anh · đọc tiếng Việt
            </div>
          )}
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
        eyebrow="Chuẩn bị dịch trực tiếp"
        title="Đang kết nối với RTTA…"
        description="Không gian làm việc sẽ sẵn sàng sau ít phút."
      />
    )
  }

  if (reconnecting || disconnected) {
    return (
      <CenteredState
        icon={<WifiOff className="size-6" />}
        eyebrow="Kết nối bị gián đoạn"
        title="Mất kết nối dịch trực tiếp"
        description={
          reconnecting
            ? "RTTA đang thử kết nối lại. Bạn có thể giữ nguyên trang này."
            : "RTTA chưa thể kết nối lại. Vui lòng làm mới trang."
        }
      />
    )
  }

  if (state.sessionState === "stopped") {
    return (
      <CenteredState
        icon={<RadioTower className="size-6" />}
        eyebrow="Cuộc họp đã kết thúc"
        title="Đã hoàn tất bản dịch"
        description="Xem lại tóm tắt, bản ghi, ghi chú và tài liệu của cuộc họp vừa kết thúc."
      >
        {state.lastMeetingId ? (
          <Button asChild className="mt-6">
            <Link href={`/meetings/${state.lastMeetingId}`}>Xem tổng quan cuộc họp</Link>
          </Button>
        ) : null}
      </CenteredState>
    )
  }

  return (
    <CenteredState
      icon={<RadioTower className="size-6" />}
      eyebrow="Đang chờ cuộc họp"
      title="Sẵn sàng cho cuộc họp"
      description="Bắt đầu từ tiện ích RTTA và tiến hành dịch. Trang này sẽ tự động kết nối."
    />
  )
}

function CenteredState({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  description: string
  children?: React.ReactNode
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
        {children}
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
