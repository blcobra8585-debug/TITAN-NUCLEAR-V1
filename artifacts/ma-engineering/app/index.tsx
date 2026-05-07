import { useRouter } from "expo-router";
import React, { useEffect } from "react";
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
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.6);
  const titleY = new Animated.Value(20);
  const subtitleOpacity = new Animated.Value(0);
  const progressWidth = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, delay: 300, useNativeDriver: false }),
        Animated.timing(progressWidth, { toValue: width * 0.5, duration: 2000, delay: 500, useNativeDriver: false }),
      ]).start();
    });

    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 3200);
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
          Powered by Lily AI
        </Animated.Text>

        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <Animated.Text style={[styles.brand, { opacity: subtitleOpacity }]}>
          MA ENGINEERING
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060610",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(0,180,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(0,180,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00B4FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  iconEmoji: {
    fontSize: 48,
  },
  title: {
    marginTop: 28,
    fontSize: 38,
    fontWeight: "bold",
    color: "#00B4FF",
    letterSpacing: 6,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#00FFD1",
    letterSpacing: 3,
    fontFamily: "Inter_500Medium",
  },
  progressBg: {
    marginTop: 60,
    width: width * 0.5,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#00B4FF",
    borderRadius: 10,
  },
  brand: {
    marginTop: 16,
    fontSize: 11,
    color: "#8899AA",
    letterSpacing: 4,
    fontFamily: "Inter_400Regular",
  },
});
