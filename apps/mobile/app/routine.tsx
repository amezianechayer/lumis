import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { api } from "../services/api";
import { RoutineStatus, RoutineDay } from "../types/api";
import { useThemeColors } from "../stores/theme.store";

const TERRACOTTA = "#C9826B";

const MORNING_STEPS = [
  { icon: "🧼", title: "Nettoyant doux", desc: "Nettoie en douceur pour retirer le sébum de la nuit." },
  { icon: "💧", title: "Sérum hydratant / Vitamine C", desc: "Vitamine C pour l'éclat et la protection antioxydante." },
  { icon: "🧴", title: "Crème hydratante", desc: "Maintient l'hydratation toute la journée." },
  { icon: "☀️", title: "SPF 50+", desc: "Protection solaire — le meilleur anti-âge." },
];

const EVENING_STEPS = [
  { icon: "🌙", title: "Démaquillage / Nettoyage", desc: "Retire maquillage, pollution et SPF de la journée." },
  { icon: "✨", title: "Traitement ciblé", desc: "Rétinol ou exfoliant selon ta routine (2-3x/semaine)." },
  { icon: "💧", title: "Sérum réparateur", desc: "Acide hyaluronique ou niacinamide pour réparer la nuit." },
  { icon: "🌿", title: "Crème de nuit", desc: "Nourrit et répare pendant le sommeil." },
];

// Streak milestones for motivation
const MILESTONES = [3, 7, 14, 30, 60, 100];
function nextMilestone(streak: number): number {
  return MILESTONES.find((m) => m > streak) ?? streak + 30;
}
function streakMessage(streak: number): string {
  if (streak === 0) return "Commence ta série aujourd'hui ✨";
  if (streak < 3) return "Bon départ, continue !";
  if (streak < 7) return "Tu prends le rythme 🔥";
  if (streak < 14) return "Une vraie habitude se forme !";
  if (streak < 30) return "Impressionnant, ne lâche rien !";
  return "Légende du skincare 👑";
}

// ─── Daily progress ring ─────────────────────────────────────────────────────
function ProgressRing({ done, total }: { done: number; total: number }) {
  const c = useThemeColors();
  const size = 130;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? done / total : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.borderLight} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={progress === 1 ? "#5DCAA5" : TERRACOTTA} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 30 }}>{progress === 1 ? "🎉" : "🔥"}</Text>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "700", marginTop: 2 }}>{done}/{total}</Text>
      <Text style={{ color: c.textFaint, fontSize: 10 }}>aujourd'hui</Text>
    </View>
  );
}

