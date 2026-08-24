import { cn } from "@/lib/utils"

export function MarkdownContent({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cn("space-y-3 p-5 leading-relaxed", className)}>
      {markdown.split("\n").map((rawLine, index) => {
        const line = rawLine.trim()
        if (!line) return <div key={index} className="h-1" aria-hidden="true" />
        if (line.startsWith("### ")) return <h4 key={index} className="pt-2 font-semibold">{line.slice(4)}</h4>
        if (line.startsWith("## ")) return <h3 key={index} className="pt-3 font-serif text-lg font-bold text-primary">{line.slice(3)}</h3>
        if (line.startsWith("# ")) return <h2 key={index} className="pt-3 font-serif text-xl font-bold text-primary">{line.slice(2)}</h2>
        if (/^[-*] /.test(line)) return <p key={index} className="flex gap-2 pl-2"><span className="text-primary">•</span><span>{line.slice(2)}</span></p>
        return <p key={index} className="whitespace-pre-wrap">{line}</p>
      })}
    </div>
  )
}
