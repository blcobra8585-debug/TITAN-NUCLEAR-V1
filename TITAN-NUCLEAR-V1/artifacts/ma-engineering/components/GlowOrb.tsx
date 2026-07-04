import React, { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

interface GlowOrbProps {
  color: string;
  size?: number;
  style?: ViewStyle;
  duration?: number;
  driftX?: number;
  driftY?: number;
}

/**
 * A soft blurred neon "orb" that gently drifts and pulses.
 * Used as a cheap stand-in for real 3D depth/lighting since the app
 * has no three.js / expo-gl renderer — this fakes ambient depth with
 * layered blur, glow and parallax-style motion instead.
 */
export default function GlowOrb({
  color,
  size = 160,
  style,
  duration = 6000,
  driftX = 18,
  driftY = 24,
}: GlowOrbProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    // Fix: add `duration` to dep array — previously the animation was started
    // once at mount with the initial duration value and never restarted if the
    // prop changed, causing the orb to keep the old speed silently.
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = (t.value - 0.5) * 2 * driftX;
    const translateY = (t.value - 0.5) * 2 * driftY;
    const scale = 0.9 + t.value * 0.2;
    const opacity = 0.35 + t.value * 0.25;
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
        },
        style,
        animatedStyle,
      ]}
    >
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 10,
    overflow: "hidden",
  },
});
