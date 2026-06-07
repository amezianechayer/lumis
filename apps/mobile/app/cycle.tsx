import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { api } from "../services/api";
import { CycleStatus, CycleLog } from "../types/api";
import { useThemeColors } from "../stores/theme.store";

const TERRACOTTA = "#C9826B";
const PERIOD = "#F09595";
const OVULATION = "#5DCAA5";

const PHASE_COLORS: Record<string, string> = {
  menstrual: PERIOD,
  follicular: "#60a5fa",
  ovulation: OVULATION,
  luteal: "#a78bfa",
};
const PHASE_EMOJI: Record<string, string> = {
  menstrual: "🌑", follicular: "🌱", ovulation: "🌕", luteal: "🌗",
};

const DAY_MS = 86400000;
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type DayType = "period" | "fertile" | "ovulation" | null;

function dayType(date: Date, lastPeriod: Date, cycleLen: number, periodLen: number): DayType {
  const base = new Date(lastPeriod.getFullYear(), lastPeriod.getMonth(), lastPeriod.getDate()).getTime();
  const diff = Math.floor((date.getTime() - base) / DAY_MS);
  const cycleDay = ((diff % cycleLen) + cycleLen) % cycleLen; // 0-indexed
  if (cycleDay < periodLen) return "period";
  const ovulation = cycleLen - 14;
  if (cycleDay === ovulation) return "ovulation";
  if (cycleDay >= ovulation - 3 && cycleDay <= ovulation + 1) return "fertile";
  return null;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Calendar ───────────────────────────────────────────────────────────────
function Calendar({ lastPeriod, cycleLen, periodLen }: { lastPeriod: Date; cycleLen: number; periodLen: number }) {
  const c = useThemeColors();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));

  return (
    <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 20, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <TouchableOpacity onPress={() => setMonth(new Date(year, m - 1, 1))} style={{ padding: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>{MONTHS[m]} {year}</Text>
        <TouchableOpacity onPress={() => setMonth(new Date(year, m + 1, 1))} style={{ padding: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", color: c.textFaint, fontSize: 11 }}>{w}</Text>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const type = dayType(date, lastPeriod, cycleLen, periodLen);
          const isToday = sameDay(date, today);
          const bg = type === "period" ? PERIOD : type === "ovulation" ? OVULATION : type === "fertile" ? "rgba(93,202,165,0.25)" : "transparent";
          const txt = type === "period" || type === "ovulation" ? "#fff" : c.text;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16, backgroundColor: bg,
                borderWidth: isToday ? 2 : 0, borderColor: TERRACOTTA,
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: txt, fontSize: 13, fontWeight: isToday ? "700" : "400" }}>{date.getDate()}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 12 }}>
        <Legend color={PERIOD} label="Règles" />
        <Legend color="rgba(93,202,165,0.5)" label="Fertile" />
        <Legend color={OVULATION} label="Ovulation" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: c.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function Stepper({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string;
}) {
  const c = useThemeColors();
  return (
    <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 12 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={{ width: 44, height: 44, backgroundColor: c.primaryMuted, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>−</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontSize: 24, fontWeight: "700" }}>{value}<Text style={{ color: c.textFaint, fontSize: 14 }}> {suffix}</Text></Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ width: 44, height: 44, backgroundColor: c.primaryMuted, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Daily log options ───────────────────────────────────────────────────────
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const MOODS = [
  { key: "happy", emoji: "😊", label: "Bien" },
  { key: "calm", emoji: "😌", label: "Calme" },
  { key: "tired", emoji: "😴", label: "Fatiguée" },
  { key: "irritable", emoji: "😤", label: "Irritable" },
  { key: "anxious", emoji: "😰", label: "Anxieuse" },
  { key: "sad", emoji: "😢", label: "Triste" },
];
const SKIN_STATES = [
  { key: "clear", emoji: "✨", label: "Nette" },
  { key: "glowing", emoji: "🌟", label: "Éclat" },
  { key: "oily", emoji: "💧", label: "Grasse" },
  { key: "dry", emoji: "🏜️", label: "Sèche" },
  { key: "breakout", emoji: "🔴", label: "Boutons" },
  { key: "sensitive", emoji: "🌸", label: "Sensible" },
];
const FLOWS = [
  { key: "none", emoji: "○", label: "Aucun" },
  { key: "light", emoji: "🩸", label: "Léger" },
  { key: "medium", emoji: "🩸", label: "Moyen" },
  { key: "heavy", emoji: "🩸", label: "Abondant" },
];
const SYMPTOMS = ["Crampes", "Ballonnements", "Maux de tête", "Fatigue", "Fringales", "Acné", "Sautes d'humeur", "Sensibilité", "Mal de dos", "Nausée"];

// ─── Toggle (for the SOPK switch) ────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: value ? OVULATION : "rgba(120,120,120,0.3)", padding: 3, justifyContent: "center" }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: value ? "flex-end" : "flex-start" }} />
    </TouchableOpacity>
  );
}

// ─── Selection chip ──────────────────────────────────────────────────────────
function SelectChip({ label, emoji, active, onPress }: { label: string; emoji?: string; active: boolean; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: active ? c.primary : c.bgCard,
        borderWidth: 0.5, borderColor: active ? c.primary : c.borderLight,
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8,
      }}
    >
      {emoji ? <Text style={{ fontSize: 14 }}>{emoji}</Text> : null}
      <Text style={{ color: active ? "#fff" : c.textMuted, fontSize: 13, fontWeight: active ? "700" : "400" }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── SOPK card ───────────────────────────────────────────────────────────────
function SopkCard({ note, tips }: { note?: string; tips?: string[] }) {
  const c = useThemeColors();
  if (!note && !(tips && tips.length)) return null;
  return (
    <Animated.View entering={FadeInDown.delay(170)} style={{ backgroundColor: "rgba(167,139,250,0.10)", borderWidth: 0.5, borderColor: "rgba(167,139,250,0.4)", borderRadius: 18, padding: 18, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Text style={{ fontSize: 18 }}>🩺</Text>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 15 }}>Mode SOPK</Text>
      </View>
      {!!note && <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: tips?.length ? 12 : 0 }}>{note}</Text>}
      {tips?.map((t, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#a78bfa", marginTop: 6 }} />
          <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, flex: 1 }}>{t}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Daily logger ────────────────────────────────────────────────────────────
function DailyLogger() {
  const c = useThemeColors();
  const qc = useQueryClient();
  const { data: logs } = useQuery({ queryKey: ["cycle-logs"], queryFn: () => api.getCycleLogs() });
  const today = todayISO();
  const existing = logs?.find((l) => l.date === today);

  const [mood, setMood] = useState("");
  const [skin, setSkin] = useState("");
  const [flow, setFlow] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (existing && !hydrated) {
      setMood(existing.mood || "");
      setSkin(existing.skin_state || "");
      setFlow(existing.flow || "");
      setSymptoms(existing.symptoms || []);
      setHydrated(true);
    }
  }, [existing, hydrated]);

  const save = useMutation({
    mutationFn: () => api.saveCycleLog({ date: today, mood, skin_state: skin, flow, symptoms, notes: "" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycle-logs"] }),
  });

  const toggleSymptom = (s: string) => setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const recent = (logs ?? []).slice(0, 7);

  return (
    <>
      <Animated.View entering={FadeInDown.delay(220)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 18, marginBottom: 14 }}>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 15, marginBottom: 4 }}>📔 Journal du jour</Text>
        <Text style={{ color: c.textFaint, fontSize: 12, marginBottom: 14 }}>Note ton humeur, ta peau et tes symptômes pour repérer tes schémas.</Text>

        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 8 }}>Humeur</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {MOODS.map((m) => (
            <SelectChip key={m.key} label={m.label} emoji={m.emoji} active={mood === m.key} onPress={() => setMood(mood === m.key ? "" : m.key)} />
          ))}
        </View>

        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8, marginBottom: 8 }}>Peau</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {SKIN_STATES.map((s) => (
            <SelectChip key={s.key} label={s.label} emoji={s.emoji} active={skin === s.key} onPress={() => setSkin(skin === s.key ? "" : s.key)} />
          ))}
        </View>

        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8, marginBottom: 8 }}>Flux</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {FLOWS.map((f) => (
            <SelectChip key={f.key} label={f.label} emoji={f.emoji} active={flow === f.key} onPress={() => setFlow(flow === f.key ? "" : f.key)} />
          ))}
        </View>

        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8, marginBottom: 8 }}>Symptômes</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {SYMPTOMS.map((s) => (
            <SelectChip key={s} label={s} active={symptoms.includes(s)} onPress={() => toggleSymptom(s)} />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => save.mutate()}
          disabled={save.isPending}
          activeOpacity={0.85}
          style={{ backgroundColor: TERRACOTTA, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 12 }}
        >
          {save.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{save.isSuccess ? "✓ Enregistré" : "Enregistrer ma journée"}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {recent.length > 0 && (
        <Animated.View entering={FadeInDown.delay(260)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 18, marginBottom: 14 }}>
          <Text style={{ color: c.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Derniers jours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recent.map((l) => {
              const skinDef = SKIN_STATES.find((s) => s.key === l.skin_state);
              const moodDef = MOODS.find((m) => m.key === l.mood);
              const d = new Date(`${l.date}T00:00:00`);
              return (
                <View key={l.date} style={{ alignItems: "center", marginRight: 16, minWidth: 44 }}>
                  <Text style={{ color: c.textFaint, fontSize: 10, marginBottom: 6 }}>{d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</Text>
                  <Text style={{ fontSize: 22 }}>{skinDef?.emoji ?? moodDef?.emoji ?? "•"}</Text>
                  {l.symptoms?.length ? <Text style={{ color: c.textFaint, fontSize: 9, marginTop: 4 }}>{l.symptoms.length} sympt.</Text> : null}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </>
  );
}

export default function CycleScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [daysSince, setDaysSince] = useState(3);
  const [cycleLength, setCycleLength] = useState(28);
  const [hasPCOS, setHasPCOS] = useState(false);

  const { data: cycle, isLoading } = useQuery({
    queryKey: ["cycle"],
    queryFn: () => api.getCycle(),
  });

  // Prefill the form from saved data (length + SOPK flag).
  useEffect(() => {
    if (cycle?.configured) {
      if (cycle.cycle_length) setCycleLength(cycle.cycle_length);
      setHasPCOS(!!cycle.has_pcos);
    }
  }, [cycle?.configured]);

  const mutation = useMutation({
    mutationFn: () => {
      const d = new Date();
      d.setDate(d.getDate() - daysSince);
      const lastPeriodDate = d.toISOString().slice(0, 10);
      return api.saveCycle({ last_period_date: lastPeriodDate, cycle_length: cycleLength, period_length: 5, has_pcos: hasPCOS });
    },
    onSuccess: (data: CycleStatus) => {
      queryClient.setQueryData(["cycle"], data);
      setEditing(false);
    },
  });

  const showForm = editing || (cycle && !cycle.configured);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18, flex: 1 }}>Cycle & Peau</Text>
        {cycle?.configured && !editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={{ color: TERRACOTTA, fontSize: 13 }}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={TERRACOTTA} size="large" />
        </View>
      ) : showForm ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Animated.View entering={FadeIn} style={{ alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🌙</Text>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>Suivi de ton cycle</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 }}>
              Visualise ton cycle en calendrier et reçois des conseils peau adaptés à chaque phase.
            </Text>
          </Animated.View>

          <Stepper label="Il y a combien de jours ont commencé tes dernières règles ?" value={daysSince} onChange={setDaysSince} min={0} max={60} suffix="jours" />
          <Stepper label="Durée moyenne de ton cycle" value={cycleLength} onChange={setCycleLength} min={21} max={hasPCOS ? 90 : 40} suffix="jours" />

          {/* SOPK / irregular cycle */}
          <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: "600" }}>Cycle irrégulier / SOPK</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
                Active si tes cycles sont irréguliers. Les dates deviennent des estimations et les conseils ciblent l'acné hormonale.
              </Text>
            </View>
            <Toggle value={hasPCOS} onChange={setHasPCOS} />
          </View>

          <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending} style={{ backgroundColor: TERRACOTTA, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 8 }}>
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Voir mon calendrier</Text>}
          </TouchableOpacity>

          <Text style={{ color: c.textFaint, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 }}>
            🔒 Ces données restent privées. Le Coach IA les utilise pour personnaliser ses conseils.
          </Text>
        </ScrollView>
      ) : cycle?.phase ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {(() => {
            const ph = cycle.phase!;
            const color = PHASE_COLORS[ph.phase] ?? TERRACOTTA;
            const lastPeriod = cycle.last_period_date ? new Date(cycle.last_period_date) : new Date();
            const cycleLen = cycle.cycle_length ?? 28;
            return (
              <>
                <Animated.View entering={FadeInDown} style={{ backgroundColor: `${color}18`, borderWidth: 0.5, borderColor: `${color}50`, borderRadius: 20, padding: 18, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Text style={{ fontSize: 38 }}>{PHASE_EMOJI[ph.phase] ?? "🌙"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color, fontSize: 18, fontWeight: "800" }}>{ph.phase_fr}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                      Jour {ph.day_of_cycle} · règles dans ~{ph.next_period_in_days}j{ph.is_estimate ? " (estimation)" : ""}
                    </Text>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80)} style={{ marginBottom: 14 }}>
                  <Calendar lastPeriod={lastPeriod} cycleLen={cycleLen} periodLen={5} />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(140)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 18, marginBottom: 14 }}>
                  <Text style={{ color: c.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Impact sur ta peau</Text>
                  <Text style={{ color: c.text, fontSize: 14, lineHeight: 21 }}>{ph.skin_impact}</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200)} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 18, padding: 18, marginBottom: 14 }}>
                  <Text style={{ color: c.textFaint, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Conseils pour cette phase</Text>
                  <View style={{ gap: 10 }}>
                    {ph.tips.map((tip, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginTop: 6 }} />
                        <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, flex: 1 }}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>

                {/* SOPK guidance (only when the user flagged an irregular cycle) */}
                <SopkCard note={ph.pcos_note} tips={ph.pcos_tips} />

                {/* Daily symptom / mood / skin tracking */}
                <DailyLogger />

                <Animated.View entering={FadeInDown.delay(300)}>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/coach")} style={{ backgroundColor: c.primaryMuted, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>✨</Text>
                    <Text style={{ color: TERRACOTTA, fontWeight: "600", fontSize: 14 }}>Demande conseil au Coach IA</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            );
          })()}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
