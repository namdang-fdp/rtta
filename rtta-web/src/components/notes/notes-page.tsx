"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertCircle, ArrowLeft, Clock3, FileText, LoaderCircle, NotebookPen, Pencil, Save, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { MeetingNavigation } from "@/components/meeting/meeting-navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMeetingNotes } from "@/hooks/use-meeting-notes"
import { useMeetingSelection } from "@/hooks/use-meeting-selection"
import { formatOffset } from "@/lib/format"

interface NotesPageProps {
  meetingId?: string
}

export function NotesPage({ meetingId }: NotesPageProps) {
  const selection = useMeetingSelection(meetingId)
  const notes = useMeetingNotes(selection.resolvedMeetingId)
  const [generalDraft, setGeneralDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)

  const addGeneralNote = async () => {
    if (await notes.addGeneral(generalDraft)) setGeneralDraft("")
  }

  const saveEdit = async (noteId: string) => {
    if (await notes.edit(noteId, editDraft)) {
      setEditingId(null)
      setEditDraft("")
    }
  }

  if (selection.loading) {
    return (
      <CenteredMessage icon={<LoaderCircle className="size-6 animate-spin" />} title="Đang tải ghi chú…" />
    )
  }

  if (selection.error) {
    return (
      <CenteredMessage
        icon={<AlertCircle className="size-6" />}
        title="Không thể mở ghi chú"
        description="Vui lòng quay lại lịch sử cuộc họp và thử lại."
      />
    )
  }

  if (!selection.meeting || !selection.resolvedMeetingId) {
    return (
      <CenteredMessage
        icon={<NotebookPen className="size-6" />}
        title="Chưa có cuộc họp nào"
        description="Hãy bắt đầu một cuộc họp RTTA trước khi tạo ghi chú."
      />
    )
  }

  const transcriptHref = `/meetings/${selection.resolvedMeetingId}/transcript`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MeetingNavigation meetingId={selection.resolvedMeetingId} title={selection.meeting.title} active="notes" />
      <section className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-border pb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-primary">{selection.meeting.status === "LIVE" ? "Đang diễn ra" : selection.meeting.status === "COMPLETED" ? "Đã kết thúc" : "Bị gián đoạn"}</Badge>
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {selection.meeting.sourceLanguage} → {selection.meeting.targetLanguage}
            </span>
          </div>
          <h1 className="editorial-title text-[clamp(2rem,5vw,3.35rem)] font-bold">Ghi chú nghiên cứu</h1>
          <p className="mt-2 text-lg font-medium">{selection.meeting.title}</p>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Ghi chú luôn đi cùng cuộc họp. Ghi chú tạo từ một đoạn bản ghi sẽ giữ lại cả ngữ cảnh tiếng Việt và tiếng Anh.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={transcriptHref}><FileText />Xem bản ghi</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/"><ArrowLeft />Màn hình trực tiếp</Link>
            </Button>
          </div>
        </header>

        {notes.error ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{notes.error}</span>
            <Button variant="ghost" size="sm" onClick={notes.clearError}>Đóng</Button>
          </div>
        ) : null}

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {notes.notes.length ? notes.notes.map((note) => (
              <article key={note.id} className="surface-card p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  <span>{note.offsetMs === null ? "Ghi chú cuộc họp" : formatOffset(note.offsetMs)}</span>
                  {note.utteranceId ? <Badge variant="secondary">Gắn với bản ghi</Badge> : null}
                </div>

                {note.translatedText ? (
                  <div className="surface-quote mb-4 px-4 py-3">
                    <p lang="vi" className="font-medium leading-relaxed">{note.translatedText}</p>
                    {note.sourceText ? (
                      <p lang="en" className="mt-2 text-sm leading-relaxed text-muted-foreground">{note.sourceText}</p>
                    ) : null}
                  </div>
                ) : null}

                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      className="min-h-28"
                      aria-label="Sửa ghi chú nghiên cứu"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditingId(null)}><X />Hủy</Button>
                      <Button
                        onClick={() => void saveEdit(note.id)}
                        disabled={notes.saving || !editDraft.trim()}
                      >
                        {notes.saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                        Lưu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <div className="mt-4 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(note.id)
                          setEditDraft(note.content)
                          setDeleteCandidate(null)
                        }}
                      >
                        <Pencil />Sửa
                      </Button>
                      <Button
                        variant={deleteCandidate === note.id ? "destructive" : "ghost"}
                        size="sm"
                        disabled={notes.saving}
                        onClick={() => {
                          if (deleteCandidate === note.id) {
                            void notes.remove(note.id)
                            setDeleteCandidate(null)
                          } else {
                            setDeleteCandidate(note.id)
                          }
                        }}
                      >
                        <Trash2 />{deleteCandidate === note.id ? "Xác nhận xóa" : "Xóa"}
                      </Button>
                    </div>
                  </>
                )}
              </article>
            )) : (
              <div className="surface-empty px-6 py-14 text-center">
                <NotebookPen className="mx-auto mb-4 size-7 text-primary" />
                <h2 className="editorial-title text-2xl font-bold">Chưa có ghi chú cho cuộc họp này</h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  Tạo ghi chú tại đây hoặc chọn biểu tượng ghi chú cạnh một đoạn hoàn chỉnh trong bản ghi.
                </p>
              </div>
            )}
          </div>

          <aside className="surface-card-soft h-fit p-5">
            <div className="flex items-center gap-2 text-primary">
              <NotebookPen className="size-4" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Ghi chú chung</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Ghi lại suy nghĩ về toàn bộ cuộc họp. Để gắn với thời điểm cụ thể, hãy tạo ghi chú từ màn hình Trực tiếp hoặc Bản ghi.
            </p>
            <Textarea
              value={generalDraft}
              onChange={(event) => setGeneralDraft(event.target.value)}
              placeholder="Bạn muốn ghi nhớ điều gì?"
              className="mt-4 min-h-32 bg-background"
              aria-label="Ghi chú chung mới"
            />
            <Button
              className="mt-3 w-full"
              onClick={() => void addGeneralNote()}
              disabled={notes.saving || !generalDraft.trim()}
            >
              {notes.saving ? <LoaderCircle className="animate-spin" /> : <NotebookPen />}
              Lưu ghi chú
            </Button>
          </aside>
        </div>
      </div>
      </section>
    </div>
  )
}

function CenteredMessage({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <section className="flex h-full items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent text-primary">{icon}</div>
        <h1 className="editorial-title text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  )
}
