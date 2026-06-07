import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../stores/auth.store";
import { getProgramsForGender, ExerciseProgram, Exercise } from "../utils/exercises";
import { getDailyChallenge, getGlowTips, PLAN_LENGTHS, GlowTipSection } from "../utils/glowup";
import { useGlowUpStore, planProgress, todayStr } from "../stores/glowup.store";
import { api } from "../services/api";
import { SkinScan } from "../types/api";
import { useThemeColors } from "../stores/theme.store";
import { ExerciseAnimation } from "../components/ui/ExerciseAnimation";

const TERRACOTTA = "#C9826B";
const GREEN = "#5DCAA5";

function totalDuration(ex: Exercise): number {
  return ex.reps ? ex.durationSec * ex.reps : ex.durationSec;
}

// ─── Guided player ──────────────────────────────────────────────────────────
function Player({ program, onExit }: { program: ExerciseProgram; onExit: (completed: boolean) => void }) {
  const c = useThemeColors();
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalDuration(program.exercises[0]));
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ex = program.exercises[idx];
  const total = totalDuration(ex);

  useEffect(() => {
    if (!playing || done) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // move to next exercise
          if (idx < program.exercises.length - 1) {
            const next = idx + 1;
            setIdx(next);
            return totalDuration(program.exercises[next]);
          } else {
            setDone(true);
            setPlaying(false);
            return 0;
          }
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, idx, done]);

  const goNext = () => {
    if (idx < program.exercises.length - 1) {
      const n = idx + 1;
      setIdx(n);
      setTimeLeft(totalDuration(program.exercises[n]));
    } else {
      setDone(true);
      setPlaying(false);
    }
  };
  const goPrev = () => {
    if (idx > 0) {
      const p = idx - 1;
      setIdx(p);
      setTimeLeft(totalDuration(program.exercises[p]));
    }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Animated.View entering={FadeIn} style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
          <Text style={{ color: c.text, fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>Séance terminée !</Text>
          <Text style={{ color: c.textMuted, fontSize: 14, textAlign: "center", marginBottom: 28 }}>
            {program.exercises.length} exercices complétés. La régularité est la clé — reviens demain !
          </Text>
          <TouchableOpacity onPress={() => onExit(true)} style={{ backgroundColor: TERRACOTTA, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Terminer</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Circular progress
  const size = 168;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? (total - timeLeft) / total : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => onExit(false)} style={{ padding: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "600", fontSize: 15, flex: 1, textAlign: "center", marginRight: 28 }}>{program.title}</Text>
      </View>

      {/* Progress dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 12 }}>
        {program.exercises.map((_, i) => (
          <View key={i} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= idx ? TERRACOTTA : c.textFaint }} />
        ))}
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4 }}>
          Exercice {idx + 1}/{program.exercises.length}
        </Text>
        <ExerciseAnimation emoji={ex.emoji} motion={ex.motion} size={128} />
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>{ex.name}</Text>
        {ex.reps ? (
          <Text style={{ color: TERRACOTTA, fontSize: 13, marginBottom: 8 }}>{ex.reps} répétitions</Text>
        ) : null}

        {/* Timer ring */}
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", marginVertical: 16 }}>
          <Svg width={size} height={size} style={{ position: "absolute" }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.borderLight} strokeWidth={stroke} fill="none" />
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              stroke={TERRACOTTA} strokeWidth={stroke} fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Text style={{ color: c.text, fontSize: 48, fontWeight: "300" }}>{timeLeft}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>secondes</Text>
        </View>

        <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>{ex.instruction}</Text>
        {ex.tip ? (
          <View style={{ marginTop: 12, backgroundColor: c.primaryMuted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: TERRACOTTA, fontSize: 12 }}>💡 {ex.tip}</Text>
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, paddingBottom: 24 }}>
        <TouchableOpacity onPress={goPrev} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1, padding: 12 }}>
          <Text style={{ color: c.text, fontSize: 24 }}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPlaying((p) => !p)}
          style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: TERRACOTTA, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#fff", fontSize: 26 }}>{playing ? "❚❚" : "▶"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} style={{ padding: 12 }}>
          <Text style={{ color: c.text, fontSize: 24 }}>⏭</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Program detail (exercise list before starting) ─────────────────────────
function ProgramDetail({ program, onStart, onBack }: { program: ExerciseProgram; onStart: () => void; onBack: () => void }) {
  const c = useThemeColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>{program.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Animated.View entering={FadeIn} style={{ alignItems: "center", marginBottom: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 32 }}>{program.emoji}</Text>
          </View>
          <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, textAlign: "center" }}>{program.description}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>
            {program.exercises.length} exercices · {program.durationLabel}
          </Text>
        </Animated.View>

        <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Les exercices</Text>
        {program.exercises.map((ex, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 50)} style={{ flexDirection: "row", gap: 12, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primaryMuted, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>{ex.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: c.text, fontWeight: "600", fontSize: 14 }}>{i + 1}. {ex.name}</Text>
                <Text style={{ color: TERRACOTTA, fontSize: 11 }}>{ex.reps ? `${ex.reps} reps` : `${ex.durationSec}s`}</Text>
              </View>
              <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>{ex.instruction}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Sticky start button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: c.bg, borderTopWidth: 0.5, borderTopColor: c.borderLight }}>
        <TouchableOpacity onPress={onStart} activeOpacity={0.85} style={{ backgroundColor: TERRACOTTA, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>▶  Démarrer la séance guidée</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Section heading ────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 4 }}>{children}</Text>
  );
}

