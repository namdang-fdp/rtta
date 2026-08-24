import Link from "next/link"
import { ArrowLeft, Clock3, NotebookPen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function NotesPage() {
  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-border pb-8">
          <Badge variant="outline" className="mb-3 text-primary">S05 foundation</Badge>
          <h1 className="editorial-title text-[clamp(2rem,5vw,3.35rem)] font-bold">Meeting Notes</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Notes will connect a research thought to the exact meeting moment, translation, and future recording timeline.
          </p>
        </header>

        <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-border bg-surface-soft/45 px-6 py-14 text-center">
            <div className="max-w-md">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent text-primary">
                <NotebookPen className="size-6" />
              </div>
              <h2 className="editorial-title text-2xl font-bold">A quiet place for important moments</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Notes captured during the meeting will appear here.
              </p>
              <Button asChild variant="outline" className="mt-6 rounded-full">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Return to Live
                </Link>
              </Button>
            </div>
          </section>

          <aside className="border-l-0 border-border lg:border-l lg:pl-7">
            <div className="flex items-center gap-2 text-primary">
              <Clock3 className="size-4" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Future note anatomy</h2>
            </div>
            <ol className="mt-5 space-y-5 text-sm leading-relaxed text-muted-foreground">
              <li><span className="mb-1 block font-medium text-foreground">Meeting moment</span>Timestamp and future recording position.</li>
              <li><span className="mb-1 block font-medium text-foreground">Translation context</span>Vietnamese primary text with English source.</li>
              <li><span className="mb-1 block font-medium text-foreground">Research thought</span>Your note, bookmark, and follow-up.</li>
            </ol>
            <p className="mt-7 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
              No notes backend or persistence is present in S05. Live notes remain clearly marked local drafts.
            </p>
          </aside>
        </div>
      </div>
    </section>
  )
}
