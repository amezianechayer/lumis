import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { api } from "../services/api";
import { CycleStatus } from "../types/api";

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#f87171",
  follicular: "#4ade80",
  ovulation: "#fbbf24",
  luteal: "#a78bfa",
};
const PHASE_EMOJI: Record<string, string> = {
  menstrual: "🌑", follicular: "🌱", ovulation: "🌕", luteal: "🌗",
};

function Stepper({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string;
}) {
  return (
    <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 12 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={stepBtn}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>−</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{value}<Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}> {suffix}</Text></Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={stepBtn}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const stepBtn = { width: 44, height: 44, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const };

export default function CycleScreen() {
  const router = useRouter();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0F" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: "#C9826B", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18, flex: 1 }}>Cycle & Peau</Text>
        {cycle?.configured && !editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={{ color: "#C9826B", fontSize: 13 }}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#C9826B" size="large" />
        </View>
      ) : showForm ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Animated.View entering={FadeIn} style={{ alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🌙</Text>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" }}>Suivi de ton cycle</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 }}>
              Tes hormones influencent ta peau. On adapte les conseils à ta phase actuelle.
            </Text>
          </Animated.View>

          <Stepper label="Il y a combien de jours ont commencé tes dernières règles ?" value={daysSince} onChange={setDaysSince} min={0} max={35} suffix="jours" />
          <Stepper label="Durée moyenne de ton cycle" value={cycleLength} onChange={setCycleLength} min={21} max={40} suffix="jours" />

          <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending} style={{ backgroundColor: "#C9826B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 8 }}>
            {mutation.isPending ? <ActivityIndicator color="#0D0D0F" /> : <Text style={{ color: "#0D0D0F", fontWeight: "700", fontSize: 16 }}>Voir ma phase actuelle</Text>}
          </TouchableOpacity>

          <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 }}>
            🔒 Ces données restent privées et servent uniquement à personnaliser tes conseils skincare.
          </Text>
        </ScrollView>
      ) : cycle?.phase ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {(() => {
            const ph = cycle.phase!;
            const color = PHASE_COLORS[ph.phase] ?? "#C9826B";
            return (
              <>
                {/* Phase hero */}
                <Animated.View entering={FadeInDown} style={{ backgroundColor: `${color}15`, borderWidth: 0.5, borderColor: `${color}40`, borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 48 }}>{PHASE_EMOJI[ph.phase] ?? "🌙"}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>Phase actuelle</Text>
                  <Text style={{ color, fontSize: 26, fontWeight: "800", marginTop: 2 }}>{ph.phase_fr}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>
                    Jour {ph.day_of_cycle} de ton cycle · règles dans ~{ph.next_period_in_days}j
                  </Text>
                </Animated.View>

                {/* Skin impact */}
                <Animated.View entering={FadeInDown.delay(80)} style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 18, marginBottom: 16 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Impact sur ta peau</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 21 }}>{ph.skin_impact}</Text>
                </Animated.View>

                {/* Tips */}
                <Animated.View entering={FadeInDown.delay(160)} style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Conseils pour cette phase</Text>
                  <View style={{ gap: 10 }}>
                    {ph.tips.map((tip, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginTop: 6 }} />
                        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 19, flex: 1 }}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>

                {/* Cycle phases legend */}
                <Animated.View entering={FadeInDown.delay(240)} style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
                  {(["menstrual", "follicular", "ovulation", "luteal"] as const).map((p) => (
                    <View key={p} style={{ alignItems: "center", opacity: ph.phase === p ? 1 : 0.35 }}>
                      <Text style={{ fontSize: 20 }}>{PHASE_EMOJI[p]}</Text>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PHASE_COLORS[p], marginTop: 4 }} />
                    </View>
                  ))}
                </Animated.View>
              </>
            );
          })()}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
