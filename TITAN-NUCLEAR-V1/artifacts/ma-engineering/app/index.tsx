import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import GlowOrb from "@/components/GlowOrb";
import { diagLog, diagError } from "@/lib/diagnostics";

const { width } = Dimensions.get("window");
const APP_NAME = "MA TITAN";

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const logoRotate = useSharedValue(100);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const idleSpin = useSharedValue(0);
  const idleBob = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const shimmerX = useSharedValue(-1);
  const progress = useSharedValue(0);

  useEffect(() => {
    diagLog("Splash screen mounted");

    logoOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    logoRotate.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.exp) });
    logoScale.value = withSpring(1, { damping: 9, stiffness: 90 }, () => {
      idleSpin.value = withRepeat(
        withTiming(360, { duration: 5000, easing: Easing.linear }),
        -1,
        false
      );
      idleBob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    });

    glowPulse.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1100, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    shimmerX.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.4, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
          withDelay(1400, withTiming(-1, { duration: 0 }))
        ),
        -1,
        false
      )
    );

    progress.value = withDelay(1000, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }));

    diagLog("Splash timer started (3400ms)");
    const timer = setTimeout(() => {
      diagLog("Splash timer fired — navigating to (tabs)");
      try {
        router.replace("/(tabs)");
        diagLog("router.replace called OK");
      } catch (err) {
        diagError("router.replace to (tabs)", err);
        // Retry once after 500ms if first attempt failed
        setTimeout(() => {
          try {
            diagLog("Retrying router.replace…");
            router.replace("/(tabs)");
          } catch (e2) {
            diagError("router.replace retry failed", e2);
          }
        }, 500);
      }
    }, 3400);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { perspective: 1000 },
      { translateY: (idleBob.value - 0.5) * 12 },
      { rotateY: `${logoRotate.value + idleSpin.value}deg` },
      { scale: logoScale.value },
    ],
  }));

  const welcomeGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + glowPulse.value * 0.5,
    textShadowRadius: 10 + glowPulse.value * 16,
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shimmerX.value * 140 },
      { rotate: "20deg" },
    ],
  }));

  const letters = APP_NAME.split("");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlowOrb color="#00B4FF" size={240} style={{ top: -70, left: -70 }} duration={5200} />
      <GlowOrb color="#7B2FFF" size={190} style={{ bottom: -50, right: -60 }} duration={6400} driftX={26} driftY={16} />
      <GlowOrb color="#00FFD1" size={150} style={{ top: "35%", right: -35 }} duration={4600} driftX={14} driftY={30} />

      <View style={styles.center}>
        <ReAnimated.View style={[styles.logoRing, logoStyle]}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <ReAnimated.View style={[styles.shimmerStreak, shimmerStyle]} pointerEvents="none" />
        </ReAnimated.View>

        <View style={styles.titleRow}>
          {letters.map((ch, i) => (
            <ReAnimated.Text
              key={`${ch}-${i}`}
              entering={FadeInDown.duration(450)
                .delay(750 + i * 55)
                .springify()
                .damping(11)}
              style={styles.title}
            >
              {ch === " " ? "\u00A0" : ch}
            </ReAnimated.Text>
          ))}
        </View>

        <ReAnimated.Text
          entering={FadeIn.duration(700).delay(1250)}
          style={[styles.welcome, welcomeGlowStyle]}
        >
          Welcome
        </ReAnimated.Text>

        <ReAnimated.Text
          entering={FadeIn.duration(600).delay(1500)}
          style={styles.subtitle}
        >
          Powered by TITAN AI
        </ReAnimated.Text>

        <ReAnimated.View entering={FadeIn.duration(600).delay(1500)} style={styles.progressBg}>
          <ReAnimated.View style={[styles.progressFill, progressFillStyle]} />
        </ReAnimated.View>

        <ReAnimated.Text entering={FadeIn.duration(600).delay(1650)} style={styles.brand}>
          MA ENGINEERING
        </ReAnimated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060610", overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoRing: {
    width: 120, height: 120, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
    marginBottom: 26,
    shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 24,
    elevation: 20,
    overflow: "hidden",
    backgroundColor: "#0D0D2B",
    borderWidth: 2, borderColor: "#00B4FF40",
  },
  logoImage: { width: "100%", height: "100%" },
  shimmerStreak: {
    position: "absolute",
    top: -40, bottom: -40, left: -10,
    width: 26,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  titleRow: { flexDirection: "row", marginBottom: 6 },
  title: {
    fontSize: 30, fontFamily: "Inter_700Bold",
    color: "#00B4FF", letterSpacing: 4,
  },
  welcome: {
    fontSize: 22, fontFamily: "Inter_700Bold",
    color: "#00FFD1", letterSpacing: 3, marginTop: 4, marginBottom: 14,
    textShadowColor: "#00FFD1",
    textShadowOffset: { width: 0, height: 0 },
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
