import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AiInciResult as AiResult } from "../../services/gemini";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

function ratingColor(r: string) {
  return r === "good" ? "#5DCAA5" : r === "ok" ? "#f59e0b" : "#F09595";
}
function ratingLabel(r: string) {
  return r === "good" ? "OK" : r === "ok" ? "Modéré" : "Attention";
}
function scoreColor(s: number) {
  return s >= 75 ? "#5DCAA5" : s >= 50 ? "#C9826B" : "#F09595";
}
const VERDICT_LABEL: Record<string, string> = {
  excellent: "Excellent ✅", good: "Bon 👍", neutral: "Neutre ⚠️", avoid: "À éviter ❌",
};

export function AiInciResult({ data }: { data: AiResult }) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const sc = scoreColor(data.score);
  const shown = expanded ? data.ingredients : data.ingredients.slice(0, 8);

  return (
    <View>
      {/* Score + verdict */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: sc, backgroundColor: `${sc}18`, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: sc, fontWeight: "800", fontSize: 20 }}>{data.score}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {data.productGuess ? (
            <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{data.productGuess}</Text>
          ) : null}
          <Text style={{ color: sc, fontSize: 13, fontWeight: "700", marginTop: 2 }}>{VERDICT_LABEL[data.verdict] ?? data.verdict}</Text>
          {data.summary ? <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 }}>{data.summary}</Text> : null}
        </View>
      </View>

      {/* Personalized alerts */}
      {data.alerts.length > 0 && (
        <View style={{ backgroundColor: "rgba(240,149,149,0.12)", borderWidth: 0.5, borderColor: "rgba(240,149,149,0.35)", borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <Text style={{ color: "#F09595", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            ⚠️ Alertes pour ta peau
          </Text>
          <View style={{ gap: 6 }}>
            {data.alerts.map((a, i) => (
              <Text key={i} style={{ color: c.text, fontSize: 12, lineHeight: 17 }}>• {a}</Text>
            ))}
          </View>
        </View>
      )}
      {data.alerts.length === 0 && data.ingredients.length > 0 && (
        <View style={{ backgroundColor: "rgba(93,202,165,0.12)", borderRadius: 12, padding: 10, marginBottom: 14 }}>
          <Text style={{ color: "#5DCAA5", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
            ✅ Rien de problématique détecté pour ton profil
          </Text>
        </View>
      )}

      {/* Ingredient list */}
      <Text style={{ color: c.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        {data.ingredients.length} ingrédients analysés par IA
      </Text>
      <View style={{ gap: 8 }}>
        {shown.map((ing, i) => {
          const col = ratingColor(ing.rating);
          return (
            <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6, borderBottomWidth: i < shown.length - 1 ? 0.5 : 0, borderBottomColor: c.borderLight }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col, marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={1}>{ing.name}</Text>
                  <Text style={{ color: col, fontSize: 10, fontWeight: "700" }}>{ratingLabel(ing.rating)}</Text>
                </View>
                <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>
                  {ing.fonction}
                  {ing.comedogenic >= 3 ? `  ·  comédogène ${ing.comedogenic}/5` : ""}
                </Text>
                {ing.concern ? (
                  <Text style={{ color: "#F09595", fontSize: 11, marginTop: 2, lineHeight: 15 }}>⚠️ {ing.concern}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {data.ingredients.length > 8 && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={{ marginTop: 10, alignItems: "center" }}>
          <Text style={{ color: TERRACOTTA, fontSize: 13, fontWeight: "600" }}>
            {expanded ? "Voir moins" : `Voir les ${data.ingredients.length - 8} autres`}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={{ color: c.textFaint, fontSize: 10, textAlign: "center", marginTop: 12 }}>
        Analyse générée par IA · à titre indicatif, non médical
      </Text>
    </View>
  );
}
