"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AudioLines,
  CalendarDays,
  LogOut,
} from "lucide-react"

import { useAuth } from "@/components/auth/auth-gate"
import { RttaMark } from "@/components/brand/rtta-mark"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navigation = [
  { section: "live", href: "/", label: "Trực tiếp", icon: AudioLines },
  { section: "meetings", href: "/meetings", label: "Cuộc họp", icon: CalendarDays },
] as const

function resolveNavigation(pathname: string) {
  return navigation.map((item) => {
    const active = item.section === "live" ? pathname === "/" : pathname.startsWith("/meetings")
    return { ...item, active }
  })
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const pathname = usePathname()
  const resolvedNavigation = resolveNavigation(pathname)

  return (
    <div className="h-dvh min-h-[620px] overflow-hidden bg-surface-canvas text-foreground">
      <div className="grid h-full grid-cols-1 sm:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden h-full flex-col border-r border-sidebar-border/80 bg-sidebar px-3 py-5 sm:flex xl:px-4 xl:py-7">
          <Link
            href="/"
            className="mb-9 flex min-h-11 items-center justify-center gap-3 xl:justify-start xl:px-2"
            aria-label="Không gian trực tiếp RTTA"
          >
            <RttaMark className="size-10" />
            <span className="hidden min-w-0 xl:block">
              <span className="editorial-title block truncate text-[1.3rem] font-bold leading-tight text-primary">
                RTTA
              </span>
              <span className="mt-1 block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Nghiên cứu trực tiếp
              </span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-2" aria-label="Điều hướng chính">
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
                        "group flex h-12 items-center justify-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-sidebar-foreground transition-[background-color,border-color,color] duration-200 ease-soft xl:justify-start",
                        active
                          ? "border-sidebar-border/60 bg-sidebar-accent/85 text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/60 hover:text-foreground",
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
                <span className="block truncate text-sm font-medium text-foreground">Không gian RTTA</span>
                <span className="block truncate text-xs text-muted-foreground">Nghiên cứu cuộc họp</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => void auth?.logout()}
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground xl:justify-start xl:px-2"
              aria-label="Đăng xuất"
            >
              <LogOut className="size-4" />
              <span className="hidden xl:inline">Đăng xuất</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col overflow-hidden 2xl:p-3 2xl:pl-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden 2xl:rounded-3xl 2xl:border 2xl:border-border/80 2xl:bg-background 2xl:shadow-surface">
            <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:hidden">
              <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold text-primary">
                <RttaMark className="size-7" />
                RTTA
              </Link>
              <span className="text-xs font-medium tracking-wide text-muted-foreground">EN → VI</span>
            </header>
            <main className="min-h-0 min-w-0 flex-1 overflow-hidden pb-16 sm:pb-0">{children}</main>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-2 border-t bg-background/95 px-2 backdrop-blur-md sm:hidden" aria-label="Điều hướng chính">
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
