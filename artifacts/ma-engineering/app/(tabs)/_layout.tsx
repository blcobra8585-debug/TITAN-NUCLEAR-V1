import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.neonBlue,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: "rgba(0,180,255,0.15)",
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 84 : 64,
          paddingBottom: Platform.OS === "web" ? 34 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 9,
          letterSpacing: 0.5,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgCard }]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Feather name="grid" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Lily AI",
          tabBarIcon: ({ color }) => <Feather name="message-circle" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="quote"
        options={{
          title: "Quote",
          tabBarIcon: ({ color }) => <Feather name="file-text" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="whatsapp"
        options={{
          title: "WhatsApp",
          tabBarIcon: ({ color }) => <Feather name="smartphone" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color }) => <Feather name="users" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={19} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color }) => <Feather name="shield" size={19} color={color} />,
        }}
      />
    </Tabs>
  );
}
