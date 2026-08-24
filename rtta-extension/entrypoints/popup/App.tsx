import { Languages } from 'lucide-react';

function App() {
  return (
    <main className="w-80 bg-pink-50 p-5 text-pink-950">
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-pink-200 text-pink-700">
          <Languages aria-hidden="true" size={22} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">RTTA</h1>
          <p className="text-xs text-pink-700">Real-Time Translation AI</p>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-pink-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <span className="inline-flex items-center gap-2 text-sm text-pink-700">
            <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Ready
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-pink-100 px-3 py-2 text-center text-sm font-medium">
          English <span aria-hidden="true">→</span> Vietnamese
        </div>

        <button
          className="mt-4 w-full cursor-not-allowed rounded-xl bg-pink-300 px-4 py-2.5 text-sm font-semibold text-white opacity-70"
          type="button"
          disabled
        >
          Start Translation
        </button>
      </section>
    </main>
  );
}

export default App;
