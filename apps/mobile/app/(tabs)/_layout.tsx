import { Tabs } from "expo-router";
import { Text, View } from "react-native";

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View className="items-center gap-0.5 pt-1">
      <Text className={`text-xl ${focused ? "opacity-100" : "opacity-40"}`}>{icon}</Text>
      <Text
        className={`font-body text-[10px] ${
          focused ? "text-lumis-gold" : "text-lumis-white/40"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0A0A0A",
          borderTopColor: "#ffffff15",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
        },
        tabBarShowLabel: false,
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
