import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { analyzeInci, ratingMeta, TAG_LABELS, SkinContext } from "../../utils/inci";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

interface Props {
  ingredients: string;
  skin?: SkinContext;
  defaultExpanded?: boolean;
}

export function InciAnalysis({ ingredients, skin = {}, defaultExpanded = false }: Props) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const analysis = useMemo(() => analyzeInci(ingredients, skin), [ingredients, skin.skinType, skin.acneProne]);

  if (analysis.total === 0) return null;

  const shown = expanded ? analysis.items : analysis.items.slice(0, 6);

  return (
    <View>
      {/* Summary */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Stat c={c} value={analysis.total} label="ingrédients" />
        <Stat c={c} value={analysis.matched} label="analysés" color={TERRACOTTA} />
        <Stat c={c} value={analysis.flagged} label="alertes" color={analysis.flagged > 0 ? "#F09595" : "#5DCAA5"} />
      </View>

      {/* Targeted alerts */}
      {analysis.topAlerts.length > 0 && (
        <View style={{ backgroundColor: "rgba(240,149,149,0.12)", borderWidth: 0.5, borderColor: "rgba(240,149,149,0.35)", borderRadius: 14, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: "#F09595", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            ⚠️ Alertes pour ta peau
          </Text>
          <View style={{ gap: 6 }}>
            {analysis.topAlerts.map((a, i) => (
              <Text key={i} style={{ color: c.text, fontSize: 12, lineHeight: 17 }}>• {a}</Text>
            ))}
          </View>
        </View>
      )}

      {analysis.flagged === 0 && analysis.matched > 0 && (
        <View style={{ backgroundColor: "rgba(93,202,165,0.12)", borderRadius: 12, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: "#5DCAA5", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
            ✅ Aucun ingrédient problématique détecté pour ton profil
          </Text>
        </View>
      )}

      {/* Per-ingredient list */}
      <View style={{ gap: 8 }}>
        {shown.map((item, i) => {
          const meta = item.info ? ratingMeta(item.info.rating) : { color: c.textFaint, label: "?" };
          return (
            <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6, borderBottomWidth: i < shown.length - 1 ? 0.5 : 0, borderBottomColor: c.borderLight }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color, marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={1}>{item.raw}</Text>
                  {item.info && (
                    <Text style={{ color: meta.color, fontSize: 10, fontWeight: "700" }}>{meta.label}</Text>
                  )}
                </View>
                {item.info ? (
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>
                    {item.info.fn}
                    {typeof item.info.comedo === "number" && item.info.comedo >= 3 ? `  ·  comédogène ${item.info.comedo}/5` : ""}
                  </Text>
                ) : (
                  <Text style={{ color: c.textFaint, fontSize: 11, marginTop: 1 }}>Non répertorié</Text>
                )}
                {item.info?.tags && item.info.tags.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {item.info.tags.map((tag) => (
                      <View key={tag} style={{ backgroundColor: c.primaryMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ color: TERRACOTTA, fontSize: 9, fontWeight: "600" }}>{TAG_LABELS[tag]}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {analysis.items.length > 6 && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={{ marginTop: 10, alignItems: "center" }}>
          <Text style={{ color: TERRACOTTA, fontSize: 13, fontWeight: "600" }}>
            {expanded ? "Voir moins" : `Voir les ${analysis.items.length - 6} autres ingrédients`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Stat({ c, value, label, color }: { c: any; value: number; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.bgCard, borderWidth: 0.5, borderColor: c.borderLight, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ color: color ?? c.text, fontSize: 18, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}
