import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const apiUrl = "https://api-rtta.dorriss.com"

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function request(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const [url, init] = fetchMock.mock.calls[call] as [string, RequestInit]
  return { url, init, headers: new Headers(init.headers) }
}

describe("authenticated API mutations", () => {
  beforeEach(() => {
    vi.resetModules()
    window.__RTTA_CONFIG__ = {
      apiUrl,
      liveWebSocketUrl: "wss://api-rtta.dorriss.com/ws/live",
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.__RTTA_CONFIG__
  })

  it("uses the current restored-session CSRF token for Explain JSON", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ authenticated: true, csrfToken: "restored-token" }))
      .mockResolvedValueOnce(response({ id: "explanation-1" }))
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthSession } = await import("@/lib/api/client")
    const { explainConcept } = await import("@/lib/api/ai")
    await getAuthSession()
    await explainConcept("meeting-1", {
      utteranceId: "utterance-1",
      selectedText: "Hamiltonian",
      depth: "QUICK",
    })

    const auth = request(fetchMock, 0)
    const explain = request(fetchMock, 1)
    expect(auth.url).toBe(`${apiUrl}/api/auth/me`)
    expect(auth.init.credentials).toBe("include")
    expect(explain.url).toBe(`${apiUrl}/api/meetings/meeting-1/ai/explain`)
    expect(explain.init.credentials).toBe("include")
    expect(explain.headers.get("X-CSRF-TOKEN")).toBe("restored-token")
    expect(explain.headers.get("Content-Type")).toBe("application/json")
    expect(explain.init.body).toBe(JSON.stringify({
      utteranceId: "utterance-1",
      selectedText: "Hamiltonian",
      depth: "QUICK",
    }))
  })

  it("obtains and uses a CSRF token before an authenticated Summary POST", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ authenticated: true, csrfToken: "summary-token" }))
      .mockResolvedValueOnce(response({ id: "summary-1" }))
    vi.stubGlobal("fetch", fetchMock)

    const { generateMeetingSummary } = await import("@/lib/api/summaries")
    await generateMeetingSummary("meeting-2")

    const summary = request(fetchMock, 1)
    expect(summary.url).toBe(`${apiUrl}/api/meetings/meeting-2/summary`)
    expect(summary.init.credentials).toBe("include")
    expect(summary.headers.get("X-CSRF-TOKEN")).toBe("summary-token")
    expect(summary.init.method).toBe("POST")
  })

  it("replaces the pre-login token with the token returned after login", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ authenticated: false, csrfToken: "anonymous-token" }))
      .mockResolvedValueOnce(response({ authenticated: true, csrfToken: "logged-in-token" }))
      .mockResolvedValueOnce(response({ id: "summary-1" }))
    vi.stubGlobal("fetch", fetchMock)

    const { loginHousehold } = await import("@/lib/api/client")
    const { generateMeetingSummary } = await import("@/lib/api/summaries")
    await loginHousehold("household-code")
    await generateMeetingSummary("meeting-3")

    const login = request(fetchMock, 1)
    const summary = request(fetchMock, 2)
    expect(login.init.credentials).toBe("include")
    expect(login.headers.get("X-CSRF-TOKEN")).toBe("anonymous-token")
    expect(summary.headers.get("X-CSRF-TOKEN")).toBe("logged-in-token")
  })

  it("keeps bookmark and note mutations on the authenticated client", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ authenticated: true, csrfToken: "mutation-token" }))
      .mockResolvedValueOnce(response({ id: "bookmark-1" }))
      .mockResolvedValueOnce(response(undefined, 204))
      .mockResolvedValueOnce(response({ id: "note-1" }))
      .mockResolvedValueOnce(response({ id: "note-1", content: "Updated" }))
      .mockResolvedValueOnce(response(undefined, 204))
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthSession } = await import("@/lib/api/client")
    const { createBookmark, deleteBookmark } = await import("@/lib/api/bookmarks")
    const { createNote, deleteNote, updateNote } = await import("@/lib/api/notes")
    await getAuthSession()
    await createBookmark("meeting-4", { label: "Important" })
    await deleteBookmark("meeting-4", "bookmark-1")
    await createNote("meeting-4", { content: "Research this" })
    await updateNote("meeting-4", "note-1", "Updated")
    await deleteNote("meeting-4", "note-1")

    for (let call = 1; call < fetchMock.mock.calls.length; call += 1) {
      const mutation = request(fetchMock, call)
      expect(mutation.init.credentials).toBe("include")
      expect(mutation.headers.get("X-CSRF-TOKEN")).toBe("mutation-token")
    }
    expect(request(fetchMock, 1).headers.get("Content-Type")).toBe("application/json")
    expect(request(fetchMock, 3).headers.get("Content-Type")).toBe("application/json")
    expect(request(fetchMock, 4).headers.get("Content-Type")).toBe("application/json")
  })
})
