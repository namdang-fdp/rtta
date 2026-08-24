export function formatOffset(offsetMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function formatElapsed(startedAt: string | null, now = Date.now()): string {
  if (!startedAt) return "00:00"
  const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1_000))
  const hours = Math.floor(elapsedSeconds / 3_600)
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60)
  const seconds = elapsedSeconds % 60
  const clock = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  return hours > 0 ? `${hours}:${clock}` : clock
}
