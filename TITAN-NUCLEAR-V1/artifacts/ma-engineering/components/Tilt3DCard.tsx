import React from "react";
import { ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Tilt3DCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  maxTilt?: number;
  glowColor?: string;
}

/**
 * Wraps content in a card that tilts in 3D (rotateX/rotateY with
 * perspective) as the user drags a finger across it, then springs back
 * flat on release — a pseudo-3D "hologram card" effect built purely
 * with Reanimated transforms (no three.js/expo-gl available in this app).
 */
export default function Tilt3DCard({ children, style, maxTilt = 10 }: Tilt3DCardProps) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const width = useSharedValue(1);
  const height = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.03, { damping: 14 });
    })
    .onUpdate((e) => {
      const px = e.x / width.value - 0.5;
      const py = e.y / height.value - 0.5;
      rotateY.value = px * maxTilt * 2;
      rotateX.value = -py * maxTilt * 2;
    })
    .onFinalize(() => {
      rotateX.value = withSpring(0, { damping: 12, stiffness: 120 });
      rotateY.value = withSpring(0, { damping: 12, stiffness: 120 });
      scale.value = withSpring(1, { damping: 14 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[style, animatedStyle]}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
          height.value = e.nativeEvent.layout.height;
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
