import { Beaker, BookOpen, Network, Sparkles, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ConceptExplanationPanelProps {
  onClose?: () => void
  className?: string
  compactHeader?: boolean
}

export function ConceptExplanationPanel({
  onClose,
  className,
  compactHeader = false,
}: ConceptExplanationPanelProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-surface-soft", className)}>
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <BookOpen className="size-4 shrink-0" />
          <span className="truncate text-xs font-semibold uppercase tracking-[0.12em]">
            Concept explanation
          </span>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close concept explanation">
            <X />
          </Button>
        ) : null}
      </header>

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        <article className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-accent/45 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge variant="outline" className="border-primary/25 bg-background/70 text-primary">
                Demo explanation
              </Badge>
              <Sparkles className="size-4 text-primary/65" />
            </div>
            <h2 className={cn("editorial-title font-bold text-primary", compactHeader ? "text-2xl" : "text-[1.75rem]")}>Hamiltonian</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded bg-secondary px-2 py-1 font-mono text-[0.68rem] font-semibold">VI</span>
              <span>Toán tử Hamilton</span>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <section>
              <h3 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Giải thích ngắn
              </h3>
              <p lang="vi" className="leading-relaxed text-foreground">
                Hamiltonian là toán tử biểu diễn tổng năng lượng của một hệ lượng tử. Nó quyết định cách trạng thái của hệ thay đổi theo thời gian.
              </p>
              <p lang="en" className="mt-3 border-l-2 border-primary/20 pl-3 text-sm leading-relaxed text-muted-foreground">
                The Hamiltonian represents the total energy of a quantum system and governs how that system evolves over time.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Beaker className="size-3.5" />
                Chi tiết kỹ thuật
              </h3>
              <div className="rounded-lg bg-muted px-4 py-3 font-serif text-lg text-foreground">
                iℏ ∂ψ/∂t = Ĥψ
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary">•</span><span><strong className="text-foreground">Ĥ</strong> mô tả động năng và thế năng của hệ.</span></li>
                <li className="flex gap-2"><span className="text-primary">•</span><span><strong className="text-foreground">ψ</strong> là hàm sóng chứa thông tin về trạng thái lượng tử.</span></li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Network className="size-3.5" />
                Khái niệm liên quan
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Hàm sóng', 'Trạng thái riêng', 'Năng lượng toàn phần'].map((concept) => (
                  <Badge key={concept} variant="secondary" className="font-normal">{concept}</Badge>
                ))}
              </div>
            </section>
          </div>
        </article>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Sample content only. Concept generation and research grounding are planned for a later milestone.
        </p>
      </div>
    </div>
  )
}
