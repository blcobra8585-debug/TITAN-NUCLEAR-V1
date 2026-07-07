import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
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
import { diagLog, diagStage, diagWarn } from "@/lib/diagnosticLog";
import { sendSplashStuckAlert } from "@/lib/waCrashAlert";

const { width } = Dimensions.get("window");
const APP_NAME = "MA TITAN";

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // isMounted tracks whether this component is still on screen.
  // Navigation success → component unmounts → isMounted.current = false.
  // Stuck detector checks isMounted.current after 10s — if still true, we're stuck.
  const isMounted = useRef(true);

  // Logo: dramatic 3D flip-in (rotateY 100deg -> 0) with perspective +
  // spring scale pop, then settles into a slow perpetual hover-spin.
  const logoRotate = useSharedValue(100);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const idleSpin = useSharedValue(0);
  const idleBob = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const shimmerX = useSharedValue(-1);

  // Fine-grained progress bar fill driven by a shared value for a
  // buttery-smooth native-thread animation.
  const progress = useSharedValue(0);

  useEffect(() => {
    diagLog("SplashScreen", "splash mounted ✓");
    diagStage("splash screen mounted");

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

    // Shimmer sweep — a soft diagonal light streak crosses the logo
    // periodically once it's settled, like light reflecting off a 3D surface.
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

    diagLog("SplashScreen", "3400ms navigation timer started");
    diagStage("splash — waiting 3.4s…");

    const SPLASH_START = Date.now();

    const timer = setTimeout(() => {
      diagLog("SplashScreen", "timer fired — attempting navigation to tabs");
      diagStage("navigating to tabs…");

      // Strategy 1 — standard replace.
      // Navigation SUCCESS = this component unmounts = isMounted.current → false.
      // We detect FAILURE by checking isMounted.current after a short delay,
      // because expo-router does NOT throw synchronously on navigation failure.
      try {
        router.replace("/(tabs)");
        diagLog("SplashScreen", "router.replace('/(tabs)') called");
      } catch (e1: any) {
        diagWarn("SplashScreen/nav-1-sync", e1?.message ?? String(e1));
      }

      // Strategy 2 — 600ms later, if still mounted, Strategy 1 silently failed
      setTimeout(() => {
        if (!isMounted.current) return; // already navigated — done
        diagWarn("SplashScreen/nav-1-failed", "still mounted 600ms after replace — trying push");
        try {
          router.push("/(tabs)");
        } catch (e2: any) {
          diagWarn("SplashScreen/nav-2-sync", e2?.message ?? String(e2));
        }
      }, 600);

      // Strategy 3 — 1200ms later, if still mounted, try direct screen path
      setTimeout(() => {
        if (!isMounted.current) return;
        diagWarn("SplashScreen/nav-2-failed", "still mounted 1200ms after — trying index path");
        try {
          (router as any).navigate("/(tabs)/index");
        } catch (e3: any) {
          diagWarn("SplashScreen/nav-3-sync", e3?.message ?? String(e3));
        }
      }, 1200);

      // Strategy 4 — 2000ms later, if still completely stuck → send alert
      setTimeout(() => {
        if (!isMounted.current) return;
        diagWarn("SplashScreen/all-nav-failed", "all 3 strategies failed — sending alert");
        sendSplashStuckAlert(Date.now() - SPLASH_START).catch(() => {});
      }, 2000);
    }, 3400);

    // Stuck detector: agar 10 seconds baad bhi ye component mount hai →
    // navigation ya tabs crash ho gaya. Component unmount hona = success.
    const stuckTimer = setTimeout(async () => {
      if (isMounted.current) {
        const stuckMs = Date.now() - SPLASH_START;
        diagWarn("SplashScreen", `STUCK — ${stuckMs}ms pe bhi tabs nahi khule`);
        await sendSplashStuckAlert(stuckMs).catch(() => {});
      }
    }, 10000);

    return () => {
      isMounted.current = false; // unmount = navigation succeeded
      clearTimeout(timer);
      clearTimeout(stuckTimer);
    };
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
      {/* Ambient depth — soft drifting neon orbs behind everything */}
      <GlowOrb color="#00B4FF" size={240} style={{ top: -70, left: -70 }} duration={5200} />
      <GlowOrb color="#7B2FFF" size={190} style={{ bottom: -50, right: -60 }} duration={6400} driftX={26} driftY={16} />
      <GlowOrb color="#00FFD1" size={150} style={{ top: "35%", right: -35 }} duration={4600} driftX={14} driftY={30} />

      <View style={styles.center}>
        {/* Logo — real app icon, flips in with 3D depth then hovers */}
        <ReAnimated.View style={[styles.logoRing, logoStyle]}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logoImage}
            resizeMode="cover"
          />
          {/* Shimmer sweep — diagonal light streak, like a reflection on a 3D surface */}
          <ReAnimated.View style={[styles.shimmerStreak, shimmerStyle]} pointerEvents="none" />
        </ReAnimated.View>

        {/* App name — cascading letter-by-letter reveal */}
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

        {/* Welcome — glowing pulse entrance */}
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
