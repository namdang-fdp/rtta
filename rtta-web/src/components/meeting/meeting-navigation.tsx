"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type MeetingSection = "overview" | "transcript" | "notes" | "context"

const sections: Array<{ id: MeetingSection; label: string; suffix: string }> = [
  { id: "overview", label: "Tổng quan", suffix: "" },
  { id: "transcript", label: "Bản ghi", suffix: "/transcript" },
  { id: "notes", label: "Ghi chú", suffix: "/notes" },
  { id: "context", label: "Tài liệu", suffix: "/context" },
]

export function MeetingNavigation({
  meetingId,
  title,
  active,
}: {
  meetingId: string
  title: string
  active: MeetingSection
}) {
  return (
    <div className="border-b bg-background/95">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 md:px-8 xl:px-10">
        <nav aria-label="Đường dẫn cuộc họp" className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/meetings" className="shrink-0 font-medium hover:text-primary">Cuộc họp</Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <Link href={`/meetings/${meetingId}`} className="truncate hover:text-primary">{title}</Link>
          {active !== "overview" ? (
            <>
              <ChevronRight className="size-3.5 shrink-0" />
              <span className="shrink-0 font-medium text-foreground">
                {sections.find((section) => section.id === active)?.label}
              </span>
            </>
          ) : null}
        </nav>
        <nav aria-label="Nội dung cuộc họp" className="quiet-scrollbar mt-3 flex overflow-x-auto">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/meetings/${meetingId}${section.suffix}`}
              aria-current={active === section.id ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active === section.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {section.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
