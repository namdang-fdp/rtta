import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MarkdownContent } from "@/components/ai/markdown-content"

describe("MarkdownContent", () => {
  it("renders common Markdown syntax as safe rich content", () => {
    const { container } = render(
      <MarkdownContent markdown={"## Kết quả\n\n**Đậm** và *nghiêng*.\n\n- Mục một\n- Mục hai\n\n`mã`\n\n> Trích dẫn\n\n<script>alert('x')</script>"} />,
    )

    expect(screen.getByRole("heading", { name: "Kết quả" })).toBeInTheDocument()
    expect(screen.getByText("Đậm", { selector: "strong" })).toBeInTheDocument()
    expect(screen.getByText("nghiêng", { selector: "em" })).toBeInTheDocument()
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getByText("mã", { selector: "code" })).toBeInTheDocument()
    expect(container.querySelector("blockquote")).toBeInTheDocument()
    expect(container.querySelector("script")).not.toBeInTheDocument()
    expect(screen.queryByText("## Kết quả")).not.toBeInTheDocument()
  })
})
