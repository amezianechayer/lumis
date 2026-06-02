import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAuthStore } from "../stores/auth.store";
import { getProgramsForGender, ExerciseProgram, Exercise } from "../utils/exercises";

const TERRACOTTA = "#C9826B";
const CREAM = "#2C1810";

function totalDuration(ex: Exercise): number {
  return ex.reps ? ex.durationSec * ex.reps : ex.durationSec;
}

// ─── Guided player ──────────────────────────────────────────────────────────
function Player({ program, onExit }: { program: ExerciseProgram; onExit: () => void }) {
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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#EDE4D4", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Animated.View entering={FadeIn} style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
          <Text style={{ color: CREAM, fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>Séance terminée !</Text>
          <Text style={{ color: "rgba(44,24,16,0.5)", fontSize: 14, textAlign: "center", marginBottom: 28 }}>
            {program.exercises.length} exercices complétés. La régularité est la clé — reviens demain !
          </Text>
          <TouchableOpacity onPress={onExit} style={{ backgroundColor: TERRACOTTA, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}>
            <Text style={{ color: "#EDE4D4", fontWeight: "700", fontSize: 15 }}>Terminer</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Circular progress
  const size = 220;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? (total - timeLeft) / total : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EDE4D4" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onExit} style={{ padding: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ color: CREAM, fontWeight: "600", fontSize: 15, flex: 1, textAlign: "center", marginRight: 28 }}>{program.title}</Text>
      </View>

      {/* Progress dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 12 }}>
        {program.exercises.map((_, i) => (
          <View key={i} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= idx ? TERRACOTTA : "rgba(44,24,16,0.2)" }} />
        ))}
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Text style={{ color: "rgba(44,24,16,0.45)", fontSize: 12, marginBottom: 4 }}>
          Exercice {idx + 1}/{program.exercises.length}
        </Text>
        <Text style={{ fontSize: 44, marginVertical: 12 }}>{ex.emoji}</Text>
        <Text style={{ color: CREAM, fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>{ex.name}</Text>
        {ex.reps ? (
          <Text style={{ color: TERRACOTTA, fontSize: 13, marginBottom: 8 }}>{ex.reps} répétitions</Text>
        ) : null}

        {/* Timer ring */}
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", marginVertical: 16 }}>
          <Svg width={size} height={size} style={{ position: "absolute" }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(44,24,16,0.1)" strokeWidth={stroke} fill="none" />
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              stroke={TERRACOTTA} strokeWidth={stroke} fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Text style={{ color: CREAM, fontSize: 48, fontWeight: "300" }}>{timeLeft}</Text>
          <Text style={{ color: "rgba(44,24,16,0.45)", fontSize: 12 }}>secondes</Text>
        </View>

        <Text style={{ color: "rgba(44,24,16,0.6)", fontSize: 14, lineHeight: 21, textAlign: "center" }}>{ex.instruction}</Text>
        {ex.tip ? (
          <View style={{ marginTop: 12, backgroundColor: "rgba(201,130,107,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: TERRACOTTA, fontSize: 12 }}>💡 {ex.tip}</Text>
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, paddingBottom: 24 }}>
        <TouchableOpacity onPress={goPrev} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1, padding: 12 }}>
          <Text style={{ color: CREAM, fontSize: 24 }}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPlaying((p) => !p)}
          style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: TERRACOTTA, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#EDE4D4", fontSize: 26 }}>{playing ? "❚❚" : "▶"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} style={{ padding: 12 }}>
          <Text style={{ color: CREAM, fontSize: 24 }}>⏭</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Program detail (exercise list before starting) ─────────────────────────
function ProgramDetail({ program, onStart, onBack }: { program: ExerciseProgram; onStart: () => void; onBack: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EDE4D4" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: CREAM, fontWeight: "700", fontSize: 18 }}>{program.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Animated.View entering={FadeIn} style={{ alignItems: "center", marginBottom: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(201,130,107,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 32 }}>{program.emoji}</Text>
          </View>
          <Text style={{ color: "rgba(44,24,16,0.55)", fontSize: 13, lineHeight: 19, textAlign: "center" }}>{program.description}</Text>
          <Text style={{ color: "rgba(44,24,16,0.45)", fontSize: 12, marginTop: 8 }}>
            {program.exercises.length} exercices · {program.durationLabel}
          </Text>
        </Animated.View>

        <Text style={{ color: "rgba(44,24,16,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Les exercices</Text>
        {program.exercises.map((ex, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 50)} style={{ flexDirection: "row", gap: 12, backgroundColor: "rgba(255,255,255,0.65)", borderWidth: 0.5, borderColor: "rgba(201,130,107,0.1)", borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(201,130,107,0.15)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>{ex.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: CREAM, fontWeight: "600", fontSize: 14 }}>{i + 1}. {ex.name}</Text>
                <Text style={{ color: TERRACOTTA, fontSize: 11 }}>{ex.reps ? `${ex.reps} reps` : `${ex.durationSec}s`}</Text>
              </View>
              <Text style={{ color: "rgba(44,24,16,0.5)", fontSize: 12, lineHeight: 17, marginTop: 3 }}>{ex.instruction}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Sticky start button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: "#EDE4D4", borderTopWidth: 0.5, borderTopColor: "rgba(201,130,107,0.1)" }}>
        <TouchableOpacity onPress={onStart} activeOpacity={0.85} style={{ backgroundColor: TERRACOTTA, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}>
          <Text style={{ color: "#EDE4D4", fontWeight: "700", fontSize: 15 }}>▶  Démarrer la séance guidée</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Program selection ──────────────────────────────────────────────────────
export default function ExercisesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [preview, setPreview] = useState<ExerciseProgram | null>(null);
  const [active, setActive] = useState<ExerciseProgram | null>(null);

  const programs = getProgramsForGender(user?.gender);

  if (active) {
    return <Player program={active} onExit={() => { setActive(null); setPreview(null); }} />;
  }
  if (preview) {
    return <ProgramDetail program={preview} onStart={() => setActive(preview)} onBack={() => setPreview(null)} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EDE4D4" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: TERRACOTTA, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: CREAM, fontWeight: "700", fontSize: 18 }}>Exercices visage</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeIn} style={{ marginBottom: 16 }}>
          <Text style={{ color: "rgba(44,24,16,0.5)", fontSize: 14, lineHeight: 21 }}>
            Des routines guidées d'exercices faciaux pour sculpter ta mâchoire et illuminer ton visage. 5 minutes par jour suffisent.
          </Text>
        </Animated.View>

        {programs.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 80)}>
            <TouchableOpacity
              onPress={() => setPreview(p)}
              activeOpacity={0.85}
              style={{ backgroundColor: "rgba(255,255,255,0.65)", borderWidth: 0.5, borderColor: "rgba(201,130,107,0.18)", borderRadius: 20, padding: 20, marginBottom: 14 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(201,130,107,0.15)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Text style={{ fontSize: 26 }}>{p.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: CREAM, fontSize: 17, fontWeight: "700" }}>{p.title}</Text>
                  <Text style={{ color: "rgba(44,24,16,0.45)", fontSize: 12, marginTop: 2 }}>
                    {p.exercises.length} exercices · {p.durationLabel}
                  </Text>
                </View>
              </View>
              <Text style={{ color: "rgba(44,24,16,0.55)", fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{p.description}</Text>
              <View style={{ backgroundColor: TERRACOTTA, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: "#EDE4D4", fontWeight: "700", fontSize: 14 }}>Voir les exercices →</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <Text style={{ color: "rgba(44,24,16,0.3)", fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 16 }}>
          Les exercices faciaux complètent ta routine. Résultats visibles avec la régularité (4-8 semaines).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
