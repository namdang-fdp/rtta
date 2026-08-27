import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"

vi.mock("next/navigation", () => ({ usePathname: () => "/meetings" }))

describe("AppShell", () => {
  it("uses Vietnamese primary navigation", () => {
    render(<TooltipProvider><AppShell><div>Nội dung</div></AppShell></TooltipProvider>)

    expect(screen.getAllByRole("link", { name: "Trực tiếp" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Cuộc họp" }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("link", { name: "Transcript" })).not.toBeInTheDocument()
  })
})
