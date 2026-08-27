"use client"

import { useState } from "react"
import { Clock3, LoaderCircle, NotebookPen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { formatOffset } from "@/lib/format"
import type { MeetingMoment } from "@/types/meeting"

interface NoteComposerSheetProps {
  target: MeetingMoment | null
  initialDraft?: string
  saving?: boolean
  onClose: () => void
  onSave: (note: string) => void
}

export function NoteComposerSheet({
  target,
  initialDraft = "",
  saving = false,
  onClose,
  onSave,
}: NoteComposerSheetProps) {
  const [draft, setDraft] = useState(initialDraft)

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[min(92vw,430px)] sm:max-w-[430px]">
        <SheetHeader className="border-b px-5 py-5 pr-12">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <NotebookPen className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Ghi chú cuộc họp</span>
          </div>
          <SheetTitle className="editorial-title text-2xl font-bold">Ghi lại đoạn này</SheetTitle>
          <SheetDescription>
            Ghi chú này sẽ luôn được gắn với đoạn hoàn chỉnh trong bản ghi.
          </SheetDescription>
        </SheetHeader>

        {target ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="surface-inset p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock3 className="size-3.5" />
                {formatOffset(target.offsetMs)}
              </div>
              <p lang="vi" className="line-clamp-3 font-medium leading-relaxed">{target.translatedText}</p>
              <p lang="en" className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{target.sourceText}</p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Ghi chú của bạn</span>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Bạn muốn ghi nhớ hoặc tìm hiểu thêm điều gì?"
                className="min-h-44 resize-none bg-card text-base leading-relaxed"
                autoFocus
              />
            </label>
          </div>
        ) : null}

        <SheetFooter className="border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            onClick={() => target && onSave(draft.trim())}
            disabled={!target || !draft.trim() || saving}
          >
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            Lưu ghi chú
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
