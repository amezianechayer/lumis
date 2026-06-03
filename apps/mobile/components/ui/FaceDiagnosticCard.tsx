import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { FaceDiagnostic } from "../../types/api";
import { useThemeColors } from "../../stores/theme.store";
import type { ThemeColors } from "../../constants/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ color: c.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Bullets({ items, color, text }: { items: string[]; color: string; text: string }) {
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          <Text style={{ color, fontSize: 13, marginTop: 1 }}>•</Text>
          <Text style={{ color: text, fontSize: 13, lineHeight: 19, flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Chips({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {items.map((item, i) => (
        <View
          key={i}
          style={{ backgroundColor: `${color}1A`, borderWidth: 0.5, borderColor: `${color}40`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}
        >
          <Text style={{ color, fontSize: 12 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Personalized AI morphology + colorimetry reading. Mirrors SkinDiagnosticCard:
 * free teaser (summary + strengths), premium locks the actionable guidance.
 */
export function FaceDiagnosticCard({
  diagnostic,
  isPremium = false,
}: {
  diagnostic: FaceDiagnostic;
  isPremium?: boolean;
}) {
  const c = useThemeColors();
  const d = diagnostic;

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Text style={{ fontSize: 18 }}>🧬</Text>
        <Text style={{ color: c.text, fontWeight: "700", fontSize: 16 }}>Diagnostic morpho & couleur</Text>
      </View>

      {!!d.summary && <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 21 }}>{d.summary}</Text>}

      {/* Strengths — free */}
      {d.strengths?.length > 0 && (
        <Section title="✨ Tes atouts">
          <Bullets items={d.strengths} color={c.primary} text={c.text} />
        </Section>
      )}

      {/* Premium-gated guidance */}
      <View style={{ position: "relative" }}>
        <View style={{ opacity: isPremium ? 1 : 0.12 }} pointerEvents={isPremium ? "auto" : "none"}>
          {d.face_shape_tips?.length > 0 && (
            <Section title="Mettre ta forme en valeur">
              <Bullets items={d.face_shape_tips} color={c.primary} text={c.text} />
            </Section>
          )}

          {d.best_colors?.length > 0 && (
            <Section title="🎨 Couleurs qui te subliment">
              <Chips items={d.best_colors} color="#5DCAA5" />
            </Section>
          )}

          {d.colors_to_avoid?.length > 0 && (
            <Section title="🚫 Couleurs à éviter">
              <Chips items={d.colors_to_avoid} color="#f87171" />
            </Section>
          )}

          {d.style_tips?.length > 0 && (
            <Section title="💡 Conseils style">
              <Bullets items={d.style_tips} color={c.primary} text={c.text} />
            </Section>
          )}
        </View>
        {!isPremium && <FaceDiagnosticLockOverlay c={c} />}
      </View>
    </Animated.View>
  );
}

function FaceDiagnosticLockOverlay({ c }: { c: ThemeColors }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
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
          Conseils image personnalisés
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          Couleurs qui te subliment, mises en valeur de ta morphologie et conseils style.
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
