export interface MeetingMoment {
  utteranceId: string
  meetingId: string
  sourceText: string
  translatedText: string
  offsetMs: number
  bookmarked?: boolean
  noteContent?: string | null
}
