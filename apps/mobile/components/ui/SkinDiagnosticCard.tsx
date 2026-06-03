import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { SkinDiagnostic } from "../../types/api";
import { useThemeColors } from "../../stores/theme.store";
import type { ThemeColors } from "../../constants/theme";
import { PremiumBadge } from "./PremiumBadge";

const SKIN_TYPE_LABEL: Record<string, string> = {
  grasse: "Peau grasse",
  "sèche": "Peau sèche",
  seche: "Peau sèche",
  mixte: "Peau mixte",
  sensible: "Peau sensible",
  normale: "Peau normale",
};

function severityColor(sev: string): string {
  const s = sev.toLowerCase();
  if (s.includes("élev") || s.includes("elev") || s.includes("haut")) return "#f87171";
  if (s.includes("modér") || s.includes("moder") || s.includes("moy")) return "#fbbf24";
  return "#5DCAA5";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={{ marginTop: 18 }}>
      <Text
        style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Renders the persisted AI skin diagnostic (skin type, concerns, actives to use
 * / avoid, a tailored routine and lifestyle tips). Shown identically on the live
 * scan result and in the history detail, so saved scans look just as rich.
 */
export function SkinDiagnosticCard({
  diagnostic,
  isPremium = false,
}: {
  diagnostic: SkinDiagnostic;
  isPremium?: boolean;
}) {
  const c = useThemeColors();
  const d = diagnostic;
  const typeLabel = SKIN_TYPE_LABEL[d.skin_type?.toLowerCase()] ?? d.skin_type;

  return (
    <Animated.View
      entering={FadeInDown.delay(120)}
      style={{
        backgroundColor: c.bgCard,
        borderWidth: 0.5,
        borderColor: c.borderLight,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {/* Header: skin type + summary */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Text style={{ fontSize: 18 }}>🧴</Text>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 16 }}>Diagnostic peau</Text>
        {!isPremium && <PremiumBadge />}
        {typeLabel ? (
          <View
            style={{
              marginLeft: "auto",
              backgroundColor: c.primaryMuted,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: "600" }}>{typeLabel}</Text>
          </View>
        ) : null}
      </View>

      {!!d.summary && (
        <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 21 }}>{d.summary}</Text>
      )}

      {/* Concerns */}
      {d.concerns?.length > 0 && (
        <Section title="Préoccupations identifiées">
          <View style={{ gap: 10 }}>
            {d.concerns.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginTop: 5,
                    backgroundColor: severityColor(item.severity),
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: c.text, fontWeight: "600", fontSize: 14 }}>{item.label}</Text>
                    <Text style={{ color: severityColor(item.severity), fontSize: 11 }}>
                      {item.severity}
                    </Text>
                  </View>
                  {!!item.explanation && (
                    <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 19, marginTop: 1 }}>
                      {item.explanation}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Premium-gated deep guidance (actives / avoid / routine / tips) */}
      <View style={{ position: "relative" }}>
        <View style={{ opacity: isPremium ? 1 : 0.12 }} pointerEvents={isPremium ? "auto" : "none"}>
      {/* Recommended actives */}
      {d.recommended_actives?.length > 0 && (
        <Section title="✅ Actifs recommandés">
          <View style={{ gap: 8 }}>
            {d.recommended_actives.map((a, i) => (
              <View key={i} style={{ backgroundColor: "rgba(93,202,165,0.10)", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: c.text, fontWeight: "600", fontSize: 13 }}>{a.name}</Text>
                {!!a.why && (
                  <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 }}>{a.why}</Text>
                )}
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Avoid */}
      {d.avoid?.length > 0 && (
        <Section title="🚫 À éviter">
          <View style={{ gap: 8 }}>
            {d.avoid.map((a, i) => (
              <View key={i} style={{ backgroundColor: "rgba(248,113,113,0.10)", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: c.text, fontWeight: "600", fontSize: 13 }}>{a.name}</Text>
                {!!a.why && (
                  <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 }}>{a.why}</Text>
                )}
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Routine */}
      {(d.routine?.morning?.length > 0 || d.routine?.evening?.length > 0) && (
        <Section title="Routine recommandée">
          <View style={{ gap: 12 }}>
            {d.routine?.morning?.length > 0 && (
              <RoutineBlock icon="☀️" label="Matin" steps={d.routine.morning} color={c.primary} muted={c.textMuted} text={c.text} />
            )}
            {d.routine?.evening?.length > 0 && (
              <RoutineBlock icon="🌙" label="Soir" steps={d.routine.evening} color={c.primary} muted={c.textMuted} text={c.text} />
            )}
          </View>
        </Section>
      )}

      {/* Lifestyle tips */}
      {d.lifestyle_tips?.length > 0 && (
        <Section title="💡 Conseils lifestyle">
          <View style={{ gap: 6 }}>
            {d.lifestyle_tips.map((tip, i) => (
              <Text key={i} style={{ color: c.textMuted, fontSize: 13, lineHeight: 19 }}>
                • {tip}
              </Text>
            ))}
          </View>
        </Section>
      )}
        </View>
        {!isPremium && <DiagnosticLockOverlay c={c} />}
      </View>
    </Animated.View>
  );
}

function DiagnosticLockOverlay({ c }: { c: ThemeColors }) {
  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          backgroundColor: c.bg,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 18,
          alignItems: "center",
          borderWidth: 0.5,
          borderColor: c.border,
          maxWidth: 280,
        }}
      >
        <Text style={{ fontSize: 26, marginBottom: 6 }}>🔒</Text>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 15, marginBottom: 3, textAlign: "center" }}>
          Conseils personnalisés
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          Actifs recommandés, ingrédients à éviter et routine sur-mesure pour ta peau.
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/premium" as any)}
          style={{ backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Débloquer avec Premium</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RoutineBlock({
  icon, label, steps, color, muted, text,
}: {
  icon: string; label: string; steps: string[]; color: string; muted: string; text: string;
}) {
  return (
    <View>
      <Text style={{ color, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
        {icon} {label}
      </Text>
      <View style={{ gap: 5 }}>
        {steps.map((step, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            <Text style={{ color, fontSize: 13, fontWeight: "700" }}>{i + 1}.</Text>
            <Text style={{ color: text, fontSize: 13, lineHeight: 19, flex: 1 }}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
