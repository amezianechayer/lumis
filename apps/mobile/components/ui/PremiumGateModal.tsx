import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  used?: number;
  limit?: number;
}

export function PremiumGateModal({ visible, onClose, title, message, used, limit }: Props) {
  const handleUpgrade = () => {
    onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push("/(tabs)/premium" as any);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/70 items-center justify-end pb-10">
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.springify().damping(18)}
              className="w-full max-w-sm mx-6 bg-[#111111] border border-line rounded-3xl p-6"
              style={{ marginHorizontal: 24 }}
            >
              {/* Icon */}
              <View className="items-center mb-4">
                <Text className="text-5xl mb-3">👑</Text>
                <Text className="text-lumis-white font-display text-xl text-center">{title}</Text>
              </View>

              {/* Usage bar */}
              {used !== undefined && limit !== undefined && (
                <View className="mb-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-lumis-white/40 font-body text-xs">Utilisé</Text>
                    <Text className="text-lumis-white/60 font-body-medium text-xs">{used}/{limit}</Text>
                  </View>
                  <View className="h-1.5 bg-card rounded-full overflow-hidden">
                    <View
                      className="h-full bg-lumis-gold rounded-full"
                      style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                    />
                  </View>
                </View>
              )}

              <Text className="text-lumis-white/50 font-body text-sm text-center mb-6 leading-5">
                {message}
              </Text>

              <TouchableOpacity
                onPress={handleUpgrade}
                className="bg-lumis-gold rounded-2xl py-4 items-center mb-3"
                activeOpacity={0.85}
              >
                <Text className="text-lumis-black font-body-medium text-base">Passer à Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} className="items-center py-2" activeOpacity={0.7}>
                <Text className="text-lumis-white/30 font-body text-sm">Plus tard</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
