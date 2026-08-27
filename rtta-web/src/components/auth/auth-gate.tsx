"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

import { RttaMark } from "@/components/brand/rtta-mark"
import { getAuthSession, loginHousehold, logoutHousehold } from "@/lib/api/client"

interface AuthContextValue { logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() { return useContext(AuthContext) }

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    void getAuthSession()
      .then((session) => active && setAuthenticated(session.authenticated))
      .catch(() => active && setAuthenticated(false))
    const unauthenticated = () => setAuthenticated(false)
    window.addEventListener("rtta:unauthenticated", unauthenticated)
    return () => {
      active = false
      window.removeEventListener("rtta:unauthenticated", unauthenticated)
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutHousehold()
    setAuthenticated(false)
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const session = await loginHousehold(code)
      setCode("")
      setAuthenticated(session.authenticated)
    } catch {
      setError("Mã gia đình không đúng hoặc tạm thời chưa thể sử dụng.")
    } finally {
      setPending(false)
    }
  }

  if (authenticated === null) {
    return <div className="min-h-dvh bg-surface-canvas" aria-label="Đang kiểm tra phiên RTTA" />
  }
  if (!authenticated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-surface-canvas px-5 py-12 text-foreground">
        <section className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-float sm:p-10">
          <div className="flex items-center gap-4">
            <RttaMark className="size-14" />
            <div>
              <h1 className="editorial-title text-3xl font-bold text-primary">RTTA</h1>
              <p className="mt-1 text-sm text-muted-foreground">Chào mừng trở lại</p>
            </div>
          </div>
          <form className="mt-8" onSubmit={(event) => void submit(event)}>
            <label className="text-sm font-semibold" htmlFor="household-code">Mã gia đình</label>
            <input
              id="household-code" type="password" autoComplete="current-password"
              value={code} onChange={(event) => setCode(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              required autoFocus
            />
            {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
            <button type="submit" disabled={pending} className="mt-6 h-12 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              {pending ? "Đang kết nối…" : "Vào RTTA"}
            </button>
          </form>
        </section>
      </main>
    )
  }
  return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>
}
