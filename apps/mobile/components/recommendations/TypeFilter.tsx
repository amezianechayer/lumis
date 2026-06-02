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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
    >
      {filters.map((f) => {
        const isActive = f === active;
        return (
          <TouchableOpacity
            key={f}
            onPress={() => onChange(f)}
            activeOpacity={0.75}
            className="flex-row items-center px-3 py-2 rounded-full"
            style={{
              backgroundColor: isActive ? TERRACOTTA : c.bgCard,
              borderWidth: 0.5,
              borderColor: isActive ? TERRACOTTA : c.border,
            }}
          >
            <Text style={{ fontSize: 13, marginRight: 4 }}>{FILTER_EMOJIS[f]}</Text>
            <Text
              style={{
                color: isActive ? "#fff" : c.textMuted,
                fontSize: 13,
                fontWeight: isActive ? "700" : "400",
              }}
            >
              {t(`recs.filter_${f}` as any)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
