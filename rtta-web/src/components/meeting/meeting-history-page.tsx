"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileAudio,
  FileText,
  LoaderCircle,
  NotebookPen,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { listMeetings } from "@/lib/api/meetings"
import { formatVietnameseDateTime, formatVietnameseDuration } from "@/lib/format"
import type { MeetingDto } from "@/types/api"

const statusLabel = {
  LIVE: "Đang diễn ra",
  COMPLETED: "Đã kết thúc",
  FAILED: "Bị gián đoạn",
} as const

export function MeetingHistoryPage() {
  const [meetings, setMeetings] = useState<MeetingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadHistory() {
      try {
        const loaded: MeetingDto[] = []
        let page = 0
        let totalPages = 1
        while (page < totalPages && !controller.signal.aborted) {
          const response = await listMeetings({ page, size: 100, signal: controller.signal })
          loaded.push(...response.items)
          totalPages = response.totalPages
          page += 1
        }
        if (!controller.signal.aborted) setMeetings(loaded)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setError("Không thể tải lịch sử cuộc họp. Vui lòng thử lại.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadHistory()
    return () => controller.abort()
  }, [])

  const newestFirst = useMemo(
    () => [...meetings].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
    [meetings],
  )

  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-5xl pb-20">
        <header className="border-b pb-8">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <CalendarDays className="size-4" /> Lịch sử nghiên cứu
          </p>
          <h1 className="editorial-title text-[clamp(2.1rem,5vw,3.6rem)] font-bold">Cuộc họp</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Mở lại bản ghi, ghi chú, tài liệu và các phần giải thích đã lưu từ mọi cuộc họp.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-5 animate-spin text-primary" /> Đang tải lịch sử cuộc họp…
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
            <AlertCircle className="mx-auto mb-4 size-7 text-destructive" />
            <h2 className="editorial-title text-2xl font-bold">Không thể mở lịch sử cuộc họp</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-5" onClick={() => window.location.reload()}>Thử lại</Button>
          </div>
        ) : newestFirst.length ? (
          <ol className="divide-y" aria-label="Danh sách cuộc họp, mới nhất trước">
            {newestFirst.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="group grid gap-4 rounded-xl border border-transparent px-3 py-6 transition-[background-color,border-color,box-shadow,color] duration-200 ease-soft sm:grid-cols-[148px_minmax(0,1fr)_auto] sm:items-start sm:hover:border-border/65 sm:hover:bg-card sm:hover:shadow-surface"
                >
                  <time dateTime={meeting.startedAt} className="text-sm leading-relaxed text-muted-foreground">
                    {formatVietnameseDateTime(meeting.startedAt)}
                  </time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="editorial-title truncate text-xl font-bold group-hover:text-primary">{meeting.title}</h2>
                      <Badge variant="outline" className="shrink-0 text-primary">{statusLabel[meeting.status]}</Badge>
                    </div>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{meetingDuration(meeting)}</span>
                      <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" />{meeting.transcriptUtteranceCount.toLocaleString("vi-VN")} đoạn</span>
                      <span className="inline-flex items-center gap-1.5"><Bookmark className="size-3.5" />{meeting.bookmarkCount ?? 0} mục đã lưu</span>
                      <span className="inline-flex items-center gap-1.5"><NotebookPen className="size-3.5" />{meeting.noteCount ?? 0} ghi chú</span>
                    </p>
                    <p className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <Sparkles className="size-3" />{meeting.summaryAvailable ? "Đã có tóm tắt" : "Chưa có tóm tắt"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <FileAudio className="size-3" />{meeting.recordingAvailable ? "Có bản ghi âm" : "Không có bản ghi âm"}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="mt-1 hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary sm:block" />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="surface-empty px-6 py-16 text-center">
            <CalendarDays className="mx-auto mb-4 size-8 text-primary" />
            <h2 className="editorial-title text-2xl font-bold">Chưa có cuộc họp nào</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Bắt đầu thu âm từ tiện ích RTTA. Cuộc họp đã lưu sẽ xuất hiện tại đây.
            </p>
            <Button asChild className="mt-6"><Link href="/">Đến màn hình trực tiếp</Link></Button>
          </div>
        )}
      </div>
    </section>
  )
}

function meetingDuration(meeting: MeetingDto) {
  return formatVietnameseDuration(
    meeting.endedAt ? Math.max(0, Date.parse(meeting.endedAt) - Date.parse(meeting.startedAt)) : null,
  )
}
