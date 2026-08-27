"use client"

import Link from "next/link"
import {
  AlertCircle, Bookmark, BookOpenText, CalendarCheck, Clock3, FileText, Languages,
  LoaderCircle, NotebookPen, PlayCircle, Sparkles,
} from "lucide-react"

import { MarkdownContent } from "@/components/ai/markdown-content"
import { MeetingNavigation } from "@/components/meeting/meeting-navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMeetingBookmarks } from "@/hooks/use-meeting-bookmarks"
import { useMeetingNotes } from "@/hooks/use-meeting-notes"
import { useMeetingSelection } from "@/hooks/use-meeting-selection"
import { useMeetingSummary } from "@/hooks/use-meeting-summary"
import { useMeetingRecordings } from "@/hooks/use-meeting-recordings"
import { recordingPlaybackUrl } from "@/lib/api/recordings"
import { formatOffset, formatVietnameseDateTime, formatVietnameseDuration } from "@/lib/format"

const statusLabel = {
  LIVE: "Đang diễn ra",
  COMPLETED: "Đã kết thúc",
  FAILED: "Bị gián đoạn",
} as const

export function CompletedMeetingOverview({ meetingId }: { meetingId?: string }) {
  const selection = useMeetingSelection(meetingId)
  const bookmarks = useMeetingBookmarks(selection.resolvedMeetingId)
  const notes = useMeetingNotes(selection.resolvedMeetingId)
  const summary = useMeetingSummary(selection.resolvedMeetingId)
  const recordings = useMeetingRecordings(selection.resolvedMeetingId)

  if (selection.loading) return <StatusMessage icon={<LoaderCircle className="animate-spin" />} title="Đang tải cuộc họp…" />
  if (selection.error) return <StatusMessage icon={<AlertCircle />} title="Không thể mở cuộc họp" detail="Vui lòng quay lại lịch sử cuộc họp và thử lại." />
  if (!selection.meeting || !selection.resolvedMeetingId) {
    return <StatusMessage icon={<CalendarCheck />} title="Chưa có cuộc họp nào" detail="Bắt đầu thu âm từ tiện ích RTTA để tạo cuộc họp đầu tiên." />
  }

  const meeting = selection.meeting
  const id = selection.resolvedMeetingId
  const durationMs = meeting.endedAt
    ? Math.max(0, Date.parse(meeting.endedAt) - Date.parse(meeting.startedAt))
    : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MeetingNavigation meetingId={id} title={meeting.title} active="overview" />
      <section className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-6xl pb-20">
        <header className="mb-10 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-muted-foreground">
            <CalendarCheck className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Cuộc họp nghiên cứu</span>
            <Badge variant="outline" className="ml-1 text-primary">{statusLabel[meeting.status]}</Badge>
          </div>
          <h1 className="editorial-title text-[clamp(2.15rem,5vw,3.75rem)] font-bold leading-[1.12]">{meeting.title}</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            {recordings.latestReady ? (
              <audio controls preload="metadata" crossOrigin="use-credentials" src={recordingPlaybackUrl(id, recordings.latestReady.id)} className="h-10 max-w-full" aria-label="Nghe lại bản ghi âm cuộc họp" />
            ) : (
              <Button disabled title="Cuộc họp này chưa có bản ghi âm để nghe lại"><PlayCircle />Nghe lại</Button>
            )}
            <Button asChild variant="outline"><Link href={`/meetings/${id}/transcript`}><FileText />Toàn bộ bản ghi</Link></Button>
            <Button asChild variant="ghost"><Link href={`/meetings/${id}/notes`}><NotebookPen />Ghi chú</Link></Button>
            <Button asChild variant="ghost"><Link href={`/meetings/${id}/context`}><BookOpenText />Tài liệu</Link></Button>
          </div>
        </header>

        {(bookmarks.error || notes.error || recordings.error) ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{bookmarks.error ?? notes.error ?? recordings.error}</span>
          </div>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface-soft p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary"><Sparkles className="size-4" /></span>
                  <div>
                    <h2 className="editorial-title text-2xl">Tóm tắt cuộc họp</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Chỉ tạo khi bạn chủ động yêu cầu.</p>
                  </div>
                </div>
                <Button onClick={() => void summary.generate()} disabled={summary.generating || meeting.status === "LIVE"}>
                  {summary.generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                  {summary.summary ? "Tạo lại tóm tắt" : "Tạo bản tóm tắt"}
                </Button>
              </div>
              {summary.error ? (
                <div className="p-10 text-center">
                  <AlertCircle className="mx-auto mb-3 size-6 text-destructive" />
                  <p className="font-medium">Không thể tạo bản tóm tắt.</p>
                  <Button variant="outline" className="mt-4" onClick={() => void summary.generate()} disabled={summary.generating}>
                    {summary.generating ? <LoaderCircle className="animate-spin" /> : null} Thử lại
                  </Button>
                </div>
              ) : summary.loading ? (
                <div className="p-10 text-center text-sm text-muted-foreground"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin" />Đang tải bản tóm tắt…</div>
              ) : summary.summary ? (
                <>
                  <MarkdownContent markdown={summary.summary.summaryMarkdown} className="p-6 sm:p-8" />
                  <p className="border-t px-6 py-4 text-xs text-muted-foreground">
                    Đã tạo lúc {formatVietnameseDateTime(summary.summary.createdAt)}
                  </p>
                </>
              ) : (
                <div className="p-10 text-center">
                  <Sparkles className="mx-auto mb-3 size-6 text-primary/60" />
                  <p className="font-medium">Chưa có bản tóm tắt</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">RTTA sẽ tổng hợp bản ghi đã lưu và chú ý hơn đến những đoạn bạn lưu cùng các ghi chú nghiên cứu.</p>
                </div>
              )}
            </section>

            <section className="surface-card p-6 sm:p-8">
              <h2 className="editorial-title mb-6 text-2xl">Khoảnh khắc đã lưu</h2>
              {bookmarks.bookmarks.length ? (
                <div className="space-y-6">
                  {bookmarks.bookmarks.map((item) => (
                    <article key={item.id} className="flex gap-4">
                      <Bookmark className="mt-1 size-5 shrink-0 text-primary/65" />
                      <div>
                        {item.translatedText ? <p lang="vi" className="font-serif text-lg leading-relaxed">{item.translatedText}</p> : null}
                        {item.sourceText ? <p lang="en" className="mt-2 text-sm italic leading-relaxed text-muted-foreground">{item.sourceText}</p> : null}
                        {item.label ? <p className="mt-2 text-sm font-medium">{item.label}</p> : null}
                        <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{formatOffset(item.offsetMs ?? 0)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Bạn chưa lưu khoảnh khắc nào trong cuộc họp này.</p>}
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="surface-card-soft p-6">
              <div className="mb-5 flex items-center gap-3"><NotebookPen className="size-5 text-primary" /><h2 className="editorial-title text-2xl">Ghi chú và câu hỏi</h2></div>
              {notes.notes.length ? (
                <ul className="space-y-4">
                  {notes.notes.map((note) => (
                    <li key={note.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <p className="text-sm leading-relaxed">{note.content}</p>
                      <span className="mt-2 block font-mono text-[0.7rem] text-muted-foreground">{note.offsetMs === null ? "Ghi chú cuộc họp" : formatOffset(note.offsetMs)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm leading-relaxed text-muted-foreground">Chưa có ghi chú nghiên cứu.</p>}
            </section>

            <section className="surface-card p-6">
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Thông tin cuộc họp</h2>
              <dl className="space-y-4 text-sm">
                <MetadataRow icon={<Clock3 />} term="Thời lượng" value={formatVietnameseDuration(durationMs)} />
                <MetadataRow icon={<Languages />} term="Ngôn ngữ" value={`${meeting.sourceLanguage} → ${meeting.targetLanguage}`} />
                <MetadataRow icon={<FileText />} term="Số đoạn hoàn chỉnh" value={meeting.transcriptUtteranceCount.toLocaleString("vi-VN")} />
              </dl>
            </section>
          </aside>
        </div>
      </div>
      </section>
    </div>
  )
}

function MetadataRow({ icon, term, value }: { icon: React.ReactNode; term: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><dt className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">{icon}{term}</dt><dd className="text-right font-medium">{value}</dd></div>
}

function StatusMessage({ icon, title, detail }: { icon: React.ReactNode; title: string; detail?: string }) {
  return <section className="flex h-full items-center justify-center px-6"><div className="max-w-md text-center text-muted-foreground [&_svg]:mx-auto [&_svg]:mb-4 [&_svg]:size-7"><span>{icon}</span><h1 className="editorial-title text-2xl font-bold text-foreground">{title}</h1>{detail ? <p className="mt-3 text-sm leading-relaxed">{detail}</p> : null}</div></section>
}