// ─── Streak hero ────────────────────────────────────────────────────────────
function StreakHero({ streak, best, checkedToday }: { streak: number; best: number; checkedToday: boolean }) {
  const c = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown}
      style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 22, padding: 18, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 16 }}
    >
      <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: c.primaryMuted, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 30 }}>{streak > 0 ? "🔥" : "✨"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "800" }}>
          {streak} <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: "600" }}>{streak > 1 ? "jours" : "jour"} de série</Text>
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
          {checkedToday ? "Objectif du jour validé 🎉" : "Valide ton défi pour garder la flamme"}
          {best > 0 ? ` · record ${best}j` : ""}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Daily challenge ────────────────────────────────────────────────────────
function DailyChallengeCard({ checkedToday, onCheckIn }: { checkedToday: boolean; onCheckIn: () => void }) {
  const c = useThemeColors();
  const challenge = getDailyChallenge();
  return (
    <Animated.View entering={FadeInDown.delay(60)} style={{ marginBottom: 22 }}>
      <SectionTitle>🎯 Défi du jour</SectionTitle>
      <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 20, padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 30 }}>{challenge.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{challenge.title}</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{challenge.desc}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onCheckIn}
          disabled={checkedToday}
          activeOpacity={0.85}
          style={{
            backgroundColor: checkedToday ? c.primaryMuted : TERRACOTTA,
            borderRadius: 12, paddingVertical: 13, alignItems: "center",
          }}
        >
          <Text style={{ color: checkedToday ? TERRACOTTA : "#fff", fontWeight: "700", fontSize: 14 }}>
            {checkedToday ? "✓ Validé aujourd'hui" : "Marquer comme fait"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Multi-day plan ─────────────────────────────────────────────────────────
function PlanCard() {
  const c = useThemeColors();
  const { checkInDates, planLength, planStart, startPlan, resetPlan } = useGlowUpStore();
  const completed = planProgress(checkInDates, planStart, planLength);
  const finished = planLength != null && completed >= planLength;

  return (
    <Animated.View entering={FadeInDown.delay(120)} style={{ marginBottom: 22 }}>
      <SectionTitle>📅 Mon plan Glow Up</SectionTitle>
      <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 20, padding: 18 }}>
        {planLength == null ? (
          <>
            <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
              Choisis un défi sur la durée. Coche ton défi chaque jour et regarde ta progression.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {PLAN_LENGTHS.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => startPlan(n)}
                  activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: c.primaryMuted, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ color: TERRACOTTA, fontSize: 22, fontWeight: "800" }}>{n}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>jours</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>
                {finished ? "Plan terminé 🎉" : `Défi ${planLength} jours`}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>{completed}/{planLength}</Text>
            </View>

            {/* Progress bar */}
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.primaryMuted, overflow: "hidden", marginBottom: 14 }}>
              <View style={{ width: `${Math.min(100, (completed / planLength) * 100)}%`, height: "100%", backgroundColor: GREEN, borderRadius: 5 }} />
            </View>

            {/* Day dots */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {Array.from({ length: planLength }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: i < completed ? GREEN : c.primaryMuted,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ color: i < completed ? "#fff" : c.textFaint, fontSize: 10, fontWeight: "700" }}>{i + 1}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={resetPlan} activeOpacity={0.7}>
              <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center" }}>
                {finished ? "Démarrer un nouveau plan" : "Changer de plan"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Before / after (linked to skin scans) ──────────────────────────────────
function BeforeAfterCard({ onScan }: { onScan: () => void }) {
  const c = useThemeColors();
  const { data: scans } = useQuery({
    queryKey: ["skin-history", "glowup"],
    queryFn: () => api.getSkinHistory(),
    staleTime: 1000 * 60 * 5,
  });

  const sorted = [...(scans ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (sorted.length < 2) {
    return (
      <Animated.View entering={FadeInDown.delay(180)} style={{ marginBottom: 22 }}>
        <SectionTitle>📈 Ton avant / après</SectionTitle>
        <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 20, padding: 18, alignItems: "center" }}>
          <Text style={{ fontSize: 30, marginBottom: 8 }}>📷</Text>
          <Text style={{ color: c.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 14 }}>
            Scanne ta peau régulièrement pour suivre tes progrès Glow Up dans le temps.
          </Text>
          <TouchableOpacity onPress={onScan} style={{ backgroundColor: c.primaryMuted, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 }}>
            <Text style={{ color: TERRACOTTA, fontWeight: "700", fontSize: 13 }}>Faire un scan peau</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const delta = last.overall_score - first.overall_score;
  const deltaColor = delta > 0 ? GREEN : delta < 0 ? c.danger : c.textMuted;

  return (
    <Animated.View entering={FadeInDown.delay(180)} style={{ marginBottom: 22 }}>
      <SectionTitle>📈 Ton avant / après</SectionTitle>
      <View style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 20, padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ScoreBlock label="Avant" value={first.overall_score} date={first.created_at} c={c} />
          <View style={{ alignItems: "center", paddingHorizontal: 8 }}>
            <Text style={{ color: deltaColor, fontSize: 18, fontWeight: "800" }}>
              {delta > 0 ? "+" : ""}{delta}
            </Text>
            <Text style={{ color: c.textFaint, fontSize: 16 }}>→</Text>
          </View>
          <ScoreBlock label="Maintenant" value={last.overall_score} date={last.created_at} c={c} highlight />
        </View>
        <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 17 }}>
          {delta > 0
            ? `Ta peau a gagné ${delta} points depuis ton premier scan. Continue ! 💪`
            : delta < 0
            ? "Un petit creux — reprends ta routine et ton défi quotidien."
            : "Stable. La régularité finit toujours par payer."}
        </Text>
      </View>
    </Animated.View>
  );
}

function ScoreBlock({ label, value, date, c, highlight }: { label: string; value: number; date: string; c: ReturnType<typeof useThemeColors>; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: c.textFaint, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: highlight ? TERRACOTTA : c.text, fontSize: 30, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: c.textFaint, fontSize: 10, marginTop: 2 }}>
        {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </Text>
    </View>
  );
}

// ─── Tips (expandable) ──────────────────────────────────────────────────────
function TipsSection({ sections }: { sections: GlowTipSection[] }) {
  const c = useThemeColors();
  const [open, setOpen] = useState<string | null>(sections[0]?.id ?? null);

  return (
    <Animated.View entering={FadeInDown.delay(300)} style={{ marginBottom: 12 }}>
      <SectionTitle>💡 Conseils Glow Up</SectionTitle>
      {sections.map((s) => {
        const isOpen = open === s.id;
        return (
          <View key={s.id} style={{ backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
            <TouchableOpacity
              onPress={() => setOpen(isOpen ? null : s.id)}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}
            >
              <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "600", flex: 1 }}>{s.label}</Text>
              <Text style={{ color: c.textMuted, fontSize: 14 }}>{isOpen ? "−" : "+"}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
                {s.tips.map((tip, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ color: TERRACOTTA, fontSize: 13, marginTop: 1 }}>•</Text>
                    <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, flex: 1 }}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}

// ─── Hub ────────────────────────────────────────────────────────────────────
function GlowUpHub({
  gender,
  onOpenProgram,
  onBack,
  router,
}: {
  gender?: string;
  onOpenProgram: (p: ExerciseProgram) => void;
  onBack: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const c = useThemeColors();
  const { streak, bestStreak, lastCheckIn, checkInToday } = useGlowUpStore();
  const checkedToday = lastCheckIn === todayStr();
  const programs = getProgramsForGender(gender);
  const tips = getGlowTips(gender);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 18 }}>Glow Up</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <StreakHero streak={streak} best={bestStreak} checkedToday={checkedToday} />
        <DailyChallengeCard checkedToday={checkedToday} onCheckIn={checkInToday} />
        <PlanCard />
        <BeforeAfterCard onScan={() => router.push("/(tabs)/scan" as any)} />

        {/* Face yoga programs */}
        <Animated.View entering={FadeInDown.delay(240)} style={{ marginBottom: 22 }}>
          <SectionTitle>🧘 Exercices visage</SectionTitle>
          {programs.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => onOpenProgram(p)}
              activeOpacity={0.85}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.border, borderRadius: 18, padding: 16, marginBottom: 10 }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.primaryMuted, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 24 }}>{p.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{p.title}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                  {p.exercises.length} exercices · {p.durationLabel}
                </Text>
              </View>
              <Text style={{ color: TERRACOTTA, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <TipsSection sections={tips} />

        <Text style={{ color: c.textFaint, fontSize: 11, textAlign: "center", marginTop: 4, lineHeight: 16 }}>
          Le Glow Up, c'est la régularité. Résultats visibles en 4-8 semaines. À but cosmétique et bien-être.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Screen (state machine: hub → program detail → player) ──────────────────
export default function ExercisesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { checkInToday } = useGlowUpStore();
  const [preview, setPreview] = useState<ExerciseProgram | null>(null);
  const [active, setActive] = useState<ExerciseProgram | null>(null);

  if (active) {
    return (
      <Player
        program={active}
        onExit={(completed) => {
          if (completed) checkInToday(); // finishing a session counts toward the streak
          setActive(null);
          setPreview(null);
        }}
      />
    );
  }
  if (preview) {
    return <ProgramDetail program={preview} onStart={() => setActive(preview)} onBack={() => setPreview(null)} />;
  }

  return (
    <GlowUpHub
      gender={user?.gender}
      onOpenProgram={setPreview}
      onBack={() => router.back()}
      router={router}
    />
  );
}
