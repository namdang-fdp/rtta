"use client"

import Link from "next/link"
import { useRef } from "react"
import {
  AlertCircle, ArrowLeft, BookOpenText, CheckCircle2, FileText, FolderOpen,
  LoaderCircle, Presentation, Trash2, Upload,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMeetingSelection } from "@/hooks/use-meeting-selection"
import { useResearchDocuments } from "@/hooks/use-research-documents"
import type { ResearchDocumentDto } from "@/types/api"

export function ResearchContextPage({ meetingId }: { meetingId?: string }) {
  const selection = useMeetingSelection(meetingId)
  const context = useResearchDocuments(selection.resolvedMeetingId)
  const fileInput = useRef<HTMLInputElement>(null)

  if (selection.loading) return <Centered icon={<LoaderCircle className="animate-spin" />} title="Loading research context…" />
  if (selection.error) return <Centered icon={<AlertCircle />} title="Research context unavailable" detail={selection.error} />
  if (!selection.meeting || !selection.resolvedMeetingId) {
    return <Centered icon={<BookOpenText />} title="No meetings yet" detail="Start an RTTA meeting before attaching papers or slides." />
  }

  const uploadSelected = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    await context.upload(file)
    if (fileInput.current) fileInput.current.value = ""
  }

  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-6xl pb-20">
        <header className="border-b pb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-primary">Meeting-scoped RAG</Badge>
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{selection.meeting.sourceLanguage} → {selection.meeting.targetLanguage}</span>
          </div>
          <h1 className="editorial-title text-[clamp(2rem,5vw,3.4rem)] font-bold">Research Context</h1>
          <p className="mt-2 text-lg font-medium">{selection.meeting.title}</p>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
            Add papers or slides for semantic retrieval during concept explanations. Originals stay in the private document bucket.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.pptx,.txt,.docx,application/pdf,text/plain"
              className="sr-only"
              aria-label="Research document file"
              onChange={(event) => void uploadSelected(event.target.files)}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={context.uploading}>
              {context.uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
              {context.uploading ? "Uploading…" : "Upload paper or slides"}
            </Button>
            <Button asChild variant="ghost"><Link href={`/meetings/${selection.resolvedMeetingId}`}><ArrowLeft />Meeting overview</Link></Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">PDF, PPTX, TXT, or DOCX · up to 50 MB · server-side extraction only</p>
        </header>

        {context.error ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" /><span className="flex-1">{context.error}</span>
            <Button variant="ghost" size="sm" onClick={context.clearError}>Dismiss</Button>
          </div>
        ) : null}

        <section className="py-8">
          <h2 className="editorial-title mb-6 flex items-center gap-2 text-2xl"><FolderOpen className="size-5 text-primary" />Attached documents</h2>
          {context.loading ? (
            <div className="rounded-xl border p-12 text-center text-sm text-muted-foreground"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin" />Loading documents…</div>
          ) : context.documents.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {context.documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  deleting={context.deletingId === document.id}
                  onDelete={() => void context.remove(document.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-surface-soft/45 px-6 py-14 text-center">
              <BookOpenText className="mx-auto mb-4 size-7 text-primary" />
              <h2 className="editorial-title text-2xl font-bold">No research material attached</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Upload a relevant paper, presentation, or plain-text reference. RTTA will extract and embed it without sending the file to the browser.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function DocumentCard({ document, deleting, onDelete }: { document: ResearchDocumentDto; deleting: boolean; onDelete: () => void }) {
  const slide = document.mediaType.includes("presentation")
  const processing = document.status === "UPLOADED" || document.status === "PROCESSING"
  return (
    <article className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          {slide ? <Presentation className="size-5" /> : <FileText className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="truncate font-semibold" title={document.fileName}>{document.fileName}</h3><p className="mt-1 text-xs text-muted-foreground">{formatBytes(document.sizeBytes)} · {shortType(document.mediaType)}</p></div>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={deleting || processing} aria-label={`Remove ${document.fileName}`}>
              {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <StatusBadge document={document} />
            <span className="truncate font-mono text-[0.65rem] text-muted-foreground" title={document.sha256}>SHA-256 {document.sha256.slice(0, 10)}…</span>
          </div>
          {document.status === "FAILED" ? <p className="mt-3 text-sm text-destructive">This document could not be processed. Removing and uploading a clean copy is safe.</p> : null}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ document }: { document: ResearchDocumentDto }) {
  if (document.status === "READY") return <Badge className="gap-1"><CheckCircle2 className="size-3" />Ready for Explain</Badge>
  if (document.status === "FAILED") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="secondary" className="gap-1"><LoaderCircle className="size-3 animate-spin" />Processing</Badge>
}

function shortType(mediaType: string) {
  if (mediaType.includes("presentation")) return "PPTX"
  if (mediaType.includes("wordprocessing")) return "DOCX"
  if (mediaType === "application/pdf") return "PDF"
  return "TXT"
}

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function Centered({ icon, title, detail }: { icon: React.ReactNode; title: string; detail?: string }) {
  return <section className="flex h-full items-center justify-center px-6"><div className="max-w-md text-center text-muted-foreground [&_svg]:mx-auto [&_svg]:mb-4 [&_svg]:size-7"><span>{icon}</span><h1 className="editorial-title text-2xl font-bold text-foreground">{title}</h1>{detail ? <p className="mt-3 text-sm">{detail}</p> : null}</div></section>
}
