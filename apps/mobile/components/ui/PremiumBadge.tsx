import { View, Text } from "react-native";

/**
 * Consistent "Premium" chip shown on entry points to premium-gated features
 * (only for non-premium users). Terracotta tint, readable on light & dark.
 */
export function PremiumBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const md = size === "md";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(201,130,107,0.18)",
        borderWidth: 0.5,
        borderColor: "rgba(201,130,107,0.45)",
        borderRadius: 999,
        paddingHorizontal: md ? 8 : 6,
        paddingVertical: md ? 3 : 1.5,
      }}
    >
      <Text style={{ fontSize: md ? 11 : 9 }}>👑</Text>
      <Text style={{ color: "#C9826B", fontSize: md ? 11 : 9, fontWeight: "700", letterSpacing: 0.5 }}>
        PREMIUM
      </Text>
    </View>
  );
}
