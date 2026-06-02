import { Tabs } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TERRACOTTA = "#C9826B";
const CREAM_FAINT = "rgba(232,213,192,0.35)";

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 6, gap: 2, width: 64 }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.35 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 9,
          fontWeight: focused ? "600" : "400",
          color: focused ? TERRACOTTA : CREAM_FAINT,
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
function ScanButton({ onPress, focused }: { onPress?: () => void; focused: boolean }) {
  return (
    <View style={{ width: 70, alignItems: "center" }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: TERRACOTTA,
          alignItems: "center",
          justifyContent: "center",
          marginTop: -18,
          shadowColor: TERRACOTTA,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          borderWidth: 3,
          borderColor: "#0D0D0F",
        }}
      >
        <Text style={{ color: "#0D0D0F", fontSize: 30, fontWeight: "300", marginTop: -2 }}>+</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 9, fontWeight: focused ? "600" : "400", color: focused ? TERRACOTTA : CREAM_FAINT, letterSpacing: 0.4, marginTop: 2 }}>
        Scan
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 58 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0D0D0F",
          borderTopColor: "rgba(232,213,192,0.08)",
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
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Accueil" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="✨" label="Coach" focused={focused} />,
        }}
      />
      {/* Central scan button */}
      <Tabs.Screen
        name="scan"
        options={{
          tabBarButton: (props) => (
            <ScanButton onPress={props.onPress} focused={props.accessibilityState?.selected ?? false} />
          ),
        }}
      />
      <Tabs.Screen
        name="recs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="💡" label="Conseils" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profil" focused={focused} />,
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
