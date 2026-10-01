// Data: "YYYY-MM-DD" -> [fajr, dhuhr, asr, maghrib, isha] (1 = prayed)
// Stored in Telegram CloudStorage as one key per month: "YYYY-MM" -> {"29":[1,1,0,1,0]}
// plus a "start" key. Falls back to localStorage when opened outside Telegram.
export type Data = Record<string, number[]>;

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Cb<T> = (err: string | null, v?: T) => void;
const p = <T,>(fn: (cb: Cb<T>) => void) =>
  new Promise<T>((res, rej) => fn((e, v) => (e ? rej(e) : res(v as T))));

const cs = window.Telegram?.WebApp?.CloudStorage;

const kv = cs
  ? {
      keys: () => p<string[]>((cb) => cs.getKeys(cb)),
      items: (k: string[]) =>
        k.length ? p<Record<string, string>>((cb) => cs.getItems(k, cb)) : Promise.resolve({} as Record<string, string>),
      set: (k: string, v: string) => p<boolean>((cb) => cs.setItem(k, v, cb)),
    }
  : {
      keys: async () =>
        Object.keys(localStorage).filter((k) => k.startsWith("p:")).map((k) => k.slice(2)),
      items: async (k: string[]) =>
        Object.fromEntries(k.map((x) => [x, localStorage.getItem("p:" + x) ?? ""])),
      set: async (k: string, v: string) => (localStorage.setItem("p:" + k, v), true),
    };

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const shift = (d: string, n: number) => {
  const [y, m, day] = d.split("-").map(Number);
  return iso(new Date(y, m - 1, day + n));
};
export const label = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export async function load(): Promise<{ data: Data }> {
  const keys = await kv.keys();
  const items = await kv.items(keys);
  const data: Data = {};
  for (const [k, v] of Object.entries(items)) {
    if (!/^\d{4}-\d{2}$/.test(k) || !v) continue;
    try {
      for (const [day, flags] of Object.entries(JSON.parse(v) as Record<string, number[]>)) {
        data[`${k}-${day}`] = flags;
      }
    } catch {}
  }
  return { data };
}

export async function save(date: string, data: Data) {
  const month = date.slice(0, 7);
  const obj: Record<string, number[]> = {};
  for (const [d, f] of Object.entries(data)) if (d.startsWith(month)) obj[d.slice(8)] = f;
  await kv.set(month, JSON.stringify(obj));
}
