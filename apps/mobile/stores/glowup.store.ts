import { create } from "zustand";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "lumis-glowup" });
const KEY = "glowup_state";

// Local date key (yyyy-mm-dd) — streaks are day-based in the user's timezone.
export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86400000);
}

interface Persisted {
  streak: number;
  bestStreak: number;
  lastCheckIn: string | null;
  checkInDates: string[];
  planLength: number | null;
  planStart: string | null;
}

const DEFAULTS: Persisted = {
  streak: 0,
  bestStreak: 0,
  lastCheckIn: null,
  checkInDates: [],
  planLength: null,
  planStart: null,
};

function load(): Persisted {
  const raw = storage.getString(KEY);
  if (raw) {
    try {
      return { ...DEFAULTS, ...(JSON.parse(raw) as Persisted) };
    } catch {
      /* ignore corrupt state */
    }
  }
  return DEFAULTS;
}

function save(s: Persisted) {
  storage.set(KEY, JSON.stringify(s));
}

interface GlowUpState extends Persisted {
  /** Mark today done: bumps the streak (resets if a day was missed). No-op if already done today. */
  checkInToday: () => void;
  startPlan: (length: number) => void;
  resetPlan: () => void;
}

export const useGlowUpStore = create<GlowUpState>((set, get) => ({
  ...load(),

  checkInToday: () => {
    const s = get();
    const today = todayStr();
    if (s.lastCheckIn === today) return; // already checked in

    const continued = s.lastCheckIn != null && daysBetween(s.lastCheckIn, today) === 1;
    const streak = continued ? s.streak + 1 : 1;
    const checkInDates = s.checkInDates.includes(today) ? s.checkInDates : [...s.checkInDates, today];
    const bestStreak = Math.max(s.bestStreak, streak);

    const next: Persisted = { ...s, streak, bestStreak, lastCheckIn: today, checkInDates };
    save(next);
    set({ streak, bestStreak, lastCheckIn: today, checkInDates });
  },

  startPlan: (length) => {
    const s = get();
    const planStart = todayStr();
    const next: Persisted = { ...s, planLength: length, planStart };
    save(next);
    set({ planLength: length, planStart });
  },

  resetPlan: () => {
    const s = get();
    const next: Persisted = { ...s, planLength: null, planStart: null };
    save(next);
    set({ planLength: null, planStart: null });
  },
}));

/** Count of check-ins that fall inside the active plan window. */
export function planProgress(
  checkInDates: string[],
  planStart: string | null,
  planLength: number | null,
): number {
  if (!planStart || !planLength) return 0;
  return checkInDates.filter((d) => {
    const diff = daysBetween(planStart, d);
    return diff >= 0 && diff < planLength;
  }).length;
}
