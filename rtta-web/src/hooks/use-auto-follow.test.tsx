import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAutoFollow } from "@/hooks/use-auto-follow"

function AutoFollowHarness() {
  const [followLive, setFollowLive] = useState(true)
  const [version, setVersion] = useState(0)
  const { containerRef, endRef, jumpToLive } = useAutoFollow({
    followLive,
    onFollowLiveChange: setFollowLive,
    contentVersion: String(version),
  })

  return (
    <div>
      <div ref={containerRef} data-testid="scroll-container" tabIndex={0}>
        <div>Translation {version}</div>
        <div ref={endRef}>End</div>
      </div>
      <output data-testid="follow-state">{followLive ? "following" : "paused"}</output>
      <button onClick={() => setVersion((current) => current + 1)}>New event</button>
      <button onClick={jumpToLive}>Jump to live</button>
    </div>
  )
}

describe("useAutoFollow", () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("follows normally when new translation content arrives", () => {
    render(<AutoFollowHarness />)
    expect(scrollIntoView).toHaveBeenCalled()
    const callsBefore = scrollIntoView.mock.calls.length

    fireEvent.click(screen.getByRole("button", { name: "New event" }))

    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(screen.getByTestId("follow-state")).toHaveTextContent("following")
  })

  it("pauses on intentional upward scrolling and does not steal the viewport", () => {
    render(<AutoFollowHarness />)
    const container = screen.getByTestId("scroll-container")
    Object.defineProperties(container, {
      scrollHeight: { configurable: true, value: 1_200 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 650 },
    })
    fireEvent.scroll(container)
    fireEvent.wheel(container, { deltaY: -120 })
    container.scrollTop = 350
    fireEvent.scroll(container)
    expect(screen.getByTestId("follow-state")).toHaveTextContent("paused")

    const callsBefore = scrollIntoView.mock.calls.length
    fireEvent.click(screen.getByRole("button", { name: "New event" }))
    expect(scrollIntoView).toHaveBeenCalledTimes(callsBefore)
  })

  it("resumes follow mode when Jump to live is used", () => {
    render(<AutoFollowHarness />)
    const container = screen.getByTestId("scroll-container")
    Object.defineProperties(container, {
      scrollHeight: { configurable: true, value: 1_200 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 650 },
    })
    fireEvent.scroll(container)
    fireEvent.wheel(container, { deltaY: -120 })
    container.scrollTop = 300
    fireEvent.scroll(container)
    expect(screen.getByTestId("follow-state")).toHaveTextContent("paused")

    const callsBefore = scrollIntoView.mock.calls.length
    fireEvent.click(screen.getByRole("button", { name: "Jump to live" }))

    expect(screen.getByTestId("follow-state")).toHaveTextContent("following")
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
