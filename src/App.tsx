import { useEffect, useMemo, useState } from "react";
import { Data, label, load, save, shift, today } from "./storage";

const PRAYERS = [
  ["Fajr", "الفجر"],
  ["Dhuhr", "الظهر"],
  ["Asr", "العصر"],
  ["Maghrib", "المغرب"],
  ["Isha", "العشاء"],
] as const;

const empty = () => [0, 0, 0, 0, 0];

function Star({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 shrink-0" aria-hidden>
      <path
        d="M12 1.5 15.2 4.8 19.8 4.2 19.2 8.8 22.5 12 19.2 15.2 19.8 19.8 15.2 19.2 12 22.5 8.8 19.2 4.2 19.8 4.8 15.2 1.5 12 4.8 8.8 4.2 4.2 8.8 4.8Z"
        strokeWidth="1.3"
        strokeLinejoin="round"
        className={on ? "fill-pine stroke-pine" : "fill-none stroke-line"}
      />
      {on && (
        <path
          d="M8 12.2l2.7 2.7L16 9.5"
          fill="none"
          stroke="var(--paper)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState<Data>({});
  const [start, setStart] = useState(today());
  const [date, setDate] = useState(today());
  const [tab, setTab] = useState<"day" | "missed">("day");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    load().then((r) => {
      setData(r.data);
      setStart(r.start);
    });
  }, []);

  const toggle = (d: string, i: number) => {
    const flags = [...(data[d] ?? empty())];
    flags[i] = flags[i] ? 0 : 1;
    const next = { ...data, [d]: flags };
    setData(next);
    save(d, next).catch(() => {});
  };

  const missed = useMemo(() => {
    const out: { d: string; idx: number[] }[] = [];
    for (let d = shift(today(), -1); d >= start; d = shift(d, -1)) {
      const idx = (data[d] ?? empty()).flatMap((v, i) => (v ? [] : [i]));
      if (idx.length) out.push({ d, idx });
    }
    return out;
  }, [data, start]);

  const flags = data[date] ?? empty();
  const isToday = date === today();
  const tabCls = (t: string) =>
    `pb-1 text-base border-b-2 ${tab === t ? "border-brass text-ink" : "border-transparent text-ink/50"}`;

  return (
    <main className="mx-auto max-w-md px-6 pb-16 pt-8">
      <header className="mb-10 flex items-baseline justify-between">
        <h1 className="font-serif text-4xl">Salah</h1>
        <nav className="flex gap-6">
          <button className={tabCls("day")} onClick={() => setTab("day")}>
            Day
          </button>
          <button className={tabCls("missed")} onClick={() => setTab("missed")}>
            Missed{missed.length ? ` (${missed.length})` : ""}
          </button>
        </nav>
      </header>

      {tab === "day" ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <button
              aria-label="Previous day"
              className="px-3 py-2 text-2xl text-ink/60"
              onClick={() => setDate(shift(date, -1))}
            >
              ‹
            </button>
            <div className="text-center">
              <div className="font-serif text-2xl">{isToday ? "Today" : label(date)}</div>
              <div className="text-sm text-ink/50">{flags.filter(Boolean).length} of 5 prayed</div>
            </div>
            <button
              aria-label="Next day"
              disabled={isToday}
              className="px-3 py-2 text-2xl text-ink/60 disabled:opacity-20"
              onClick={() => setDate(shift(date, 1))}
            >
              ›
            </button>
          </div>
          <ul className="mt-6">
            {PRAYERS.map(([en, ar], i) => (
              <li key={en} className="border-b border-line last:border-0">
                <button
                  onClick={() => toggle(date, i)}
                  aria-pressed={!!flags[i]}
                  className="flex w-full items-center gap-4 py-4 text-left"
                >
                  <Star on={!!flags[i]} />
                  <span className="flex-1 text-lg">{en}</span>
                  <span lang="ar" dir="rtl" className="font-serif text-2xl text-brass">
                    {ar}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : missed.length === 0 ? (
        <p className="mt-16 text-center font-serif text-2xl text-ink/70">
          No missed prayers. Alhamdulillah.
        </p>
      ) : (
        <section>
          <p className="mb-6 text-sm text-ink/50">Tap a prayer to mark it done.</p>
          <ul>
            {missed.map(({ d, idx }) => (
              <li key={d} className="border-b border-line py-4 last:border-0">
                <div className="mb-3 font-serif text-xl">{label(d)}</div>
                <div className="flex flex-wrap gap-2">
                  {idx.map((i) => (
                    <button
                      key={i}
                      onClick={() => toggle(d, i)}
                      className="rounded-full border border-brass px-4 py-1.5 text-sm active:bg-brass/20"
                    >
                      {PRAYERS[i][0]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
