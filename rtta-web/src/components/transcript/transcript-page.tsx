"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Bookmark, FileText, NotebookPen, Play, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { demoTranscriptEntries } from "@/lib/demo/meeting"
import { cn } from "@/lib/utils"

export function TranscriptPage() {
  const [query, setQuery] = useState("")
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(["demo-1445"]))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const entries = useMemo(
    () => demoTranscriptEntries.filter((entry) =>
      !normalizedQuery || [entry.vi, entry.en, entry.speaker, entry.timestamp]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
    [normalizedQuery],
  )

  const toggleBookmark = (id: string) => {
    setBookmarks((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b px-4 py-5 sm:px-6 md:px-8 xl:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-primary">Demo transcript</Badge>
              <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Session 04</span>
            </div>
            <h1 className="editorial-title text-[clamp(1.65rem,3vw,2.7rem)] font-bold leading-tight">
              Quantum Physics Seminar
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transcript…"
                className="h-10 rounded-full bg-muted pl-9"
                aria-label="Search demo transcript"
              />
            </label>
            <Link href="/meetings/completed" className="text-center text-sm font-medium text-primary hover:underline">
              Completed overview
            </Link>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b bg-surface-soft/55 px-4 py-3 sm:px-6 md:px-8 xl:px-10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-full border bg-background px-4 py-2 sm:max-w-xl lg:ml-auto lg:mr-0">
          <Button variant="ghost" size="icon-sm" disabled aria-label="Recording playback is planned">
            <Play className="fill-current" />
          </Button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[32%] bg-primary" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">14:22 / 45:00</span>
          <span className="sr-only">Recording playback is not available in S05.</span>
        </div>
      </div>

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-8 xl:px-10">
        <div className="mx-auto max-w-4xl space-y-10 pb-24">
          {entries.length ? entries.map((entry, index) => {
            const bookmarked = bookmarks.has(entry.id)
            return (
              <article
                key={entry.id}
                className={cn(
                  "group grid gap-4 border-b border-border/55 pb-9 sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-6",
                  index === 2 && "rounded-xl border border-primary/15 bg-surface-soft/55 p-4 sm:-mx-4 sm:p-5",
                )}
              >
                <div className="flex items-center gap-2 text-xs sm:flex-col sm:items-end sm:gap-1 sm:pt-1 sm:text-right">
                  <span className={cn("font-mono text-muted-foreground", index === 2 && "text-primary")}>
                    {index === 2 ? <span className="mr-1 inline-block size-1.5 rounded-full bg-primary" /> : null}
                    {entry.timestamp}
                  </span>
                  <span className="font-medium text-foreground">{entry.speaker}</span>
                </div>

                <div className="relative min-w-0 space-y-3">
                  <p lang="vi" data-language-priority="primary" className="reading-column text-[clamp(1.08rem,1.8vw,1.35rem)] font-medium leading-[1.65]">
                    {entry.vi}
                  </p>
                  <div className="rounded-lg border-l-2 border-primary/20 bg-surface-soft px-4 py-3">
                    <p lang="en" data-language-priority="secondary" className="text-sm italic leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                      {entry.en}
                    </p>
                  </div>
                  {entry.note ? (
                    <div className="flex items-start gap-2 rounded-lg bg-secondary/55 px-3 py-2.5 text-sm text-secondary-foreground">
                      <NotebookPen className="mt-0.5 size-4 shrink-0" />
                      <span>{entry.note}</span>
                    </div>
                  ) : null}

                  <div className="flex gap-1 sm:absolute sm:-right-1 sm:top-0 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={bookmarked ? "Remove demo bookmark" : "Bookmark demo transcript moment"}
                      aria-pressed={bookmarked}
                      onClick={() => toggleBookmark(entry.id)}
                      className={bookmarked ? "bg-accent text-primary" : "text-muted-foreground"}
                    >
                      <Bookmark className={cn(bookmarked && "fill-current")} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled aria-label="Transcript note editing is planned">
                      <NotebookPen />
                    </Button>
                  </div>
                </div>
              </article>
            )
          }) : (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <FileText className="mx-auto mb-4 size-7 text-primary" />
              <h2 className="font-serif text-xl font-bold">No matching moments</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try a different speaker, term, or timestamp.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
