import { BookOpenText, FileText, FolderOpen, Languages, LibraryBig, Presentation } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { demoContextDocuments, demoTerminology } from "@/lib/demo/meeting"

export function ResearchContextPage() {
  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-6xl pb-20">
        <header className="border-b border-border pb-8">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="text-primary">Demo research material</Badge>
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">English → Vietnamese</span>
          </div>
          <h1 className="editorial-title text-[clamp(2rem,5vw,3.4rem)] font-bold">Research Context</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Papers, slides, terminology, and references that help make the current physics seminar easier to understand.
          </p>
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-12 lg:gap-8">
          <section className="space-y-6 lg:col-span-5">
            <h2 className="editorial-title flex items-center gap-2 text-2xl font-normal">
              <FolderOpen className="size-5 text-primary" />
              Active documents
            </h2>
            <div className="space-y-4">
              {demoContextDocuments.map((document) => (
                <article key={document.title} className="rounded-lg border bg-surface-soft p-5 transition-colors hover:bg-muted">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      {document.kind === "Paper" ? <FileText className="size-5" /> : <Presentation className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{document.title}</h3>
                        <Badge variant="outline" className="h-4 px-1.5 text-[0.62rem]">{document.kind}</Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{document.description}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{document.meta}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-lg border border-dashed px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              <LibraryBig className="mb-2 size-5 text-primary" />
              File upload and document grounding are intentionally not implemented in S05.
            </div>
          </section>

          <section className="space-y-6 lg:col-span-7 lg:border-l lg:border-border lg:pl-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="editorial-title flex items-center gap-2 text-2xl font-normal">
                <Languages className="size-5 text-primary" />
                Relevant terminology
              </h2>
              <span className="hidden text-xs text-muted-foreground sm:inline">Static examples</span>
            </div>

            <div className="space-y-7">
              {demoTerminology.map((entry, index) => (
                <article
                  key={entry.term}
                  className={`border-l-2 pl-5 ${index === 2 ? "border-border opacity-75" : "border-primary"}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="editorial-title text-[1.45rem]">{entry.term}</h3>
                    <span lang="vi" className="text-sm font-medium text-primary">{entry.vi}</span>
                  </div>
                  <p lang="vi" className="mt-2 text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {entry.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-8 flex items-start gap-3 border-t pt-6 text-sm text-muted-foreground">
              <BookOpenText className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                These static terms are reading references only. They do not influence live speech recognition.
              </p>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
