import Link from "next/link"
import {
  Bookmark,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Languages,
  PlayCircle,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

const actionItems = [
  "So sánh các giới hạn kết hợp của hai cấu hình thí nghiệm.",
  "Đọc lại phần phương pháp đo trong bài báo nền.",
  "Chuẩn bị câu hỏi về khả năng mở rộng cho buổi thảo luận tiếp theo.",
]

const artifacts = [
  {
    vi: "Giới hạn không còn chỉ thuộc về vật lý lý thuyết; đây đã trở thành một nút thắt kỹ thuật về khả năng cách ly nhiệt.",
    en: "The limitation is no longer only theoretical physics; it has become an engineering bottleneck around thermal isolation.",
    at: "14:22",
  },
  {
    vi: "Điều quan trọng là phân biệt tương quan lượng tử với một tín hiệu có thể truyền nhanh hơn ánh sáng.",
    en: "It is important to distinguish quantum correlation from a signal that can travel faster than light.",
    at: "42:15",
  },
]

export function CompletedMeetingOverview() {
  return (
    <section className="quiet-scrollbar h-full overflow-y-auto bg-background px-4 py-7 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-6xl pb-20">
        <header className="mb-10 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-muted-foreground">
            <CalendarCheck className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Session concluded · Demo future state</span>
            <Badge variant="outline" className="ml-1 text-primary">No persistence</Badge>
          </div>
          <h1 className="editorial-title text-[clamp(2.15rem,5vw,3.75rem)] font-bold leading-[1.12]">
            Quantum Physics Seminar
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled title="Recording playback is planned for a later milestone">
              <PlayCircle className="size-4" />
              Replay audio
            </Button>
            <Button asChild variant="ghost" className="text-primary">
              <Link href="/transcript">
                <FileText className="size-4" />
                View full transcript
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-xl border bg-surface-soft p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
                  <Sparkles className="size-4" />
                </span>
                <h2 className="editorial-title text-2xl">Synthesis</h2>
              </div>
              <div lang="vi" className="space-y-4 font-serif text-[1.05rem] leading-[1.85] text-secondary-foreground sm:text-lg">
                <p>
                  Buổi hội thảo tập trung vào vướng víu lượng tử, khả năng duy trì sự kết hợp trên khoảng cách dài và những giới hạn thực nghiệm của mạng truyền thông lượng tử.
                </p>
                <p>
                  Phần thảo luận nhấn mạnh rằng các trở ngại hiện tại chủ yếu nằm ở độ ổn định của vật liệu, khả năng cách ly với môi trường và phương pháp đo — không phải ở việc thiếu một mô hình toán học.
                </p>
              </div>
              <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                Static sample only. No summarization model or meeting artifact backend is called in S05.
              </p>
            </section>

            <section className="rounded-xl border bg-card p-6 sm:p-8">
              <h2 className="editorial-title mb-6 text-2xl">Key artifacts</h2>
              <div className="space-y-6">
                {artifacts.map((artifact) => (
                  <article key={artifact.at} className="flex gap-4">
                    <Bookmark className="mt-1 size-5 shrink-0 text-primary/65" />
                    <div>
                      <blockquote lang="vi" className="font-serif text-lg italic leading-relaxed sm:text-xl">“{artifact.vi}”</blockquote>
                      <p lang="en" className="mt-2 text-sm italic leading-relaxed text-muted-foreground">“{artifact.en}”</p>
                      <span className="mt-3 inline-block rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{artifact.at}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-xl border bg-surface-soft p-6">
              <div className="mb-5 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-muted-foreground" />
                <h2 className="editorial-title text-2xl">Action items</h2>
              </div>
              <ul className="space-y-4">
                {actionItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Checkbox disabled aria-label={`Future action item: ${item}`} className="mt-1" />
                    <span lang="vi" className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border bg-card p-6">
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Session metadata</h2>
              <dl className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4 border-b pb-3">
                  <dt className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4" />Duration</dt>
                  <dd className="font-medium">1h 15m</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-b pb-3">
                  <dt className="flex items-center gap-2 text-muted-foreground"><Languages className="size-4" />Language</dt>
                  <dd className="font-medium">EN → VI</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Artifact state</dt>
                  <dd className="font-medium">Demo only</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </section>
  )
}
