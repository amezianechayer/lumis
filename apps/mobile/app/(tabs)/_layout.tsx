import { Tabs } from "expo-router";
import { Text, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 6, gap: 2 }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.35 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 9,
          fontWeight: focused ? "700" : "400",
          color: focused ? "#C9A84C" : "rgba(255,255,255,0.35)",
          letterSpacing: 0.2,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 52 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0A0A0A",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Accueil" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📸" label="Scan" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="✨" label="Coach" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="recs"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💡" label="Conseils" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👑" label="Premium" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
