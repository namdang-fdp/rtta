"use client"

import { ArrowDown, Bookmark, Brain, CircleDot, Clock3, NotebookPen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAutoFollow } from "@/hooks/use-auto-follow"
import { formatOffset } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TranslationUtterance } from "@/types/live"

interface LiveTranslationSurfaceProps {
  recentFinals: TranslationUtterance[]
  currentPartial: TranslationUtterance | null
  followLive: boolean
  onFollowLiveChange: (followLive: boolean) => void
  bookmarkedIds: Set<string>
  pendingBookmarkIds: Set<string>
  notedIds: Set<string>
  notesSaving: boolean
  onBookmark: (utterance: TranslationUtterance) => void
  onNote: (utterance: TranslationUtterance) => void
  onExplain: (utterance: TranslationUtterance) => void
}

export function LiveTranslationSurface({
  recentFinals,
  currentPartial,
  followLive,
  onFollowLiveChange,
  bookmarkedIds,
  pendingBookmarkIds,
  notedIds,
  notesSaving,
  onBookmark,
  onNote,
  onExplain,
}: LiveTranslationSurfaceProps) {
  const contentVersion = `${recentFinals.at(-1)?.id ?? "empty"}:${currentPartial?.id ?? "listening"}`
  const { containerRef, endRef, jumpToLive } = useAutoFollow({
    followLive,
    onFollowLiveChange,
    contentVersion,
  })

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="quiet-scrollbar h-full overflow-y-auto px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10 xl:py-12"
        role="region"
        aria-label="Live English to Vietnamese translation"
        tabIndex={0}
        data-testid="live-scroll-container"
      >
        <div className="mx-auto max-w-3xl pb-32">
          {recentFinals.length === 0 && !currentPartial ? (
            <div className="mb-10 rounded-lg border border-dashed border-border bg-surface-soft/55 px-5 py-6 text-center">
              <p lang="vi" className="text-lg font-medium">Đang lắng nghe tiếng Anh…</p>
              <p lang="en" className="mt-1 text-sm text-muted-foreground">Listening for English speech…</p>
            </div>
          ) : null}

          <div className="space-y-8 md:space-y-10" aria-live="polite" aria-relevant="additions">
            {recentFinals.map((utterance) => (
              <FinalUtterance
                key={utterance.id}
                utterance={utterance}
                bookmarked={bookmarkedIds.has(utterance.id)}
                bookmarkPending={pendingBookmarkIds.has(utterance.id)}
                noted={notedIds.has(utterance.id)}
                notePending={notesSaving}
                onBookmark={() => onBookmark(utterance)}
                onNote={() => onNote(utterance)}
                onExplain={() => onExplain(utterance)}
              />
            ))}
          </div>

          <div className="relative mt-10 border-t border-border/70 pt-8" data-testid="partial-utterance">
            <div className="absolute -top-3 left-0 flex items-center gap-2 bg-background pr-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary">
              <CircleDot className="size-3.5" />
              Listening
            </div>
            <div className={cn("transition-opacity duration-200", currentPartial ? "opacity-70" : "opacity-45")}>
              <p
                lang="vi"
                data-language-priority="primary"
                className="reading-column text-[clamp(1.3rem,2.25vw,1.68rem)] font-semibold italic leading-[1.5] tracking-[-0.018em]"
              >
                {currentPartial?.translatedText || "Đang chờ lời nói tiếp theo…"}
              </p>
              <p
                lang="en"
                data-language-priority="secondary"
                className="reading-column mt-2 border-l-2 border-primary/15 pl-4 text-[clamp(0.92rem,1.2vw,1.02rem)] italic leading-relaxed text-muted-foreground"
              >
                {currentPartial?.sourceText || "Waiting for the next utterance…"}
              </p>
            </div>
          </div>
          <div ref={endRef} className="h-px" aria-hidden="true" />
        </div>
      </div>

      {!followLive ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <Button
            onClick={jumpToLive}
            className="pointer-events-auto h-11 rounded-full bg-foreground px-5 text-background shadow-lg hover:bg-foreground/88"
            aria-label="Jump to newest translation and resume auto-follow"
          >
            <ArrowDown className="size-4" />
            Jump to live
          </Button>
        </div>
      ) : null}
    </div>
  )
}

interface FinalUtteranceProps {
  utterance: TranslationUtterance
  bookmarked: boolean
  bookmarkPending: boolean
  noted: boolean
  notePending: boolean
  onBookmark: () => void
  onNote: () => void
  onExplain: () => void
}

function FinalUtterance({
  utterance,
  bookmarked,
  bookmarkPending,
  noted,
  notePending,
  onBookmark,
  onNote,
  onExplain,
}: FinalUtteranceProps) {
  return (
    <article className="group relative border-b border-border/55 pb-7 last:border-b-0" data-testid="final-utterance">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock3 className="size-3.5" />
        <span>{formatOffset(utterance.offsetMs)}</span>
        <span aria-hidden="true">·</span>
        <span>Meeting audio</span>
        {noted ? <span className="ml-auto text-primary">Research note</span> : null}
      </div>
      <p
        lang="vi"
        data-language-priority="primary"
        className="reading-column pr-0 text-[clamp(1.25rem,2.1vw,1.6rem)] font-semibold leading-[1.48] tracking-[-0.018em] md:pr-32"
      >
        {utterance.translatedText}
      </p>
      <p
        lang="en"
        data-language-priority="secondary"
        className="reading-column mt-2 border-l-2 border-primary/16 pl-4 text-[clamp(0.92rem,1.2vw,1.03rem)] leading-relaxed text-muted-foreground"
      >
        {utterance.sourceText}
      </p>

      <div className="mt-4 flex items-center gap-1 md:absolute md:right-0 md:top-7 md:mt-0 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBookmark}
          disabled={!utterance.utteranceId || bookmarkPending}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark utterance"}
          aria-pressed={bookmarked}
          className={bookmarked ? "bg-accent text-primary" : "text-muted-foreground"}
        >
          <Bookmark className={cn(bookmarked && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNote}
          disabled={!utterance.utteranceId || notePending}
          aria-label={noted ? "Edit research note" : "Add research note"}
          className={noted ? "bg-accent text-primary" : "text-muted-foreground"}
        >
          <NotebookPen />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExplain}
          disabled={!utterance.utteranceId}
          aria-label="Explain a concept from this utterance"
          className="text-muted-foreground"
        >
          <Brain />
        </Button>
      </div>
    </article>
  )
}
