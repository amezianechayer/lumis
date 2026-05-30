import React from "react";
import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { t } from "../../utils/i18n";

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
}

export function TypeFilter({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
    >
      {FILTERS.map((f) => {
        const isActive = f === active;
        return (
          <TouchableOpacity
            key={f}
            onPress={() => onChange(f)}
            activeOpacity={0.75}
            className="flex-row items-center px-3 py-2 rounded-full"
            style={{
              backgroundColor: isActive ? "#c9a84c" : "#1a1a2e",
              borderWidth: 1,
              borderColor: isActive ? "#c9a84c" : "rgba(255,255,255,0.1)",
            }}
          >
            <Text style={{ fontSize: 13, marginRight: 4 }}>{FILTER_EMOJIS[f]}</Text>
            <Text
              style={{
                color: isActive ? "#0f0e17" : "#94a3b8",
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
