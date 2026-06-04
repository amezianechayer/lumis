import React from "react";
import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { t } from "../../utils/i18n";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

export type RecType = "all" | "makeup" | "grooming" | "haircut" | "skincare" | "color_season";

const FILTERS: RecType[] = ["all", "makeup", "grooming", "haircut", "skincare", "color_season"];

const FILTER_EMOJIS: Record<RecType, string> = {
  all: "✨",
  makeup: "💄",
  grooming: "🧔",
  haircut: "✂️",
  skincare: "🌿",
  color_season: "🎨",
};

interface Props {
  active: RecType;
  onChange: (type: RecType) => void;
  gender?: string;
}

export function TypeFilter({ active, onChange, gender }: Props) {
  const c = useThemeColors();
  // Hide gender-irrelevant chips: no makeup for men, no beard grooming for women
  const filters = FILTERS.filter((f) => {
    if (gender === "male" && f === "makeup") return false;
    if (gender === "female" && f === "grooming") return false;
    return true;
  });
  return (
    <View style={{ borderBottomWidth: 0.5, borderBottomColor: c.borderLight }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 6 }}
      >
        {filters.map((f) => {
          const isActive = f === active;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => onChange(f)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: isActive ? TERRACOTTA : "transparent",
                ...(isActive
                  ? {
                      shadowColor: TERRACOTTA,
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 4,
                    }
                  : {}),
              }}
            >
              <Text style={{ fontSize: 14 }}>{FILTER_EMOJIS[f]}</Text>
              <Text
                style={{
                  color: isActive ? "#fff" : c.textMuted,
                  fontSize: 13.5,
                  fontWeight: isActive ? "700" : "500",
                }}
              >
                {t(`recs.filter_${f}` as any)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
