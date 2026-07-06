import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import Icon3D from "@/components/Icon3D";
import { diagBooted, diagLog } from "@/lib/diagnosticLog";

export default function TabLayout() {
  const colors = useColors();

  useEffect(() => {
    diagLog("TabLayout", "(tabs) layout mounted ✓");
    // Mark app as fully booted — overlay strip switches to "● Ready"
    diagBooted();
  }, []);

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
          height: Platform.OS === "web" ? 92 : 70,
          paddingBottom: Platform.OS === "web" ? 34 : 12,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.5 },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgCard }]} />
        ),
      }}
    >
      <Tabs.Screen name="index"       options={{ title: "Dashboard",  tabBarIcon: ({ color, focused }) => <Icon3D name="grid"           size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="chat"        options={{ title: "TITAN AI",   tabBarIcon: ({ color, focused }) => <Icon3D name="cpu"            size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="pipeline"    options={{ title: "Pipeline",   tabBarIcon: ({ color, focused }) => <Icon3D name="columns"        size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="quote"       options={{ title: "Quote",      tabBarIcon: ({ color, focused }) => <Icon3D name="file-text"      size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="leads"       options={{ title: "Leads",      tabBarIcon: ({ color, focused }) => <Icon3D name="target"         size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="whatsapp"    options={{ title: "WhatsApp",   tabBarIcon: ({ color, focused }) => <Icon3D name="message-circle" size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="clients"     options={{ title: "Clients",    tabBarIcon: ({ color, focused }) => <Icon3D name="briefcase"      size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="recruitment" options={{ title: "Recruit",    tabBarIcon: ({ color, focused }) => <Icon3D name="users"          size={16} bgSize={32} color={color} glow={focused} /> }} />
      <Tabs.Screen name="admin"       options={{ title: "Admin",      tabBarIcon: ({ color, focused }) => <Icon3D name="shield"         size={16} bgSize={32} color={color} glow={focused} /> }} />
    </Tabs>
  );
}
