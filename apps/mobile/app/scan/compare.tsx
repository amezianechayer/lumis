import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../services/api";
import { SkinScan } from "../../types/api";

function scoreColor(s: number) {
  return s >= 75 ? "#4ade80" : s >= 50 ? "#C9826B" : "#f87171";
}

function DeltaBadge({ from, to }: { from: number; to: number }) {
  const delta = to - from;
  const color = delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "rgba(255,255,255,0.4)";
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  return (
    <Text style={{ color, fontSize: 13, fontWeight: "700" }}>
      {arrow} {delta > 0 ? "+" : ""}{delta}
    </Text>
  );
}

function MetricRow({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.06)" }}>
      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, flex: 1.4 }}>{label}</Text>
      <Text style={{ color: scoreColor(from), fontSize: 14, fontWeight: "600", flex: 1, textAlign: "center" }}>{from}</Text>
      <Text style={{ color: scoreColor(to), fontSize: 14, fontWeight: "600", flex: 1, textAlign: "center" }}>{to}</Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <DeltaBadge from={from} to={to} />
      </View>
    </View>
  );
}

function ScanPicker({ label, scans, selectedId, onSelect, exclude }: {
  label: string; scans: SkinScan[]; selectedId: string; onSelect: (id: string) => void; exclude?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {scans.map((s) => {
          const isSel = s.id === selectedId;
          const disabled = s.id === exclude;
          const date = new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          return (
            <TouchableOpacity
              key={s.id}
              disabled={disabled}
              onPress={() => onSelect(s.id)}
              style={{
                opacity: disabled ? 0.3 : 1,
                backgroundColor: isSel ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)",
                borderWidth: 0.5, borderColor: isSel ? "#C9826B" : "rgba(255,255,255,0.1)",
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center", minWidth: 64,
              }}
            >
              <Text style={{ color: isSel ? "#C9826B" : "#fff", fontWeight: "700", fontSize: 15 }}>{s.overall_score}</Text>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{date}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["skin-history"],
    queryFn: () => api.getSkinHistory(),
  });

  // Default: oldest as "before", newest as "after"
  const sorted = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const [beforeId, setBeforeId] = useState<string>("");
  const [afterId, setAfterId] = useState<string>("");

  // Initialize defaults once data loads
  useEffect(() => {
    if (sorted.length >= 2 && !beforeId && !afterId) {
      setBeforeId(sorted[0].id);
      setAfterId(sorted[sorted.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);

  const before = history.find((s) => s.id === beforeId);
  const after = history.find((s) => s.id === afterId);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0F", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#C9826B" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0F" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 6 }}>
          <Text style={{ color: "#C9826B", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>Avant / Après</Text>
      </View>

      {history.length < 2 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📊</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 6 }}>Il faut au moins 2 scans</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
            Fais plusieurs scans pour comparer ton évolution dans le temps.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/scan")} style={{ backgroundColor: "#C9826B", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#0D0D0F", fontWeight: "700" }}>📸 Faire un scan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {/* Pickers */}
          <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <ScanPicker label="Avant" scans={sorted} selectedId={beforeId} onSelect={setBeforeId} exclude={afterId} />
            <ScanPicker label="Après" scans={sorted} selectedId={afterId} onSelect={setAfterId} exclude={beforeId} />
          </View>

          {before && after && (
            <>
              {/* Overall comparison */}
              <Animated.View entering={FadeInDown} style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                {[before, after].map((s, i) => {
                  const oc = scoreColor(s.overall_score);
                  return (
                    <View key={i} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: `${oc}40`, borderRadius: 18, padding: 16, alignItems: "center" }}>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{i === 0 ? "Avant" : "Après"}</Text>
                      <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: oc, backgroundColor: `${oc}18`, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: oc, fontWeight: "800", fontSize: 26 }}>{s.overall_score}</Text>
                      </View>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 8 }}>
                        {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  );
                })}
              </Animated.View>

              {/* Global delta banner */}
              <Animated.View entering={FadeInDown.delay(80)} style={{ alignItems: "center", marginBottom: 16 }}>
                {(() => {
                  const d = after.overall_score - before.overall_score;
                  const c = d > 0 ? "#4ade80" : d < 0 ? "#f87171" : "rgba(255,255,255,0.5)";
                  const msg = d > 0 ? `Ta peau s'est améliorée de ${d} points 🎉` : d < 0 ? `Baisse de ${Math.abs(d)} points` : "Score stable";
                  return (
                    <View style={{ backgroundColor: `${c}15`, borderWidth: 0.5, borderColor: `${c}40`, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 }}>
                      <Text style={{ color: c, fontSize: 15, fontWeight: "700", textAlign: "center" }}>{msg}</Text>
                    </View>
                  );
                })()}
              </Animated.View>

              {/* Metric breakdown */}
              <Animated.View entering={FadeInDown.delay(160)} style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", borderRadius: 18, padding: 16 }}>
                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, flex: 1.4 }}>Métrique</Text>
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, flex: 1, textAlign: "center" }}>Avant</Text>
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, flex: 1, textAlign: "center" }}>Après</Text>
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, flex: 1, textAlign: "right" }}>Δ</Text>
                </View>
                <MetricRow label="Acné" from={before.acne_score} to={after.acne_score} />
                <MetricRow label="Hydratation" from={before.hydration_score} to={after.hydration_score} />
                <MetricRow label="Texture" from={before.texture_score} to={after.texture_score} />
                <MetricRow label="Uniformité" from={before.uniformity_score} to={after.uniformity_score} />
              </Animated.View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
