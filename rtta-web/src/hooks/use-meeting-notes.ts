"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { createNote, deleteNote, listNotes, updateNote } from "@/lib/api/notes"
import type { ResearchNoteDto } from "@/types/api"
import type { MeetingMoment } from "@/types/meeting"

interface NotesState {
  meetingId: string | null
  notes: ResearchNoteDto[]
  error: string | null
}

const EMPTY_NOTES: ResearchNoteDto[] = []

export function useMeetingNotes(meetingId: string | null) {
  const [state, setState] = useState<NotesState>({ meetingId: null, notes: [], error: null })
  const [target, setTarget] = useState<MeetingMoment | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setTarget(null)
      if (!meetingId) {
        setState({ meetingId: null, notes: [], error: null })
        return
      }
      try {
        const notes = await listNotes(meetingId, controller.signal)
        if (!controller.signal.aborted) setState({ meetingId, notes, error: null })
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setState({
          meetingId,
          notes: [],
          error: "Không thể tải ghi chú. Vui lòng thử lại.",
        })
      }
    }

    void load()
    return () => controller.abort()
  }, [meetingId])

  const notes = state.meetingId === meetingId ? state.notes : EMPTY_NOTES
  const noteByUtteranceId = useMemo(
    () => Object.fromEntries(notes
      .filter((note): note is ResearchNoteDto & { utteranceId: string } => Boolean(note.utteranceId))
      .map((note) => [note.utteranceId, note])),
    [notes],
  )
  const notedIds = useMemo(() => new Set(Object.keys(noteByUtteranceId)), [noteByUtteranceId])

  const saveTarget = useCallback(async (content: string) => {
    if (!meetingId || !target || saving || !content.trim()) return
    setSaving(true)
    setState((current) => ({ ...current, error: null }))
    try {
      const existing = noteByUtteranceId[target.utteranceId]
      const saved = existing
        ? await updateNote(meetingId, existing.id, content.trim())
        : await createNote(meetingId, { utteranceId: target.utteranceId, content: content.trim() })
      setState((current) => current.meetingId === meetingId ? ({
        meetingId,
        notes: existing
          ? current.notes.map((note) => note.id === saved.id ? saved : note)
          : [...current.notes, saved],
        error: null,
      }) : current)
      setTarget(null)
    } catch {
      setState((current) => current.meetingId === meetingId ? ({
        ...current,
        error: "Không thể lưu ghi chú. Vui lòng thử lại.",
      }) : current)
    } finally {
      setSaving(false)
    }
  }, [meetingId, noteByUtteranceId, saving, target])

  const addGeneral = useCallback(async (content: string) => {
    if (!meetingId || saving || !content.trim()) return false
    setSaving(true)
    setState((current) => ({ ...current, error: null }))
    try {
      const saved = await createNote(meetingId, { content: content.trim() })
      setState((current) => current.meetingId === meetingId ? ({
        meetingId,
        notes: [...current.notes, saved],
        error: null,
      }) : current)
      return true
    } catch {
      setState((current) => current.meetingId === meetingId ? ({
        ...current,
        error: "Không thể lưu ghi chú. Vui lòng thử lại.",
      }) : current)
      return false
    } finally {
      setSaving(false)
    }
  }, [meetingId, saving])

  const edit = useCallback(async (noteId: string, content: string) => {
    if (!meetingId || saving || !content.trim()) return false
    setSaving(true)
    setState((current) => ({ ...current, error: null }))
    try {
      const saved = await updateNote(meetingId, noteId, content.trim())
      setState((current) => current.meetingId === meetingId ? ({
        meetingId,
        notes: current.notes.map((note) => note.id === saved.id ? saved : note),
        error: null,
      }) : current)
      return true
    } catch {
      setState((current) => current.meetingId === meetingId ? ({
        ...current,
        error: "Không thể cập nhật ghi chú. Vui lòng thử lại.",
      }) : current)
      return false
    } finally {
      setSaving(false)
    }
  }, [meetingId, saving])

  const remove = useCallback(async (noteId: string) => {
    if (!meetingId || saving) return
    setSaving(true)
    setState((current) => ({ ...current, error: null }))
    try {
      await deleteNote(meetingId, noteId)
      setState((current) => current.meetingId === meetingId ? ({
        meetingId,
        notes: current.notes.filter((note) => note.id !== noteId),
        error: null,
      }) : current)
    } catch {
      setState((current) => current.meetingId === meetingId ? ({
        ...current,
        error: "Không thể xóa ghi chú. Vui lòng thử lại.",
      }) : current)
    } finally {
      setSaving(false)
    }
  }, [meetingId, saving])

  return {
    notes,
    notedIds,
    noteByUtteranceId,
    target,
    saving,
    error: state.meetingId === meetingId ? state.error : null,
    open: setTarget,
    close: () => setTarget(null),
    saveTarget,
    addGeneral,
    edit,
    remove,
    clearError: () => setState((current) => ({ ...current, error: null })),
  }
}
