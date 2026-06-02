import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeIn } from "react-native-reanimated";
import { api } from "../../services/api";
import { Recommendation } from "../../types/api";
import { RecommendationCard } from "../../components/recommendations/RecommendationCard";
import { TypeFilter, RecType } from "../../components/recommendations/TypeFilter";
import { t } from "../../utils/i18n";

export default function RecsScreen() {
  const [filter, setFilter] = useState<RecType>("all");
  const queryClient = useQueryClient();

  const {
    data: recs,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["recommendations", filter],
    queryFn: () => api.getRecommendations(filter === "all" ? undefined : filter),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateRecommendations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  const filtered: Recommendation[] = recs ?? [];

  const renderEmpty = () => {
    if (isLoading) return null;
    if (generateMutation.isPending) {
      return (
        <Animated.View entering={FadeIn} className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color="#C9826B" size="large" />
          <Text className="mt-4 text-base" style={{ color: "#94a3b8" }}>
            {t("recs.generating")}
          </Text>
        </Animated.View>
      );
    }
    return (
      <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-8 py-20">
        <Text style={{ fontSize: 48 }}>✨</Text>
        <Text className="text-lg font-bold mt-4 text-center" style={{ color: "#f8fafc" }}>
          {t("recs.empty_title")}
        </Text>
        <Text className="text-sm text-center mt-2" style={{ color: "#64748b" }}>
          {t("recs.empty_subtitle")}
        </Text>
        <TouchableOpacity
          onPress={() => generateMutation.mutate()}
          activeOpacity={0.8}
          className="mt-6 px-6 py-3 rounded-full"
          style={{ backgroundColor: "#C9826B" }}
        >
          <Text className="font-bold text-base" style={{ color: "#EDE4D4" }}>
            {t("recs.generate")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#EDE4D4" }}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold" style={{ color: "#f8fafc" }}>
          {t("recs.title")}
        </Text>
        {filtered.length > 0 && (
          <TouchableOpacity
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            activeOpacity={0.75}
          >
            <Text style={{ color: "#C9826B", fontSize: 13, fontWeight: "600" }}>
              {generateMutation.isPending ? "…" : "↺ " + t("recs.regenerate")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type filter */}
      <TypeFilter active={filter} onChange={setFilter} />

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C9826B" size="large" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-center mb-4" style={{ color: "#ef4444" }}>
            {t("recs.error")}
          </Text>
          <TouchableOpacity onPress={() => refetch()} activeOpacity={0.8}>
            <Text style={{ color: "#C9826B", fontWeight: "600" }}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <RecommendationCard rec={item} index={index} />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#C9826B"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
