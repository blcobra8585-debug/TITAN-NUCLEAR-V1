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

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

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
      <View style={styles.center}>
        <Animated.View style={[styles.iconRing, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.iconEmoji}>⚙️</Text>
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
  container: { flex: 1, backgroundColor: "#060610" },
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
