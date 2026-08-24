"use client"

import { AlertCircle, BookOpen, Clock3, FileText, LoaderCircle, Search, Sparkles, X } from "lucide-react"

import { MarkdownContent } from "@/components/ai/markdown-content"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ConceptExplanationController } from "@/hooks/use-concept-explanation"
import { formatOffset } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ConceptExplanationPanelProps {
  controller: ConceptExplanationController
  onClose?: () => void
  className?: string
  compactHeader?: boolean
}

export function ConceptExplanationPanel({
  controller,
  onClose,
  className,
  compactHeader = false,
}: ConceptExplanationPanelProps) {
  const target = controller.target

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-surface-soft", className)}>
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <BookOpen className="size-4 shrink-0" />
          <span className="truncate text-xs font-semibold uppercase tracking-[0.12em]">
            Explain concept
          </span>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close concept explanation">
            <X />
          </Button>
        ) : null}
      </header>

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        {target ? (
          <div className="space-y-5">
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock3 className="size-3.5" />
                {formatOffset(target.offsetMs)}
                <span aria-hidden="true">·</span>
                persisted transcript
              </div>
              <p lang="vi" className="line-clamp-3 font-medium leading-relaxed">{target.translatedText}</p>
              <p lang="en" className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{target.sourceText}</p>
            </section>

            <section className="space-y-4 rounded-xl border bg-card p-5">
              <div>
                <label htmlFor="explain-selection" className="text-sm font-medium">Concept or selected phrase</label>
                <Input
                  id="explain-selection"
                  value={controller.selectedText}
                  onChange={(event) => controller.setSelectedText(event.target.value.slice(0, 500))}
                  placeholder="e.g. Hamiltonian"
                  className="mt-2"
                  disabled={controller.loading}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="explain-question" className="text-sm font-medium">
                  Specific question <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="explain-question"
                  value={controller.userQuestion}
                  onChange={(event) => controller.setUserQuestion(event.target.value.slice(0, 2_000))}
                  placeholder="Why is the speaker using this concept here?"
                  className="mt-2 min-h-24 resize-none"
                  disabled={controller.loading}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void controller.generate("QUICK")}
                  disabled={controller.loading || !controller.selectedText.trim()}
                >
                  {controller.loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                  Explain
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void controller.generate("DEEP")}
                  disabled={controller.loading || !controller.selectedText.trim()}
                >
                  <Search />
                  Research deeper
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Opening this drawer never calls Gemini. Generation happens only when you choose an option.
              </p>
            </section>

            {controller.loading ? (
              <section className="rounded-xl border bg-card px-5 py-12 text-center" role="status">
                <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-primary" />
                <p className="font-medium">Building a contextual Vietnamese explanation…</p>
                <p className="mt-1 text-sm text-muted-foreground">Using only the nearby transcript and relevant research context.</p>
              </section>
            ) : null}

            {controller.error ? (
              <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
                <div className="flex items-start gap-3 text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p className="text-sm leading-relaxed">{controller.error}</p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => void controller.generate("QUICK")}
                  disabled={!controller.selectedText.trim()}
                >
                  Retry explanation
                </Button>
              </section>
            ) : null}

            {controller.response ? (
              <article className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b bg-accent/45 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/25 bg-background/70 text-primary">
                      {controller.response.requestedDepth === "DEEP" ? "Research deeper" : "Quick explanation"}
                    </Badge>
                    <Badge variant="secondary">{controller.response.model}</Badge>
                  </div>
                  <h2 className={cn(
                    "editorial-title font-bold text-primary",
                    compactHeader ? "text-2xl" : "text-[1.75rem]",
                  )}>
                    {controller.response.selectedText}
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Context: {controller.response.contextWindow.previousUtterances} before ·{" "}
                    {controller.response.contextWindow.followingUtterances} after ·{" "}
                    {controller.response.contextWindow.documentChunks} document chunks
                  </p>
                  {controller.response.deepModelFallback ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No distinct deep model is configured, so RTTA used the normal model.
                    </p>
                  ) : null}
                </div>

                <MarkdownContent markdown={controller.response.responseMarkdown} />

                {controller.response.citations.length ? (
                  <section className="border-t p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <FileText className="size-3.5" />
                      Research sources
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {controller.response.citations.map((citation, index) => (
                        <li key={`${String(citation.documentId)}:${index}`} className="rounded-lg bg-muted px-3 py-2">
                          <span className="font-medium">{String(citation.fileName ?? "Research document")}</span>
                          {citation.pageNumber ? <span className="text-muted-foreground"> · page {String(citation.pageNumber)}</span> : null}
                          {citation.slideNumber ? <span className="text-muted-foreground"> · slide {String(citation.slideNumber)}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </article>
            ) : null}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Choose a finalized transcript moment to explain.
          </div>
        )}
      </div>
    </div>
  )
}
