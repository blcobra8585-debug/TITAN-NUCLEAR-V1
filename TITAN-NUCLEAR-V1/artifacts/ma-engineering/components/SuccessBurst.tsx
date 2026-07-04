import React, { useEffect, useImperativeHandle, forwardRef, useState } from "react";
import { StyleSheet, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const COLORS = ["#00B4FF", "#00FFD1", "#7B2FFF", "#FFD700", "#25D366", "#FF4D8D"];
const PARTICLE_COUNT = 26;

export interface SuccessBurstHandle {
  fire: () => void;
}

interface ParticleProps {
  active: number;
  index: number;
}

function Particle({ active, index }: ParticleProps) {
  const progress = useSharedValue(0);
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
  const distance = 90 + Math.random() * 140;
  const color = COLORS[index % COLORS.length];
  const size = 6 + Math.random() * 6;
  const spinDir = Math.random() > 0.5 ? 1 : -1;

  useEffect(() => {
    if (active > 0) {
      progress.value = 0;
      progress.value = withDelay(
        Math.random() * 80,
        withTiming(1, { duration: 900 + Math.random() * 400, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [active]);

  const style = useAnimatedStyle(() => {
    const tx = Math.cos(angle) * distance * progress.value;
    const ty = Math.sin(angle) * distance * progress.value - progress.value * progress.value * 60;
    const opacity = 1 - progress.value;
    const rotate = progress.value * 360 * spinDir;
    const scale = 1 - progress.value * 0.4;
    return {
      opacity,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { width: size, height: size * 1.6, backgroundColor: color, borderRadius: 2 },
        style,
      ]}
    />
  );
}

/**
 * Fullscreen confetti burst + haptic feedback, fired imperatively via ref
 * from success moments (quote saved, WhatsApp sent). Purely Reanimated —
 * no extra confetti library required.
 */
const SuccessBurst = forwardRef<SuccessBurstHandle>((_props, ref) => {
  const [burstId, setBurstId] = useState(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const containerOpacity = useSharedValue(0);

  function fire() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBurstId((id) => id + 1);

    containerOpacity.value = 1;
    ringScale.value = 0;
    ringOpacity.value = 1;
    checkScale.value = 0;

    ringScale.value = withTiming(2.2, { duration: 700, easing: Easing.out(Easing.quad) });
    ringOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
    checkScale.value = withSequence(
      withTiming(1.3, { duration: 260, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 160 })
    );

    containerOpacity.value = withDelay(
      1200,
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          // reset for next fire
        }
      })
    );
  }

  useImperativeHandle(ref, () => ({ fire }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, containerStyle]} pointerEvents="none">
      <Animated.View style={[styles.center]}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.checkCircle, checkStyle]} />
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle key={`${burstId}-${i}`} active={burstId} index={i} />
        ))}
      </Animated.View>
    </Animated.View>
  );
});

SuccessBurst.displayName = "SuccessBurst";
export default SuccessBurst;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "#00FFD1",
  },
  checkCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#25D366",
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  particle: {
    position: "absolute",
  },
});
