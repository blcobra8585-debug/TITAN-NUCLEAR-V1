import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface Icon3DProps {
  name: keyof typeof Feather.glyphMap;
  color: string;
  size?: number;
  bgSize?: number;
  glow?: boolean;
  onPress?: () => void;
}

/**
 * Glossy "3D chip" icon used across tab bar, dashboard stat cards, and
 * quick actions. Simulates depth with a soft gradient-like layered
 * background, a bevel highlight arc, and a subtle press-tilt animation
 * (Reanimated) — no external gradient/3D lib required so it stays cheap
 * on Expo Go / low-end Android devices.
 */
export default function Icon3D({ name, color, size = 18, bgSize = 34, glow = false, onPress }: Icon3DProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.88, { damping: 10, stiffness: 220 });
    rotate.value = withSpring(-4, { damping: 10, stiffness: 220 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 8, stiffness: 180 });
    rotate.value = withSpring(0, { damping: 8, stiffness: 180 });
  }

  const content = (
    <Animated.View
      style={[
        styles.chip,
        {
          width: bgSize,
          height: bgSize,
          borderRadius: bgSize * 0.32,
          backgroundColor: `${color}22`,
          borderColor: `${color}55`,
          shadowColor: color,
          shadowOpacity: glow ? 0.85 : 0.35,
          shadowRadius: glow ? 10 : 5,
          elevation: glow ? 8 : 3,
        },
        animatedStyle,
      ]}
    >
      {/* Bevel highlight — top-left specular sheen fakes a glossy 3D surface */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            width: bgSize * 0.7,
            height: bgSize * 0.45,
            borderRadius: bgSize * 0.35,
            top: bgSize * 0.06,
            left: bgSize * 0.08,
            backgroundColor: `${color}18`,
          },
        ]}
      />
      {/* Base shadow layer to fake thickness/depth beneath the icon */}
      <View
        pointerEvents="none"
        style={[
          styles.baseShadow,
          {
            width: bgSize * 0.78,
            height: bgSize * 0.22,
            borderRadius: bgSize * 0.4,
            bottom: -bgSize * 0.06,
            backgroundColor: `${color}30`,
          },
        ]}
      />
      <Feather name={name} size={size} color={color} />
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} hitSlop={8}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
  },
  baseShadow: {
    position: "absolute",
    alignSelf: "center",
    opacity: 0.5,
  },
});
