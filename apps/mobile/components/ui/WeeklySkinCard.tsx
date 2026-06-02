import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SkinScan } from "../../types/api";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";
const DAY = 24 * 60 * 60 * 1000;

interface Props {
  scans: SkinScan[];      // DESC (most recent first)
  onScan?: () => void;
  onCompare?: () => void;
}

// Weekly skin tracker: days since last scan + this-week-vs-last-week delta + reminder.
export function WeeklySkinCard({ scans, onScan, onCompare }: Props) {
  const c = useThemeColors();
  if (!scans || scans.length === 0) return null;

  const latest = scans[0];
  const latestTime = new Date(latest.created_at).getTime();
  const daysSince = Math.floor((Date.now() - latestTime) / DAY);

  // Reference = most recent scan at least 5 days older than latest (≈ last week), else previous
  const ref =
    scans.find((s, i) => i > 0 && latestTime - new Date(s.created_at).getTime() >= 5 * DAY) ??
    (scans.length > 1 ? scans[1] : null);
  const delta = ref ? latest.overall_score - ref.overall_score : null;

  const dueForWeekly = daysSince >= 7;
  const deltaColor = delta == null ? c.textMuted : delta > 1 ? "#5DCAA5" : delta < -1 ? "#F09595" : c.textMuted;
  const arrow = delta == null ? "" : delta > 1 ? "↑" : delta < -1 ? "↓" : "→";

  return (
    <Animated.View entering={FadeInDown} style={{
      backgroundColor: c.bgCard, borderWidth: 0.5,
      borderColor: dueForWeekly ? `${TERRACOTTA}55` : c.borderLight,
      borderRadius: 20, padding: 18, marginBottom: 12,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
          📈 Suivi hebdomadaire
        </Text>
        <Text style={{ color: dueForWeekly ? TERRACOTTA : c.textFaint, fontSize: 11, fontWeight: dueForWeekly ? "700" : "400" }}>
          {daysSince === 0 ? "scan aujourd'hui" : `il y a ${daysSince} j`}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {/* Score */}
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: c.text, fontSize: 34, fontWeight: "800" }}>{latest.overall_score}</Text>
          <Text style={{ color: c.textFaint, fontSize: 10 }}>score actuel</Text>
        </View>

        {/* Weekly delta */}
        <View style={{ flex: 1 }}>
          {delta != null ? (
            <>
              <Text style={{ color: deltaColor, fontSize: 18, fontWeight: "700" }}>
                {arrow} {delta > 0 ? "+" : ""}{delta} pts
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                {delta > 1 ? "Ta peau progresse vs la dernière fois 🎉"
                  : delta < -1 ? "Léger recul — on ajuste la routine"
                  : "Stable depuis ton dernier scan"}
              </Text>
            </>
          ) : (
            <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 17 }}>
              Refais un scan chaque semaine pour suivre ton évolution.
            </Text>
          )}
        </View>
      </View>

      {/* CTA */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <TouchableOpacity
          onPress={onScan}
          activeOpacity={0.85}
          style={{ flex: 1, backgroundColor: dueForWeekly ? TERRACOTTA : c.primaryMuted, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ color: dueForWeekly ? "#fff" : TERRACOTTA, fontWeight: "700", fontSize: 13 }}>
            {dueForWeekly ? "📸 Scan de la semaine" : "📸 Nouveau scan"}
          </Text>
        </TouchableOpacity>
        {scans.length >= 2 && onCompare && (
          <TouchableOpacity
            onPress={onCompare}
            activeOpacity={0.85}
            style={{ borderWidth: 0.5, borderColor: c.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" }}
          >
            <Text style={{ color: c.textMuted, fontWeight: "600", fontSize: 13 }}>Avant/Après</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
