import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { api } from "../services/api";
import { CycleStatus } from "../types/api";
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

export default function CycleScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [daysSince, setDaysSince] = useState(3);
  const [cycleLength, setCycleLength] = useState(28);

  const { data: cycle, isLoading } = useQuery({
    queryKey: ["cycle"],
    queryFn: () => api.getCycle(),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const d = new Date();
      d.setDate(d.getDate() - daysSince);
      const lastPeriodDate = d.toISOString().slice(0, 10);
      return api.saveCycle({ last_period_date: lastPeriodDate, cycle_length: cycleLength, period_length: 5 });
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

          <Stepper label="Il y a combien de jours ont commencé tes dernières règles ?" value={daysSince} onChange={setDaysSince} min={0} max={35} suffix="jours" />
          <Stepper label="Durée moyenne de ton cycle" value={cycleLength} onChange={setCycleLength} min={21} max={40} suffix="jours" />

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
                      Jour {ph.day_of_cycle} · règles dans ~{ph.next_period_in_days}j
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

                <Animated.View entering={FadeInDown.delay(260)}>
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
