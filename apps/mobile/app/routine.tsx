import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { api } from "../services/api";
import { RoutineStatus } from "../types/api";

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

function RoutineSection({
  title, emoji, steps, done, onToggle, busy, accent,
}: {
  title: string; emoji: string;
  steps: { icon: string; title: string; desc: string }[];
  done: boolean; onToggle: () => void; busy: boolean; accent: string;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(80)} style={{
      backgroundColor: "rgba(255,255,255,0.65)", borderWidth: 0.5,
      borderColor: done ? `${accent}50` : "rgba(201,130,107,0.12)",
      borderRadius: 20, padding: 18, marginBottom: 16,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Text style={{ fontSize: 22, marginRight: 8 }}>{emoji}</Text>
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", flex: 1 }}>{title}</Text>
        {done && <Text style={{ color: accent, fontSize: 13, fontWeight: "700" }}>✓ Fait</Text>}
      </View>

      <View style={{ gap: 10, marginBottom: 16 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", opacity: done ? 0.6 : 1 }}>
            <Text style={{ fontSize: 16 }}>{s.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{s.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 17 }}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onToggle}
        disabled={busy}
        activeOpacity={0.85}
        style={{
          borderRadius: 14, paddingVertical: 13, alignItems: "center",
          backgroundColor: done ? "rgba(255,255,255,0.55)" : accent,
          borderWidth: done ? 1 : 0, borderColor: "rgba(255,255,255,0.15)",
        }}
      >
        {busy ? (
          <ActivityIndicator color={done ? "#fff" : "#EDE4D4"} size="small" />
        ) : (
          <Text style={{ color: done ? "rgba(255,255,255,0.6)" : "#EDE4D4", fontWeight: "700", fontSize: 14 }}>
            {done ? "Annuler" : "Marquer comme fait ✓"}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RoutineScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["routine-status"],
    queryFn: () => api.getRoutineStatus(),
  });

  const mutation = useMutation({
    mutationFn: async ({ period, done }: { period: "morning" | "evening"; done: boolean }) => {
      return done ? api.uncompleteRoutine(period) : api.completeRoutine(period);
    },
    onSuccess: (data: RoutineStatus) => {
      queryClient.setQueryData(["routine-status"], data);
    },
  });

  const [busyPeriod, setBusyPeriod] = useState<"morning" | "evening" | null>(null);

  const toggle = (period: "morning" | "evening", done: boolean) => {
    setBusyPeriod(period);
    mutation.mutate({ period, done }, { onSettled: () => setBusyPeriod(null) });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#EDE4D4" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: "#C9826B", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>Ma routine</Text>
      </View>

      {isLoading || !status ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#C9826B" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {/* Streak banner */}
          <Animated.View entering={FadeIn} style={{
            backgroundColor: "rgba(201,168,76,0.12)", borderWidth: 0.5, borderColor: "rgba(201,168,76,0.35)",
            borderRadius: 20, padding: 20, marginBottom: 20, alignItems: "center",
          }}>
            <Text style={{ fontSize: 40 }}>🔥</Text>
            <Text style={{ color: "#C9826B", fontSize: 34, fontWeight: "800", marginTop: 4 }}>{status.streak}</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              {status.streak === 0 ? "Commence ta série aujourd'hui !" : `jour${status.streak > 1 ? "s" : ""} d'affilée`}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 6 }}>
              {status.total_completed} routines complétées au total
            </Text>
          </Animated.View>

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
            <Animated.View entering={FadeIn} style={{ alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: "#4ade80", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                🎉 Routine complète aujourd'hui ! Continue comme ça.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