function RoutineSection({
  title, emoji, steps, done, onToggle, busy, accent,
}: {
  title: string; emoji: string;
  steps: { icon: string; title: string; desc: string }[];
  done: boolean; onToggle: () => void; busy: boolean; accent: string;
}) {
  const c = useThemeColors();
  const [checked, setChecked] = useState<boolean[]>(() => steps.map(() => false));

  // Reflect backend completion state
  useEffect(() => {
    setChecked(steps.map(() => done));
  }, [done, steps.length]);

  const doneCount = done ? steps.length : checked.filter(Boolean).length;

  const toggleStep = (i: number) => {
    if (done || busy) return;
    const next = checked.slice();
    next[i] = !next[i];
    setChecked(next);
    if (next.every(Boolean)) onToggle(); // all steps checked → complete period
  };

  return (
    <Animated.View entering={FadeInDown.delay(80)} style={{
      backgroundColor: c.bgCard, borderWidth: 0.5,
      borderColor: done ? `${accent}60` : c.borderLight,
      borderRadius: 20, padding: 18, marginBottom: 16,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Text style={{ fontSize: 22, marginRight: 8 }}>{emoji}</Text>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", flex: 1 }}>{title}</Text>
        <Text style={{ color: done ? accent : c.textMuted, fontSize: 12, fontWeight: "700" }}>
          {done ? "✓ Fait" : `${doneCount}/${steps.length}`}
        </Text>
      </View>

      {/* Step progress bar */}
      <View style={{ height: 5, backgroundColor: c.borderLight, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
        <View style={{ height: "100%", width: `${(doneCount / steps.length) * 100}%`, backgroundColor: accent, borderRadius: 3 }} />
      </View>

      <View style={{ gap: 6, marginBottom: 16 }}>
        {steps.map((s, i) => {
          const on = done || checked[i];
          return (
            <TouchableOpacity
              key={i}
              onPress={() => toggleStep(i)}
              activeOpacity={done ? 1 : 0.7}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 }}
            >
              {/* Checkbox */}
              <View style={{
                width: 22, height: 22, borderRadius: 7, marginTop: 1,
                alignItems: "center", justifyContent: "center",
                backgroundColor: on ? accent : "transparent",
                borderWidth: on ? 0 : 1.5, borderColor: c.border,
              }}>
                {on && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 16 }}>{s.icon}</Text>
              <View style={{ flex: 1, opacity: on ? 0.55 : 1 }}>
                <Text style={{ color: c.text, fontSize: 13, fontWeight: "600", textDecorationLine: on ? "line-through" : "none" }}>{s.title}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 17 }}>{s.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={onToggle}
        disabled={busy}
        activeOpacity={0.85}
        style={{
          borderRadius: 14, paddingVertical: 13, alignItems: "center",
          backgroundColor: done ? c.bgCard : accent,
          borderWidth: done ? 0.5 : 0, borderColor: c.border,
        }}
      >
        {busy ? (
          <ActivityIndicator color={done ? c.text : "#fff"} size="small" />
        ) : (
          <Text style={{ color: done ? c.textMuted : "#fff", fontWeight: "700", fontSize: 14 }}>
            {done ? "Annuler" : "Tout marquer comme fait ✓"}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// 7-day completion strip
function WeekStrip() {
  const c = useThemeColors();
  const { data: week } = useQuery({
    queryKey: ["routine-week"],
    queryFn: () => api.getRoutineWeek(),
  });
  if (!week || week.length === 0) return null;

  const DOW = ["D", "L", "M", "M", "J", "V", "S"];
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Animated.View entering={FadeInDown.delay(60)} style={{
      backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight,
      borderRadius: 20, padding: 16, marginBottom: 16,
    }}>
      <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        Cette semaine
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {week.map((d: RoutineDay) => {
          const day = new Date(d.date + "T00:00:00");
          const isToday = d.date === todayStr;
          const both = d.morning && d.evening;
          const any = d.morning || d.evening;
          return (
            <View key={d.date} style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ color: isToday ? "#C9826B" : c.textFaint, fontSize: 11, fontWeight: isToday ? "700" : "400" }}>
                {DOW[day.getDay()]}
              </Text>
              <View style={{
                width: 30, height: 30, borderRadius: 10,
                alignItems: "center", justifyContent: "center",
                backgroundColor: both ? "#5DCAA5" : any ? "rgba(93,202,165,0.3)" : c.borderLight,
                borderWidth: isToday ? 1.5 : 0, borderColor: "#C9826B",
              }}>
                <Text style={{ fontSize: 11, color: both ? "#fff" : c.textMuted, fontWeight: "700" }}>
                  {both ? "✓" : any ? "·" : ""}
                </Text>
              </View>
              <Text style={{ color: c.textFaint, fontSize: 9 }}>{day.getDate()}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function RoutineScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [busyPeriod, setBusyPeriod] = useState<"morning" | "evening" | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["routine-status"],
    queryFn: () => api.getRoutineStatus(),
  });

  const mutation = useMutation({
    mutationFn: async ({ period, done }: { period: "morning" | "evening"; done: boolean }) =>
      done ? api.uncompleteRoutine(period) : api.completeRoutine(period),
    onSuccess: (data: RoutineStatus) => {
      queryClient.setQueryData(["routine-status"], data);
      queryClient.invalidateQueries({ queryKey: ["routine-week"] });
    },
  });

  const toggle = (period: "morning" | "evening", done: boolean) => {
    setBusyPeriod(period);
    mutation.mutate({ period, done }, { onSettled: () => setBusyPeriod(null) });
  };

  const doneToday = (status?.morning_done ? 1 : 0) + (status?.evening_done ? 1 : 0);
  const streak = status?.streak ?? 0;
  const target = nextMilestone(streak);
  const toGo = target - streak;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Ma routine</Text>
      </View>

      {isLoading || !status ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={TERRACOTTA} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {/* Hero: progress ring + streak */}
          <Animated.View entering={FadeIn} style={{
            backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border,
            borderRadius: 24, padding: 20, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 16,
          }}>
            <ProgressRing done={doneToday} total={2} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={{ color: TERRACOTTA, fontSize: 32, fontWeight: "800" }}>{streak}</Text>
                <Text style={{ color: c.textMuted, fontSize: 13 }}>jour{streak > 1 ? "s" : ""} 🔥</Text>
              </View>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: "600", marginTop: 2 }}>{streakMessage(streak)}</Text>
              <Text style={{ color: c.textFaint, fontSize: 11, marginTop: 6 }}>
                {toGo > 0 ? `Plus que ${toGo} j pour atteindre ${target} jours` : ""}
              </Text>
            </View>
          </Animated.View>

          {/* Milestone progress bar */}
          <Animated.View entering={FadeInDown.delay(40)} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: c.textFaint, fontSize: 11 }}>Objectif {target} jours</Text>
              <Text style={{ color: TERRACOTTA, fontSize: 11, fontWeight: "600" }}>{Math.round((streak / target) * 100)}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: c.borderLight, borderRadius: 4, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${Math.min(100, (streak / target) * 100)}%`, backgroundColor: TERRACOTTA, borderRadius: 4 }} />
            </View>
          </Animated.View>

          <WeekStrip />

          <RoutineSection
            title="Routine du matin" emoji="🌅" steps={MORNING_STEPS}
            done={status.morning_done} onToggle={() => toggle("morning", status.morning_done)}
            busy={busyPeriod === "morning"} accent="#fbbf24"
          />
          <RoutineSection
            title="Routine du soir" emoji="🌙" steps={EVENING_STEPS}
            done={status.evening_done} onToggle={() => toggle("evening", status.evening_done)}
            busy={busyPeriod === "evening"} accent="#a78bfa"
          />

          {status.morning_done && status.evening_done && (
            <Animated.View entering={FadeIn} style={{ alignItems: "center", marginTop: 8, backgroundColor: "rgba(93,202,165,0.12)", borderRadius: 16, padding: 16 }}>
              <Text style={{ color: "#5DCAA5", fontSize: 14, fontWeight: "700", textAlign: "center" }}>
                🎉 Journée complète ! +1 jour de série. Reviens demain.
              </Text>
            </Animated.View>
          )}

          <Text style={{ color: c.textFaint, fontSize: 11, textAlign: "center", marginTop: 16 }}>
            {status.total_completed} routines complétées au total
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
