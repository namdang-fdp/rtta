"use client"

import { useCallback, useEffect, useRef } from "react"

interface UseAutoFollowOptions {
  followLive: boolean
  onFollowLiveChange: (followLive: boolean) => void
  contentVersion: string
}

const BOTTOM_THRESHOLD_PX = 72

export function useAutoFollow({
  followLive,
  onFollowLiveChange,
  contentVersion,
}: UseAutoFollowOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const programmaticScroll = useRef(false)
  const userScrollIntent = useRef(false)
  const lastScrollTop = useRef(0)
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const releaseProgrammaticScroll = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current)
    releaseTimer.current = setTimeout(() => {
      programmaticScroll.current = false
    }, 180)
  }, [])

  const scrollToEnd = useCallback(
    (behavior: ScrollBehavior) => {
      programmaticScroll.current = true
      endRef.current?.scrollIntoView({ block: "end", behavior })
      releaseProgrammaticScroll()
    },
    [releaseProgrammaticScroll],
  )

  const jumpToLive = useCallback(() => {
    onFollowLiveChange(true)
    scrollToEnd("smooth")
  }, [onFollowLiveChange, scrollToEnd])

  useEffect(() => {
    if (followLive) scrollToEnd("smooth")
  }, [contentVersion, followLive, scrollToEnd])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    lastScrollTop.current = container.scrollTop

    const markUserIntent = () => {
      userScrollIntent.current = true
      programmaticScroll.current = false
      if (releaseTimer.current) {
        clearTimeout(releaseTimer.current)
        releaseTimer.current = null
      }
    }
    const markWheelIntent = (event: WheelEvent) => {
      if (event.deltaY < 0) markUserIntent()
    }
    const markPointerIntent = () => {
      markUserIntent()
    }
    const markKeyboardIntent = (event: KeyboardEvent) => {
      if (["ArrowUp", "PageUp", "Home"].includes(event.key)) {
        markUserIntent()
      }
    }
    const handleScroll = () => {
      const movedUp = container.scrollTop < lastScrollTop.current - 3
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight

      if (
        followLive &&
        !programmaticScroll.current &&
        userScrollIntent.current &&
        movedUp &&
        distanceFromBottom > BOTTOM_THRESHOLD_PX
      ) {
        onFollowLiveChange(false)
      }
      lastScrollTop.current = container.scrollTop
      userScrollIntent.current = false
    }

    container.addEventListener("wheel", markWheelIntent, { passive: true })
    container.addEventListener("pointerdown", markPointerIntent, { passive: true })
    container.addEventListener("keydown", markKeyboardIntent)
    container.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      container.removeEventListener("wheel", markWheelIntent)
      container.removeEventListener("pointerdown", markPointerIntent)
      container.removeEventListener("keydown", markKeyboardIntent)
      container.removeEventListener("scroll", handleScroll)
      if (releaseTimer.current) clearTimeout(releaseTimer.current)
    }
  }, [followLive, onFollowLiveChange])

  return { containerRef, endRef, jumpToLive }
}
