import { Tabs } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon, IconName } from "../../components/ui/AppIcon";
import { useThemeColors } from "../../stores/theme.store";

const TERRACOTTA = "#C9826B";

function TabIcon({ name, label, focused, faint }: { name: IconName; label: string; focused: boolean; faint: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 6, gap: 3, width: 64 }}>
      <AppIcon name={name} size={22} color={focused ? TERRACOTTA : faint} strokeWidth={focused ? 2.1 : 1.8} />
      <Text
        style={{
          fontSize: 9,
          fontWeight: focused ? "600" : "400",
          color: focused ? TERRACOTTA : faint,
          letterSpacing: 0.4,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// Central elevated "+" scan button
function ScanButton({ onPress, focused, bg, faint }: { onPress?: () => void; focused: boolean; bg: string; faint: string }) {
  return (
    <View style={{ width: 70, alignItems: "center" }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{
          width: 54, height: 54, borderRadius: 27,
          backgroundColor: TERRACOTTA,
          alignItems: "center", justifyContent: "center",
          marginTop: -18,
          shadowColor: TERRACOTTA, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          elevation: 8, borderWidth: 3, borderColor: bg,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "300", marginTop: -2 }}>+</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 9, fontWeight: focused ? "600" : "400", color: focused ? TERRACOTTA : faint, letterSpacing: 0.4, marginTop: 2 }}>
        Scan
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const tabBarHeight = 58 + insets.bottom;
  const faint = colors.textFaint;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderLight,
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" label="Accueil" focused={focused} faint={faint} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="coach" label="Coach" focused={focused} faint={faint} />,
        }}
      />
      {/* Central scan button */}
      <Tabs.Screen
        name="scan"
        options={{
          tabBarButton: (props) => (
            <ScanButton onPress={props.onPress} focused={props.accessibilityState?.selected ?? false} bg={colors.bg} faint={faint} />
          ),
        }}
      />
      <Tabs.Screen
        name="recs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="recs" label="Conseils" focused={focused} faint={faint} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="profile" label="Profil" focused={focused} faint={faint} />,
        }}
      />
      {/* Premium — hidden from tab bar, still reachable via dashboard/profile */}
      <Tabs.Screen
        name="premium"
        options={{ href: null }}
      />
    </Tabs>
  );
}
