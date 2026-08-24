"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AudioLines,
  BookOpenText,
  FileText,
  LibraryBig,
  NotebookPen,
  RadioTower,
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navigation = [
  { section: "live", href: "/", label: "Live", icon: AudioLines },
  { section: "transcript", href: "/transcript", label: "Transcript", icon: FileText },
  { section: "notes", href: "/notes", label: "Notes", icon: NotebookPen },
  { section: "context", href: "/context", label: "Context", icon: BookOpenText },
] as const

function resolveNavigation(pathname: string) {
  const meetingMatch = pathname.match(/^\/meetings\/([^/]+)/)
  const meetingBase = meetingMatch ? `/meetings/${meetingMatch[1]}` : null

  return navigation.map((item) => {
    const href = meetingBase && item.section !== "live"
      ? `${meetingBase}/${item.section}`
      : item.href
    const active = item.section === "live"
      ? pathname === "/"
      : pathname === item.href || pathname === `${meetingBase}/${item.section}`

    return { ...item, href, active }
  })
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const resolvedNavigation = resolveNavigation(pathname)

  return (
    <div className="h-dvh min-h-[620px] overflow-hidden bg-background text-foreground">
      <div className="grid h-full grid-cols-1 sm:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden h-full flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 sm:flex xl:px-4 xl:py-7">
          <Link
            href="/"
            className="mb-9 flex min-h-11 items-center justify-center gap-3 xl:justify-start xl:px-2"
            aria-label="RTTA Live workspace"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
              <RadioTower className="size-5" strokeWidth={1.8} />
            </span>
            <span className="hidden min-w-0 xl:block">
              <span className="editorial-title block truncate text-[1.3rem] font-bold leading-tight text-primary">
                Research Alpha
              </span>
              <span className="mt-1 block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                EN → VI Stream
              </span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-2" aria-label="Meeting workspace">
            {resolvedNavigation.map((item) => {
              const { active } = item
              const Icon = item.icon

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex h-12 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors xl:justify-start",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/65 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-[1.15rem] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="xl:hidden">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border pt-4">
            <div className="flex items-center justify-center gap-3 xl:justify-start xl:px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                RT
              </span>
              <span className="hidden min-w-0 xl:block">
                <span className="block truncate text-sm font-medium text-foreground">RTTA Workspace</span>
                <span className="block truncate text-xs text-muted-foreground">Local research session</span>
              </span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:hidden">
            <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold text-primary">
              <LibraryBig className="size-5" />
              RTTA Web
            </Link>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">EN → VI</span>
          </header>
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden pb-16 sm:pb-0">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-4 border-t bg-background/95 px-2 backdrop-blur-md sm:hidden" aria-label="Meeting workspace">
        {resolvedNavigation.map((item) => {
          const { active } = item
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[0.65rem] font-medium text-muted-foreground",
                active && "text-primary",
              )}
            >
              <span className={cn("rounded-full px-4 py-1", active && "bg-accent")}>
                <Icon className="size-[1.1rem]" />
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
