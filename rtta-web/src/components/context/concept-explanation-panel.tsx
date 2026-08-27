"use client"

import Link from "next/link"
import { AlertCircle, Bookmark, BookOpen, Clock3, FileText, LoaderCircle, NotebookPen, Sparkles, X } from "lucide-react"

import { MarkdownContent } from "@/components/ai/markdown-content"
import { Button } from "@/components/ui/button"
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
    <div className={cn("flex h-full min-h-0 flex-col bg-card", className)}>
      <header className={cn("flex shrink-0 items-center justify-between border-b bg-surface-soft/65 px-5", compactHeader ? "py-3" : "py-4")}>
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <BookOpen className="size-4 shrink-0" />
          <span className="truncate text-xs font-semibold uppercase tracking-[0.12em]">
            Giải thích đoạn này
          </span>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng phần giải thích">
            <X />
          </Button>
        ) : null}
      </header>

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        {target ? (
          <div className="space-y-5">
            <section className="surface-card p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock3 className="size-3.5" />
                {formatOffset(target.offsetMs)}
                <span aria-hidden="true">·</span>
                đoạn đã lưu
              </div>
              <p lang="vi" className="line-clamp-3 font-medium leading-relaxed">{target.translatedText}</p>
              <p lang="en" className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{target.sourceText}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", target.bookmarked ? "bg-accent text-primary" : "bg-muted")}>
                  <Bookmark className="size-3" />{target.bookmarked ? "Đã lưu" : "Chưa lưu"}
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", target.noteContent ? "bg-accent text-primary" : "bg-muted")}>
                  <NotebookPen className="size-3" />{target.noteContent ? "Có ghi chú" : "Chưa có ghi chú"}
                </span>
              </div>
            </section>

            {controller.historyLoading ? (
              <section className="surface-card px-5 py-10 text-center" role="status">
                <LoaderCircle className="mx-auto mb-3 size-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải các giải thích đã lưu…</p>
              </section>
            ) : null}

            {controller.history.map((item) => (
              <article key={item.id ?? item.createdAt} className="space-y-3">
                <div className="ml-4 rounded-xl border border-border/65 bg-secondary/65 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Bạn</p>
                  <p className="text-sm leading-relaxed">{item.userQuestion || "Giải thích đoạn này"}</p>
                </div>
                <div className="mr-1 overflow-hidden surface-card">
                  <div className="flex items-center gap-2 border-b bg-accent/35 px-5 py-3 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" /> RTTA
                  </div>
                  <MarkdownContent markdown={item.responseMarkdown} />
                  {item.citations.length ? (
                    <section className="border-t px-5 py-4">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <FileText className="size-3.5" /> Đang tham khảo
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {item.citations.map((citation, index) => (
                          <li key={`${String(citation.documentId)}:${index}`} className="surface-inset px-3 py-2">
                            <span className="font-medium">{String(citation.fileName ?? "Tài liệu nghiên cứu")}</span>
                            {citation.pageNumber ? <span className="text-muted-foreground"> · trang {String(citation.pageNumber)}</span> : null}
                            {citation.slideNumber ? <span className="text-muted-foreground"> · slide {String(citation.slideNumber)}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </article>
            ))}

            {controller.loading ? (
              <section className="surface-card px-5 py-12 text-center" role="status">
                <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-primary" />
                <p className="font-medium">RTTA đang đọc ngữ cảnh quanh đoạn này…</p>
                <p className="mt-1 text-sm text-muted-foreground">Câu trả lời sẽ bằng tiếng Việt và bám sát nội dung cuộc họp.</p>
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
                  Thử lại
                </Button>
              </section>
            ) : null}

            {!controller.historyLoading && !controller.history.some((item) => item.citations.length) ? (
              <p className="surface-inset px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                Bạn có thể <Link href={`/meetings/${target.meetingId}/context`} className="font-medium text-primary hover:underline">thêm paper hoặc slide</Link> để RTTA giải thích sát với tài liệu của cuộc họp hơn.
              </p>
            ) : null}

            <section className="surface-card sticky bottom-0 space-y-3 p-4 shadow-float">
              <label htmlFor="explain-question" className="text-sm font-medium">
                {controller.history.length ? "Hỏi thêm về đoạn này" : "Bạn muốn hiểu điều gì?"}
              </label>
              <Textarea
                id="explain-question"
                value={controller.userQuestion}
                onChange={(event) => controller.setUserQuestion(event.target.value.slice(0, 2_000))}
                placeholder={controller.history.length ? "Nhập câu hỏi tiếp theo…" : "Ví dụ: Khái niệm này có nghĩa là gì?"}
                className="min-h-24 resize-none"
                disabled={controller.loading}
              />
              <div className="flex justify-end">
                <Button onClick={() => void controller.generate("QUICK")} disabled={controller.loading || !controller.selectedText.trim()}>
                  {controller.loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                  {controller.history.length ? "Hỏi tiếp" : "Giải thích đoạn này"}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">RTTA chỉ trả lời khi bạn nhấn nút.</p>
            </section>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Chọn một đoạn hoàn chỉnh trong bản ghi để hỏi RTTA.
          </div>
        )}
      </div>
    </div>
  )
}
