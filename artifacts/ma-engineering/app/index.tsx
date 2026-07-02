import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import GlowOrb from "@/components/GlowOrb";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Continuous 3D spin of the icon ring (perspective + rotateY) so it
  // reads as a rotating badge with depth instead of a flat spinner.
  const spin = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 4200, easing: Easing.linear }),
      -1,
      false
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, []);

  const ringSpinStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: (bob.value - 0.5) * 10 },
      { rotateY: `${spin.value}deg` },
    ],
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }),
      ]).start();
    });

    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Ambient depth — soft drifting neon orbs behind everything */}
      <GlowOrb color="#00B4FF" size={220} style={{ top: -60, left: -60 }} duration={5200} />
      <GlowOrb color="#7B2FFF" size={180} style={{ bottom: -40, right: -50 }} duration={6400} driftX={26} driftY={16} />
      <GlowOrb color="#00FFD1" size={140} style={{ top: "35%", right: -30 }} duration={4600} driftX={14} driftY={30} />

      <View style={styles.center}>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <ReAnimated.View style={[styles.iconRing, ringSpinStyle]}>
            <Text style={styles.iconEmoji}>⚙️</Text>
          </ReAnimated.View>
        </Animated.View>

        <Animated.Text style={[styles.title, { transform: [{ translateY: titleY }], opacity }]}>
          MA TITAN
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Powered by TITAN AI
        </Animated.Text>

        <Animated.View style={[styles.progressBg, { opacity: subtitleOpacity }]}>
          <View style={[styles.progressFill, { width: width * 0.5 }]} />
        </Animated.View>

        <Animated.Text style={[styles.brand, { opacity: subtitleOpacity }]}>
          MA ENGINEERING
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060610", overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "#0D0D2B",
    borderWidth: 2, borderColor: "#00B4FF40",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20,
    elevation: 20,
  },
  iconEmoji: { fontSize: 48 },
  title: {
    fontSize: 32, fontFamily: "Inter_700Bold",
    color: "#00B4FF", letterSpacing: 6, marginBottom: 8,
  },
  subtitle: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "#8899AA", letterSpacing: 3, marginBottom: 32,
  },
  progressBg: {
    width: width * 0.5, height: 2,
    backgroundColor: "#0D0D2B", borderRadius: 2, overflow: "hidden", marginBottom: 24,
  },
  progressFill: { height: "100%", backgroundColor: "#00B4FF", borderRadius: 2 },
  brand: {
    fontSize: 10, fontFamily: "Inter_600SemiBold",
    color: "#00B4FF60", letterSpacing: 4,
  },
});
